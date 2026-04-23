import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { sendImNotification } from '@/lib/im';

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: 帖子列表（管理后台，支持分页筛选）
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [published, draft, deleted, all] }
 *       - in: query
 *         name: is_public
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: 标题/作者模糊搜索
 *       - in: query
 *         name: created_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: created_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 分页帖子列表
 *   post:
 *     summary: 新建帖子
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               status: { type: string, enum: [published, draft], default: draft }
 *               is_public: { type: boolean, default: true }
 *               tags: { type: array, items: { type: string } }
 *               event_date: { type: string, format: date }
 *     responses:
 *       200:
 *         description: 创建成功
 */

// ─────────────────────────────────────────────
// GET /api/posts   帖子列表（管理后台用）
// ─────────────────────────────────────────────
// Query params:
//   page          默认 1
//   limit         默认 20，最大 100
//   status        published | draft | deleted | all（默认 all，不含 deleted）
//   is_public     true | false
//   q             标题 / 作者 模糊搜索
//   created_from  ISO date（含）
//   created_to    ISO date（含）
//   event_from    ISO date（含）
//   event_to      ISO date（含）
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20)));
  const offset = (page - 1) * limit;
  const statusFilter  = sp.get('status') ?? 'all';
  const isPublicFilter = sp.get('is_public');
  const q            = sp.get('q')?.trim() ?? '';
  const createdFrom  = sp.get('created_from') ?? '';
  const createdTo    = sp.get('created_to') ?? '';
  const eventFrom    = sp.get('event_from') ?? '';
  const eventTo      = sp.get('event_to') ?? '';

  const conditions: string[] = [];
  const values: unknown[] = [];

  function push(val: unknown) {
    values.push(val);
    return `$${values.length}`;
  }

  if (statusFilter === 'all') {
    conditions.push(`p.status != 'deleted'`);
  } else if (['published', 'draft', 'deleted'].includes(statusFilter)) {
    conditions.push(`p.status = ${push(statusFilter)}`);
  }

  if (isPublicFilter === 'true')  conditions.push('p.is_public = true');
  else if (isPublicFilter === 'false') conditions.push('p.is_public = false');

  if (q) {
    conditions.push(`(p.title ILIKE ${push(`%${q}%`)} OR u.nickname ILIKE ${push(`%${q}%`)} OR u.username ILIKE ${push(`%${q}%`)})`);
  }

  if (createdFrom) conditions.push(`p.created_at >= ${push(createdFrom)}::date`);
  if (createdTo)   conditions.push(`p.created_at <  (${push(createdTo)}::date + INTERVAL '1 day')`);
  if (eventFrom)   conditions.push(`p.event_date >= ${push(eventFrom)}::date`);
  if (eventTo)     conditions.push(`p.event_date <= ${push(eventTo)}::date`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_admin_posts', {
      p_status:       statusFilter,
      p_is_public:    isPublicFilter ?? null,
      p_q:            q,
      p_created_from: createdFrom || null,
      p_created_to:   createdTo || null,
      p_event_from:   eventFrom || null,
      p_event_to:     eventTo || null,
      p_limit:        limit,
      p_offset:       offset,
    });
    if (error) {
      console.error('[GET /api/posts supabase]', error);
      return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
    }
    const rows = data ?? [];
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    return successResponse({
      list: rows.map((r: Record<string, unknown>) => { const { total_count: _, ...rest } = r; return rest; }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  const client = await pool.connect();
  try {
    const countResult = await client.query(
      `SELECT COUNT(*) AS total FROM posts p JOIN users u ON u.id = p.user_id ${where}`,
      values
    );
    const total = Number(countResult.rows[0].total);

    const limitP = push(limit);
    const offsetP = push(offset);
    const rows = await client.query(
      `SELECT
         p.id, p.title, p.content, p.tags, p.is_public, p.status,
         p.like_count, p.comment_count, p.created_at, p.updated_at, p.event_date,
         u.username AS author_username, u.nickname AS author_nickname,
         (SELECT COUNT(*) FROM post_images pi WHERE pi.post_id = p.id) AS image_count,
         (SELECT url FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.sort_order LIMIT 1) AS cover_url
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      values
    );

    return successResponse({
      list: rows.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/posts]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}


// ─────────────────────────────────────────────
// Body:
// {
//   title?: string,
//   content: string,
//   tags?: string[],
//   is_public?: boolean,
//   status?: 'published' | 'draft',
//   images?: {
//     url: string,
//     storage_key: string,
//     original_name: string,
//     mime_type?: string,
//     file_size?: number,
//     width?: number,
//     height?: number,
//   }[]   最多 10 张，按数组顺序写入 sort_order
// }
// ─────────────────────────────────────────────

interface ImageInput {
  url: string;
  storage_key: string;
  original_name: string;
  mime_type?: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
}

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  let body: {
    title?: string;
    content?: string;
    tags?: string[];
    is_public?: boolean;
    status?: string;
    event_date?: string;
    images?: ImageInput[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const content = body.content?.trim() ?? '';
  if (!content) {
    return errorResponse(ResultCode.BAD_REQUEST, '内容不能为空');
  }

  const title = (body.title ?? '').trim();
  if (title.length > 200) {
    return errorResponse(ResultCode.BAD_REQUEST, '标题不能超过 200 字');
  }
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];
  const is_public = body.is_public !== false;
  const status = body.status === 'draft' ? 'draft' : 'published';
  const event_date = body.event_date ? body.event_date : null;
  const images: ImageInput[] = Array.isArray(body.images) ? body.images : [];

  if (images.length > 10) {
    return errorResponse(ResultCode.BAD_REQUEST, '图片最多 10 张');
  }
  for (const img of images) {
    if (!img.url || !img.storage_key) {
      return errorResponse(ResultCode.BAD_REQUEST, '图片缺少 url 或 storage_key');
    }
  }

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    try {
      const { data: postId, error } = await supabase.rpc('create_post_with_images', {
        p_user_id:    authUser.userId,
        p_title:      title,
        p_content:    content,
        p_tags:       tags,
        p_is_public:  is_public,
        p_status:     status,
        p_event_date: event_date ?? null,
        p_images:     images,
      });
      if (error) throw error;
      void sendImNotification('post', { userId: authUser.userId, postId, postTitle: title || String(postId) });
      return successResponse({ id: postId }, '帖子创建成功', String(postId));
    } catch (err) {
      console.error('[POST /api/posts supabase]', err);
      return errorResponse(ResultCode.DB_ERROR, '数据库写入失败');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 写 posts
    const postResult = await client.query<{ id: string }>(
      `INSERT INTO posts (user_id, title, content, tags, is_public, status, event_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [authUser.userId, title, content, tags, is_public, status, event_date]
    );
    const postId = postResult.rows[0].id;

    // 2. 写 post_images
    if (images.length > 0) {
      const values: unknown[] = [];
      const placeholders = images.map((img, i) => {
        const base = i * 9;
        values.push(
          postId,
          img.url,
          img.storage_key,
          img.original_name ?? '',
          img.mime_type ?? 'image/jpeg',
          img.file_size ?? 0,
          img.width ?? null,
          img.height ?? null,
          i // sort_order
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
      });
      await client.query(
        `INSERT INTO post_images
           (post_id, url, storage_key, original_name, mime_type, file_size, width, height, sort_order)
         VALUES ${placeholders.join(',')}`,
        values
      );
    }

    await client.query('COMMIT');

    void sendImNotification('post', { userId: authUser.userId, postId, postTitle: title || String(postId) });
    return successResponse({ id: postId }, '帖子创建成功', String(postId));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/posts]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库写入失败');
  } finally {
    client.release();
  }
}

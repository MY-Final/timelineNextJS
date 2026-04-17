import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

type Params = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// GET /api/posts/[id]   帖子详情
// ─────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '无效的帖子 ID');
  }

  const client = await pool.connect();
  try {
    const postResult = await client.query(
      `SELECT
         p.id, p.title, p.content, p.tags, p.is_public, p.status,
         p.like_count, p.comment_count, p.created_at, p.updated_at,
         p.event_date,
         u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1 AND p.status != 'deleted'`,
      [postId]
    );
    if (postResult.rowCount === 0) {
      return errorResponse(ResultCode.NOT_FOUND, '帖子不存在');
    }

    const imagesResult = await client.query(
      `SELECT id, url, original_name, mime_type, file_size, width, height, sort_order
       FROM post_images
       WHERE post_id = $1
       ORDER BY sort_order`,
      [postId]
    );

    return successResponse({
      ...postResult.rows[0],
      images: imagesResult.rows,
    });
  } catch (err) {
    console.error('[GET /api/posts/[id]]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// PATCH /api/posts/[id]   更新帖子
// ─────────────────────────────────────────────
// 可更新字段：title, content, tags, is_public, status
// 可同时传入 images 数组完整替换图片列表（先删后增，事务保证）
// Body 中未出现的字段不做修改。
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

export async function PATCH(request: NextRequest, { params }: Params) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '无效的帖子 ID');
  }

  let body: {
    title?: string;
    content?: string;
    tags?: string[];
    is_public?: boolean;
    status?: string;
    event_date?: string | null;
    images?: ImageInput[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  // 图片替换校验
  const replaceImages = 'images' in body;
  const images: ImageInput[] = replaceImages
    ? Array.isArray(body.images) ? body.images : []
    : [];

  if (replaceImages && images.length > 10) {
    return errorResponse(ResultCode.BAD_REQUEST, '图片最多 10 张');
  }
  if (replaceImages) {
    for (const img of images) {
      if (!img.url || !img.storage_key) {
        return errorResponse(ResultCode.BAD_REQUEST, '图片缺少 url 或 storage_key');
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 确认帖子存在且未删除
    const existing = await client.query(
      `SELECT id FROM posts WHERE id = $1 AND status != 'deleted'`,
      [postId]
    );
    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');
      return errorResponse(ResultCode.NOT_FOUND, '帖子不存在');
    }

    // 动态构建 UPDATE 语句，只更新传入的字段
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];

    function addField(col: string, val: unknown) {
      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
    }

    if ('title' in body) addField('title', (body.title ?? '').trim());
    if ('content' in body) {
      const c = (body.content ?? '').trim();
      if (!c) {
        await client.query('ROLLBACK');
        return errorResponse(ResultCode.BAD_REQUEST, '内容不能为空');
      }
      addField('content', c);
    }
    if ('tags' in body) addField('tags', Array.isArray(body.tags) ? body.tags.filter(Boolean) : []);
    if ('is_public' in body) addField('is_public', body.is_public !== false);
    if ('status' in body) {
      const s = body.status;
      if (s !== 'published' && s !== 'draft') {
        await client.query('ROLLBACK');
        return errorResponse(ResultCode.BAD_REQUEST, 'status 只能为 published 或 draft');
      }
      addField('status', s);
    }
    if ('event_date' in body) addField('event_date', body.event_date || null);

    if (setClauses.length > 1) {
      values.push(postId);
      await client.query(
        `UPDATE posts SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }

    // 替换图片
    if (replaceImages) {
      await client.query(`DELETE FROM post_images WHERE post_id = $1`, [postId]);
      if (images.length > 0) {
        const imgValues: unknown[] = [];
        const placeholders = images.map((img, i) => {
          const base = i * 9;
          imgValues.push(
            postId,
            img.url,
            img.storage_key,
            img.original_name ?? '',
            img.mime_type ?? 'image/jpeg',
            img.file_size ?? 0,
            img.width ?? null,
            img.height ?? null,
            i
          );
          return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
        });
        await client.query(
          `INSERT INTO post_images
             (post_id, url, storage_key, original_name, mime_type, file_size, width, height, sort_order)
           VALUES ${placeholders.join(',')}`,
          imgValues
        );
      }
    }

    await client.query('COMMIT');
    return successResponse({ id: postId }, '帖子更新成功');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PATCH /api/posts/[id]]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// DELETE /api/posts/[id]   软删除帖子
// ─────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '无效的帖子 ID');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE posts SET status = 'deleted', updated_at = NOW()
       WHERE id = $1 AND status != 'deleted'
       RETURNING id`,
      [postId]
    );
    if (result.rowCount === 0) {
      return errorResponse(ResultCode.NOT_FOUND, '帖子不存在或已删除');
    }
    return successResponse({ id: postId }, '帖子已删除');
  } catch (err) {
    console.error('[DELETE /api/posts/[id]]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
  } finally {
    client.release();
  }
}

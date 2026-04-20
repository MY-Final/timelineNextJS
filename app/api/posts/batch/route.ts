import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/posts/batch:
 *   post:
 *     summary: 批量操作帖子（publish/unpublish/hide/show/delete）
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, ids]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [publish, unpublish, hide, show, delete]
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *                 maxItems: 200
 *     responses:
 *       200:
 *         description: 操作成功
 */

// ─────────────────────────────────────────────
// POST /api/posts/batch   批量操作帖子
// ─────────────────────────────────────────────
// Body:
//   action   "publish" | "unpublish" | "hide" | "show" | "delete"
//   ids      number[]  要操作的帖子 ID 列表（最多 200 条）
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  let body: { action?: string; ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { action, ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return errorResponse(ResultCode.BAD_REQUEST, 'ids 不能为空');
  }
  if (ids.length > 200) {
    return errorResponse(ResultCode.BAD_REQUEST, '单次最多操作 200 条');
  }
  const validIds = ids.filter((id) => Number.isInteger(id) && (id as number) > 0) as number[];
  if (validIds.length === 0) {
    return errorResponse(ResultCode.BAD_REQUEST, 'ids 格式无效');
  }

  const placeholders = validIds.map((_, i) => `$${i + 1}`).join(',');

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    try {
      switch (action) {
        case 'publish':
          await supabase.from('posts').update({ status: 'published', updated_at: now }).in('id', validIds).neq('status', 'deleted');
          break;
        case 'unpublish':
          await supabase.from('posts').update({ status: 'draft', updated_at: now }).in('id', validIds).neq('status', 'deleted');
          break;
        case 'hide':
          await supabase.from('posts').update({ is_public: false, updated_at: now }).in('id', validIds).neq('status', 'deleted');
          break;
        case 'show':
          await supabase.from('posts').update({ is_public: true, updated_at: now }).in('id', validIds).neq('status', 'deleted');
          break;
        case 'delete':
          await supabase.from('posts').update({ status: 'deleted', updated_at: now }).in('id', validIds);
          break;
        default:
          return errorResponse(ResultCode.BAD_REQUEST, `不支持的操作: ${action}`);
      }
      return successResponse({ affected: validIds.length }, `批量操作成功，影响 ${validIds.length} 条记录`);
    } catch (err) {
      console.error('[POST /api/posts/batch supabase]', err);
      return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
    }
  }

  const client = await pool.connect();
  try {
    let affectedRows = 0;

    switch (action) {
      case 'publish':
        await client.query(
          `UPDATE posts SET status = 'published', updated_at = NOW() WHERE id IN (${placeholders}) AND status != 'deleted'`,
          validIds
        );
        affectedRows = validIds.length;
        break;

      case 'unpublish':
        await client.query(
          `UPDATE posts SET status = 'draft', updated_at = NOW() WHERE id IN (${placeholders}) AND status != 'deleted'`,
          validIds
        );
        affectedRows = validIds.length;
        break;

      case 'hide':
        await client.query(
          `UPDATE posts SET is_public = false, updated_at = NOW() WHERE id IN (${placeholders}) AND status != 'deleted'`,
          validIds
        );
        affectedRows = validIds.length;
        break;

      case 'show':
        await client.query(
          `UPDATE posts SET is_public = true, updated_at = NOW() WHERE id IN (${placeholders}) AND status != 'deleted'`,
          validIds
        );
        affectedRows = validIds.length;
        break;

      case 'delete':
        await client.query(
          `UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE id IN (${placeholders})`,
          validIds
        );
        affectedRows = validIds.length;
        break;

      default:
        return errorResponse(ResultCode.BAD_REQUEST, `不支持的操作: ${action}`);
    }

    return successResponse({ affected: affectedRows }, `批量操作成功，影响 ${affectedRows} 条记录`);
  } catch (err) {
    console.error('[POST /api/posts/batch]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
  } finally {
    client.release();
  }
}

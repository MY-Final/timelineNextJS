import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

type Params = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// PATCH /api/posts/[id]/visibility   切换公开/隐藏
// ─────────────────────────────────────────────
// Body: { is_public: boolean }
// ─────────────────────────────────────────────
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

  let body: { is_public?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  if (typeof body.is_public !== 'boolean') {
    return errorResponse(ResultCode.BAD_REQUEST, 'is_public 必须为 boolean');
  }

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('posts')
      .update({ is_public: body.is_public, updated_at: new Date().toISOString() })
      .eq('id', postId).neq('status', 'deleted').select('id,is_public');
    if (error) return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
    if (!data || data.length === 0) return errorResponse(ResultCode.NOT_FOUND, '帖子不存在');
    const { is_public } = data[0];
    return successResponse({ id: postId, is_public }, is_public ? '帖子已设为公开' : '帖子已隐藏');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE posts SET is_public = $1, updated_at = NOW()
       WHERE id = $2 AND status != 'deleted'
       RETURNING id, is_public`,
      [body.is_public, postId]
    );
    if (result.rowCount === 0) {
      return errorResponse(ResultCode.NOT_FOUND, '帖子不存在');
    }
    const { is_public } = result.rows[0];
    return successResponse(
      { id: postId, is_public },
      is_public ? '帖子已设为公开' : '帖子已隐藏'
    );
  } catch (err) {
    console.error('[PATCH /api/posts/[id]/visibility]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库操作失败');
  } finally {
    client.release();
  }
}

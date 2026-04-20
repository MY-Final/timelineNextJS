import { NextRequest, NextResponse } from "next/server";
import pool, { DB_TYPE } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth";
import { ResultCode, successResponse, errorResponse } from "@/lib/result";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: 删除评论（本人或管理员）
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 删除成功
 */

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const commentId = parseInt(id);

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('comments').select('user_id')
      .eq('id', commentId).neq('status', 'deleted').maybeSingle();
    if (error) return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
    if (!data) return errorResponse(ResultCode.NOT_FOUND, "评论不存在");

    const isOwner = data.user_id === auth.userId;
    const isAdmin = auth.role === "admin" || auth.role === "superadmin";
    if (!isOwner && !isAdmin) return errorResponse(ResultCode.FORBIDDEN, "无权删除此评论");

    await supabase.from('comments').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', commentId);
    return successResponse(null, "删除成功");
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT user_id FROM comments WHERE id=$1 AND status!='deleted'`,
      [commentId]
    );
    if (rows.length === 0) return errorResponse(ResultCode.NOT_FOUND, "评论不存在");

    const isOwner = rows[0].user_id === auth.userId;
    const isAdmin = auth.role === "admin" || auth.role === "superadmin";
    if (!isOwner && !isAdmin) return errorResponse(ResultCode.FORBIDDEN, "无权删除此评论");

    await client.query(
      `UPDATE comments SET status='deleted', updated_at=NOW() WHERE id=$1`,
      [commentId]
    );
    return successResponse(null, "删除成功");
  } finally {
    client.release();
  }
}

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ResultCode, successResponse, errorResponse } from "@/lib/result";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/admin/comments/[id]  — 管理员硬删除评论
 * PATCH  /api/admin/comments/[id]  — 管理员切换评论可见性 (visible ↔ hidden)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "admin" && auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权限");

  const { id } = await params;
  const commentId = parseInt(id);

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `DELETE FROM comments WHERE id = $1`,
      [commentId]
    );
    if (!rowCount) return errorResponse(ResultCode.NOT_FOUND, "评论不存在");
    return successResponse(null, "删除成功");
  } catch (e) {
    console.error("[DELETE /api/admin/comments/[id]]", e);
    return errorResponse(ResultCode.DB_ERROR, "删除失败");
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "admin" && auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权限");

  const { id } = await params;
  const commentId = parseInt(id);

  let body: { status?: string };
  try { body = await request.json(); } catch { body = {}; }

  const newStatus = body.status;
  if (!newStatus || !["visible", "hidden"].includes(newStatus)) {
    return errorResponse(ResultCode.BAD_REQUEST, "status 只能为 visible 或 hidden");
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE comments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [newStatus, commentId]
    );
    if (!rows.length) return errorResponse(ResultCode.NOT_FOUND, "评论不存在");
    return successResponse(rows[0], "更新成功");
  } catch (e) {
    console.error("[PATCH /api/admin/comments/[id]]", e);
    return errorResponse(ResultCode.DB_ERROR, "更新失败");
  } finally {
    client.release();
  }
}

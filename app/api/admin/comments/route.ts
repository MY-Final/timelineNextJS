import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ResultCode, successResponse, errorResponse } from "@/lib/result";

/**
 * GET /api/admin/comments
 * 管理员：分页获取评论列表（支持按帖子、状态、关键字筛选）
 */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "admin" && auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权限");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;
  const keyword = searchParams.get("keyword") ?? "";
  const status = searchParams.get("status") ?? ""; // visible | hidden | deleted | '' (all)
  const postId = searchParams.get("post_id") ? parseInt(searchParams.get("post_id")!) : null;

  const client = await pool.connect();
  try {
    const conditions: string[] = ["c.status != 'deleted'"];
    const params: (string | number)[] = [];
    let i = 1;

    if (status) {
      conditions.push(`c.status = $${i++}`);
      params.push(status);
    }
    if (postId) {
      conditions.push(`c.post_id = $${i++}`);
      params.push(postId);
    }
    if (keyword) {
      conditions.push(`(c.content ILIKE $${i} OR u.username ILIKE $${i} OR u.nickname ILIKE $${i})`);
      params.push(`%${keyword}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await client.query(
      `SELECT COUNT(*) FROM comments c JOIN users u ON u.id = c.user_id ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const listRes = await client.query(
      `SELECT
         c.id, c.post_id, c.parent_id, c.content, c.like_count,
         c.status, c.created_at,
         u.id AS user_id, u.username, u.nickname,
         p.title AS post_title
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN posts p ON p.id = c.post_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    return successResponse({
      list: listRes.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("[GET /api/admin/comments]", e);
    return errorResponse(ResultCode.DB_ERROR, "查询失败");
  } finally {
    client.release();
  }
}

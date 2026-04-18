import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ResultCode, successResponse, errorResponse } from "@/lib/result";

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: 获取帖子评论列表（公开接口，支持分页）
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: post_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 评论列表（含子评论）
 *   post:
 *     summary: 发表评论（需登录）
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [post_id, content]
 *             properties:
 *               post_id: { type: integer }
 *               content: { type: string, maxLength: 2000 }
 *               parent_id: { type: integer, nullable: true }
 *     responses:
 *       200:
 *         description: 评论成功，返回新评论
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = parseInt(searchParams.get("post_id") ?? "0");
  if (!postId) return errorResponse(ResultCode.BAD_REQUEST, "缺少 post_id");

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  // 获取当前用户（用于返回 is_liked 字段）
  const auth = getAuthUser(request);
  const currentUserId = auth instanceof NextResponse ? null : auth.userId;

  const client = await pool.connect();
  try {
    const [{ rows: comments }, { rows: countRows }] = await Promise.all([
      client.query(
        `SELECT
          c.id, c.post_id, c.parent_id, c.content, c.like_count, c.created_at,
          u.id AS user_id, u.username, u.nickname, u.avatar,
          ru.username AS reply_to_username, ru.nickname AS reply_to_nickname,
          ${currentUserId
            ? `EXISTS(SELECT 1 FROM likes WHERE user_id=$3 AND target_type='comment' AND target_id=c.id) AS is_liked`
            : "FALSE AS is_liked"
          }
        FROM comments c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN users ru ON ru.id = c.reply_to_user_id
        WHERE c.post_id = $1 AND c.status = 'visible'
        ORDER BY c.parent_id NULLS FIRST, c.created_at ASC
        LIMIT $2 OFFSET ${currentUserId ? "$4" : "$3"}`,
        currentUserId ? [postId, limit, currentUserId, offset] : [postId, limit, offset]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM comments WHERE post_id=$1 AND status='visible'`,
        [postId]
      ),
    ]);

    const total = countRows[0].total;
    return successResponse({
      list: comments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;

  let body: { post_id?: number; content?: string; parent_id?: number | null; reply_to_user_id?: number | null };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, "请求体格式错误");
  }

  const { post_id, content, parent_id = null, reply_to_user_id = null } = body;
  if (!post_id || !content?.trim()) {
    return errorResponse(ResultCode.BAD_REQUEST, "帖子ID和内容为必填");
  }
  if (content.trim().length > 2000) {
    return errorResponse(ResultCode.BAD_REQUEST, "评论内容不能超过2000字");
  }

  const client = await pool.connect();
  try {
    // 验证帖子存在且公开
    const { rows: postRows } = await client.query(
      `SELECT id FROM posts WHERE id=$1 AND status='published' AND is_public=TRUE`,
      [post_id]
    );
    if (postRows.length === 0) return errorResponse(ResultCode.NOT_FOUND, "帖子不存在");

    // 如果是回复，验证父评论存在，并将 parent_id 收敛到根评论（两层结构）
    let actualParentId = parent_id;
    if (parent_id) {
      const { rows: parentRows } = await client.query(
        `SELECT id, parent_id FROM comments WHERE id=$1 AND post_id=$2 AND status='visible'`,
        [parent_id, post_id]
      );
      if (parentRows.length === 0) return errorResponse(ResultCode.NOT_FOUND, "父评论不存在");
      // 若父评论本身是回复（有 parent_id），则收敛到其根
      if (parentRows[0].parent_id) {
        actualParentId = parentRows[0].parent_id;
      }
    }

    const { rows } = await client.query(
      `INSERT INTO comments (post_id, user_id, parent_id, reply_to_user_id, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, post_id, parent_id, reply_to_user_id, content, like_count, created_at`,
      [post_id, auth.userId, actualParentId, reply_to_user_id, content.trim()]
    );

    const comment = rows[0];
    // 附上用户信息
    const { rows: userRows } = await client.query(
      `SELECT id AS user_id, username, nickname, avatar FROM users WHERE id=$1`,
      [auth.userId]
    );
    let replyToUsername = null, replyToNickname = null;
    if (reply_to_user_id) {
      const { rows: rtuRows } = await client.query(
        `SELECT username, nickname FROM users WHERE id=$1`, [reply_to_user_id]
      );
      if (rtuRows.length) { replyToUsername = rtuRows[0].username; replyToNickname = rtuRows[0].nickname; }
    }
    return successResponse({ ...rows[0], ...userRows[0], is_liked: false, reply_to_username: replyToUsername, reply_to_nickname: replyToNickname }, "评论成功");
  } catch (e) {
    console.error("[POST /api/comments]", e);
    return errorResponse(ResultCode.DB_ERROR, "评论发送失败，请确认数据库表已初始化");
  } finally {
    client.release();
  }
}

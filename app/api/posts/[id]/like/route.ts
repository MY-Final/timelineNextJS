import { NextRequest, NextResponse } from "next/server";
import pool, { DB_TYPE } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth";
import { ResultCode, successResponse, errorResponse } from "@/lib/result";
import { sendImNotification } from "@/lib/im";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: 点赞 / 取消点赞帖子（需登录，幂等）
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 返回 liked(bool) 和最新 like_count
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const postId = parseInt(id);

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('toggle_like', {
      p_user_id:     auth.userId,
      p_target_type: 'post',
      p_target_id:   postId,
    });
    if (error) {
      console.error('[POST /api/posts/[id]/like supabase]', error);
      return errorResponse(ResultCode.DB_ERROR, '操作失败');
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.liked) {
      void sendImNotification('like', { userId: auth.userId, postId });
    }
    return successResponse({ liked: row?.liked, like_count: row?.like_count ?? 0 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: existing } = await client.query(
      `SELECT id FROM likes WHERE user_id=$1 AND target_type='post' AND target_id=$2`,
      [auth.userId, postId]
    );
    let liked: boolean;
    if (existing.length > 0) {
      await client.query(
        `DELETE FROM likes WHERE user_id=$1 AND target_type='post' AND target_id=$2`,
        [auth.userId, postId]
      );
      liked = false;
    } else {
      await client.query(
        `INSERT INTO likes (user_id, target_type, target_id) VALUES ($1, 'post', $2)`,
        [auth.userId, postId]
      );
      liked = true;
    }
    await client.query("COMMIT");

    const { rows } = await client.query(`SELECT like_count FROM posts WHERE id=$1`, [postId]);
    if (liked) {
      void sendImNotification('like', { userId: auth.userId, postId });
    }
    return successResponse({ liked, like_count: rows[0]?.like_count ?? 0 });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[POST /api/posts/[id]/like]", e);
    return errorResponse(ResultCode.DB_ERROR, "操作失败，请确认数据库表已初始化");
  } finally {
    client.release();
  }
}

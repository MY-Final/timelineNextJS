import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: 获取后台统计数据（帖子数、今日新增、评论数、点赞数）
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPosts: { type: integer }
 *                     todayPosts: { type: integer }
 *                     totalComments: { type: integer }
 *                     totalLikes: { type: integer }
 */

// ─────────────────────────────────────────────
// GET /api/stats   管理后台统计数据
// ─────────────────────────────────────────────
// 返回：帖子总数、今日新增、评论总数、点赞总数
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: postTotal },
        { count: postToday },
        { count: commentTotal },
        { data: likeData },
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).neq('status', 'deleted').gte('created_at', today.toISOString()),
        supabase.from('comments').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
        supabase.from('posts').select('like_count').neq('status', 'deleted'),
      ]);

      const likeTotal = (likeData ?? []).reduce((sum: number, r: { like_count: number }) => sum + (r.like_count || 0), 0);

      return successResponse({
        post_total:    postTotal ?? 0,
        post_today:    postToday ?? 0,
        comment_total: commentTotal ?? 0,
        like_total:    likeTotal,
      });
    } catch (err) {
      console.error('[GET /api/stats supabase]', err);
      return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
    }
  }

  const client = await pool.connect();
  try {
    const [postsResult, todayResult, commentsResult, likesResult] = await Promise.all([
      client.query(`SELECT COUNT(*) AS total FROM posts WHERE status != 'deleted'`),
      client.query(`SELECT COUNT(*) AS total FROM posts WHERE status != 'deleted' AND created_at >= CURRENT_DATE`),
      client.query(`SELECT COUNT(*) AS total FROM comments WHERE status != 'deleted'`),
      client.query(`SELECT COALESCE(SUM(like_count), 0) AS total FROM posts WHERE status != 'deleted'`),
    ]);

    return successResponse({
      post_total:   Number(postsResult.rows[0].total),
      post_today:   Number(todayResult.rows[0].total),
      comment_total: Number(commentsResult.rows[0].total),
      like_total:   Number(likesResult.rows[0].total),
    });
  } catch (err) {
    console.error('[GET /api/stats]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}

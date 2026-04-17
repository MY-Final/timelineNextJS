import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

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

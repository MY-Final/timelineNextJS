import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/timeline:
 *   get:
 *     summary: 获取时光轴数据（公开接口，返回已发布+公开帖子，附带图片）
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: 时光轴帖子列表（按 event_date 排序）
 */

// ─────────────────────────────────────────────
// GET /api/timeline
// 返回所有 published + public 帖子，按 event_date（或 created_at）排序
// 每个帖子附带 images 数组
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  const currentUserId = auth instanceof NextResponse ? null : auth.userId;

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_timeline', {
      p_user_id: currentUserId ?? null,
    });
    if (error) {
      console.error('[GET /api/timeline supabase]', error);
      return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
    }
    return successResponse(data ?? []);
  }

  const client = await pool.connect();
  try {
    const rows = await client.query(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.tags,
        p.event_date,
        p.created_at,
        p.like_count,
        p.comment_count,
        CASE WHEN ul.id IS NOT NULL THEN true ELSE false END AS is_liked,
        COALESCE(
          json_agg(
            json_build_object(
              'url',           pi.url,
              'storage_key',   pi.storage_key,
              'original_name', pi.original_name,
              'mime_type',     pi.mime_type,
              'sort_order',    pi.sort_order
            ) ORDER BY pi.sort_order
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM posts p
      LEFT JOIN post_images pi ON pi.post_id = p.id
      LEFT JOIN likes ul ON ul.target_type = 'post' AND ul.target_id = p.id AND ul.user_id = $1
      WHERE p.status = 'published'
        AND p.is_public = true
      GROUP BY p.id, ul.id
      ORDER BY COALESCE(p.event_date, p.created_at::date) DESC
    `, [currentUserId]);

    return successResponse(rows.rows);
  } catch (err) {
    console.error('[GET /api/timeline]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}

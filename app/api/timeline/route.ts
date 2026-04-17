import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

// ─────────────────────────────────────────────
// GET /api/timeline
// 返回所有 published + public 帖子，按 event_date（或 created_at）排序
// 每个帖子附带 images 数组
// ─────────────────────────────────────────────

export async function GET() {
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
      WHERE p.status = 'published'
        AND p.is_public = true
      GROUP BY p.id
      ORDER BY COALESCE(p.event_date, p.created_at::date) DESC
    `);

    return successResponse(rows.rows);
  } catch (err) {
    console.error('[GET /api/timeline]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}

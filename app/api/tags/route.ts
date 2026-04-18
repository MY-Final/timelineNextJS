import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: 获取所有标签（公开接口，从已发布公开帖子聚合）
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: 标签列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 */

// ─────────────────────────────────────────────
// GET /api/tags
// 从所有 published+public 帖子中聚合所有 tag，去重后返回
// 无需鉴权（公开接口）
// ─────────────────────────────────────────────
export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT unnest(tags) AS tag
      FROM posts
      WHERE status = 'published' AND is_public = true
      ORDER BY tag
    `);
    const tags: string[] = result.rows.map((r) => r.tag).filter(Boolean);
    return successResponse(tags);
  } catch (err) {
    console.error('[GET /api/tags]', err);
    return errorResponse(ResultCode.DB_ERROR, '数据库查询失败');
  } finally {
    client.release();
  }
}

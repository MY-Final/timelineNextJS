import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/admin/users/batch:
 *   post:
 *     summary: 批量操作用户（enable/disable/delete）
 *     tags: [Admin/Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, ids]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enable, disable, delete]
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: 操作成功
 */

/** POST /api/admin/users/batch */
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin' && auth.role !== 'admin') {
    return errorResponse(ResultCode.FORBIDDEN, '无权限');
  }

  let body: { action?: string; ids?: number[] };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { action, ids } = body;
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '缺少 action 或 ids');
  }

  const allowedActions = ['enable', 'disable', 'delete'];
  if (!allowedActions.includes(action)) {
    return errorResponse(ResultCode.BAD_REQUEST, '非法 action');
  }

  const client = await pool.connect();
  try {
    // admin 只能操作 user 角色，且不能操作自己
    const safeIds = ids.filter((id) => id !== auth.userId);
    if (safeIds.length === 0) return errorResponse(ResultCode.BAD_REQUEST, '不能对自己执行此操作');

    // 过滤掉 admin 无权操作的用户
    let targetIds = safeIds;
    if (auth.role === 'admin') {
      const res = await client.query(
        `SELECT id FROM users WHERE id = ANY($1) AND role = 'user'`,
        [safeIds]
      );
      targetIds = res.rows.map((r) => r.id);
    }

    if (targetIds.length === 0) return errorResponse(ResultCode.FORBIDDEN, '没有可操作的用户');

    if (action === 'delete') {
      // superadmin 不能被批量删除
      await client.query(
        `DELETE FROM users WHERE id = ANY($1) AND role != 'superadmin'`,
        [targetIds]
      );
    } else {
      const val = action === 'enable';
      await client.query(
        `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = ANY($2) AND role != 'superadmin'`,
        [val, targetIds]
      );
    }

    return successResponse(null, '批量操作成功');
  } finally {
    client.release();
  }
}

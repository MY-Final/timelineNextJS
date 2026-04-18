import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/admin/email-accounts/batch:
 *   post:
 *     summary: 批量操作邮箱账号（仅超级管理员）
 *     tags: [Admin/EmailAccounts]
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

/** POST /api/admin/email-accounts/batch */
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可管理邮箱配置');

  let body: { action?: string; ids?: number[] };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { action, ids } = body;
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '缺少 action 或 ids');
  }

  const client = await pool.connect();
  try {
    if (action === 'delete') {
      await client.query('DELETE FROM email_accounts WHERE id = ANY($1)', [ids]);
    } else if (action === 'enable' || action === 'disable') {
      await client.query(
        `UPDATE email_accounts SET is_active = $1, updated_at = NOW() WHERE id = ANY($2)`,
        [action === 'enable', ids]
      );
    } else {
      return errorResponse(ResultCode.BAD_REQUEST, '非法 action');
    }
    return successResponse(null, '批量操作成功');
  } finally {
    client.release();
  }
}

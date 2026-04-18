import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/admin/email-accounts/{id}:
 *   patch:
 *     summary: 更新邮箱账号（仅超级管理员）
 *     tags: [Admin/EmailAccounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               host: { type: string }
 *               port: { type: integer }
 *               secure: { type: boolean }
 *               user_addr: { type: string }
 *               password: { type: string }
 *               from_name: { type: string }
 *               is_active: { type: boolean }
 *               use_for_reg: { type: boolean }
 *               use_for_pwd: { type: boolean }
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     summary: 删除邮箱账号（仅超级管理员）
 *     tags: [Admin/EmailAccounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 删除成功
 */

/** PATCH /api/admin/email-accounts/[id] */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可管理邮箱配置');

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const allowed = ['name', 'host', 'port', 'secure', 'user_addr', 'password', 'from_name', 'is_active', 'use_for_reg', 'use_for_pwd'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  let pi = 1;

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${pi}`);
      vals.push(body[key]);
      pi++;
    }
  }

  if (sets.length === 0) return errorResponse(ResultCode.BAD_REQUEST, '无可更新字段');
  sets.push(`updated_at = NOW()`);
  vals.push(id);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE email_accounts SET ${sets.join(', ')} WHERE id = $${pi}
       RETURNING id, name, host, port, secure, user_addr, from_name, is_active, use_for_reg, use_for_pwd, updated_at`,
      vals
    );
    if (!res.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '邮箱账号不存在');
    return successResponse(res.rows[0], '更新成功');
  } finally {
    client.release();
  }
}

/** DELETE /api/admin/email-accounts/[id] */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可管理邮箱配置');

  const { id } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query('DELETE FROM email_accounts WHERE id = $1 RETURNING id', [id]);
    if (!res.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '邮箱账号不存在');
    return successResponse(null, '删除成功');
  } finally {
    client.release();
  }
}

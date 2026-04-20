import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getOtp, delOtp } from '@/lib/redis';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 通过邮箱验证码重置密码（无需登录）
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email: { type: string }
 *               code: { type: string, description: 邮箱验证码 }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: 密码重置成功
 */

/** POST /api/auth/reset-password
 * body: { email, code, newPassword }
 * 无需登录，通过邮箱验证码重置密码
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string; newPassword?: string };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { email, code, newPassword } = body;
  if (!email || !code || !newPassword) {
    return errorResponse(ResultCode.BAD_REQUEST, '邮箱、验证码、新密码均为必填');
  }
  if (newPassword.length < 6) {
    return errorResponse(ResultCode.BAD_REQUEST, '新密码长度不能少于 6 位');
  }

  const storedCode = await getOtp(`pwd:${email}`);
  if (!storedCode) {
    return errorResponse(ResultCode.BAD_REQUEST, '验证码已过期，请重新获取');
  }
  if (storedCode.toUpperCase() !== code.toUpperCase()) {
    return errorResponse(ResultCode.BAD_REQUEST, '验证码错误');
  }

  const hash = await bcrypt.hash(newPassword, 12);

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('users')
      .update({ password: hash, updated_at: new Date().toISOString() })
      .eq('email', email).select('id');
    if (error) return errorResponse(ResultCode.DB_ERROR, '数据库错误');
    if (!data || data.length === 0) return errorResponse(ResultCode.NOT_FOUND, '未找到该邮箱对应账号');
    await delOtp(`pwd:${email}`);
    return successResponse(null, '密码重置成功，请重新登录');
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id`,
      [hash, email]
    );
    if (!res.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '未找到该邮箱对应账号');
    await delOtp(`pwd:${email}`);
    return successResponse(null, '密码重置成功，请重新登录');
  } finally {
    client.release();
  }
}

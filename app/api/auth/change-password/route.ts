import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

export async function PUT(request: NextRequest) {
  const user = getAuthUser(request);
  if (user instanceof NextResponse) return user;

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { oldPassword, newPassword } = body;
  if (!oldPassword || !newPassword) {
    return errorResponse(ResultCode.BAD_REQUEST, 'oldPassword 和 newPassword 不能为空');
  }
  if (newPassword.length < 6) {
    return errorResponse(ResultCode.BAD_REQUEST, '新密码长度不能少于 6 位');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT password FROM users WHERE id = $1',
      [user.userId]
    );
    const row = result.rows[0];
    if (!row) {
      return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    }

    const valid = await bcrypt.compare(oldPassword, row.password);
    if (!valid) {
      return errorResponse(ResultCode.UNAUTHORIZED, '原密码错误');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashed, user.userId]
    );

    return successResponse(null, '密码修改成功，请重新登录');
  } finally {
    client.release();
  }
}

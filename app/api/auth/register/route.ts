import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getOtp, delOtp } from '@/lib/redis';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/** POST /api/auth/register */
export async function POST(request: NextRequest) {
  let body: {
    username?: string; password?: string; nickname?: string;
    email?: string; code?: string;
  };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { username, password, nickname, email, code } = body;
  if (!username || !password || !email || !code) {
    return errorResponse(ResultCode.BAD_REQUEST, '账号、密码、邮箱、验证码均为必填');
  }
  if (password.length < 6) {
    return errorResponse(ResultCode.BAD_REQUEST, '密码长度不能少于 6 位');
  }

  // 验证邮箱验证码
  const storedCode = await getOtp(`reg:${email}`);
  if (!storedCode) {
    return errorResponse(ResultCode.BAD_REQUEST, '验证码已过期，请重新获取');
  }
  if (storedCode.toUpperCase() !== code.toUpperCase()) {
    return errorResponse(ResultCode.BAD_REQUEST, '验证码错误');
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO users (username, password, nickname, email, role)
       VALUES ($1, $2, $3, $4, 'user')`,
      [username, hash, nickname || username, email]
    );
    // 验证成功后删除验证码
    await delOtp(`reg:${email}`);
    return successResponse(null, '注册成功');
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') return errorResponse(ResultCode.BAD_REQUEST, '账号或邮箱已被注册');
    return errorResponse(ResultCode.DB_ERROR, '数据库错误');
  } finally {
    client.release();
  }
}

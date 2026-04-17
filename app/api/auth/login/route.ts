import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { TOKEN_COOKIE } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 登录成功，返回用户信息，Set-Cookie 设置 token
 */

/** Cookie 有效期与 JWT 保持一致（秒） */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7d

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { username, password } = body;
  if (!username || !password) {
    return errorResponse(ResultCode.BAD_REQUEST, '账号和密码不能为空');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password, nickname, role, is_active FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return errorResponse(ResultCode.UNAUTHORIZED, '账号或密码错误');
    }
    if (!user.is_active) {
      return errorResponse(ResultCode.FORBIDDEN, '账号已被禁用');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return errorResponse(ResultCode.UNAUTHORIZED, '账号或密码错误');
    }

    await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken({ userId: user.id, username: user.username, role: user.role });

    const response = successResponse(
      {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
        },
      },
      '登录成功'
    );

    // 写入 HttpOnly Cookie，JS 无法读取，防止 XSS
    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } finally {
    client.release();
  }
}

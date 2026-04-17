import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: '请求体格式错误' }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ success: false, message: '账号和密码不能为空' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password, nickname, role, is_active FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 });
    }
    if (!user.is_active) {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 });
    }

    // 更新最后登录时间
    await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken({ userId: user.id, username: user.username, role: user.role });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
        },
      },
    });
  } finally {
    client.release();
  }
}

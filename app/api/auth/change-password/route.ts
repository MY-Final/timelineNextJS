import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  const user = getAuthUser(request);
  if (user instanceof NextResponse) return user;

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: '请求体格式错误' }, { status: 400 });
  }

  const { oldPassword, newPassword } = body;
  if (!oldPassword || !newPassword) {
    return NextResponse.json(
      { success: false, message: 'oldPassword 和 newPassword 不能为空' },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { success: false, message: '新密码长度不能少于 6 位' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT password FROM users WHERE id = $1',
      [user.userId]
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    const valid = await bcrypt.compare(oldPassword, row.password);
    if (!valid) {
      return NextResponse.json({ success: false, message: '原密码错误' }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashed, user.userId]
    );

    return NextResponse.json({ success: true, message: '密码修改成功，请重新登录' });
  } finally {
    client.release();
  }
}

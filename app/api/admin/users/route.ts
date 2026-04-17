import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/** GET /api/admin/users — 用户列表（分页+筛选） */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin' && auth.role !== 'admin') {
    return errorResponse(ResultCode.FORBIDDEN, '无权限');
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;
  const q = searchParams.get('q')?.trim() ?? '';
  const role = searchParams.get('role') ?? '';
  const isActive = searchParams.get('is_active') ?? '';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  if (q) {
    conditions.push(`(username ILIKE $${pi} OR nickname ILIKE $${pi} OR email ILIKE $${pi})`);
    params.push(`%${q}%`);
    pi++;
  }
  if (role) {
    conditions.push(`role = $${pi}`);
    params.push(role);
    pi++;
  }
  if (isActive !== '') {
    conditions.push(`is_active = $${pi}`);
    params.push(isActive === 'true');
    pi++;
  }

  // admin 只能看 user 角色
  if (auth.role === 'admin') {
    conditions.push(`role = 'user'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const client = await pool.connect();
  try {
    const countRes = await client.query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const listRes = await client.query(
      `SELECT id, username, nickname, avatar, email, phone, bio, gender, role, is_active, last_login, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset]
    );

    return successResponse({
      list: listRes.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } finally {
    client.release();
  }
}

/** POST /api/admin/users — 创建用户 */
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin' && auth.role !== 'admin') {
    return errorResponse(ResultCode.FORBIDDEN, '无权限');
  }

  let body: {
    username?: string; password?: string; nickname?: string;
    email?: string; phone?: string; role?: string; bio?: string; gender?: number;
  };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { username, password, nickname, email, phone, role, bio, gender } = body;
  if (!username || !password) {
    return errorResponse(ResultCode.BAD_REQUEST, '账号和密码为必填');
  }
  if (password.length < 6) {
    return errorResponse(ResultCode.BAD_REQUEST, '密码长度不能少于 6 位');
  }

  // admin 只能创建 user 角色
  const targetRole = role ?? 'user';
  if (auth.role === 'admin' && targetRole !== 'user') {
    return errorResponse(ResultCode.FORBIDDEN, '管理员只能创建普通用户');
  }
  if (!['superadmin', 'admin', 'user'].includes(targetRole)) {
    return errorResponse(ResultCode.BAD_REQUEST, '非法角色值');
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users (username, password, nickname, email, phone, role, bio, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, nickname, email, phone, role, is_active, created_at`,
      [username, hash, nickname ?? username, email ?? null, phone ?? null, targetRole, bio ?? null, gender ?? 0]
    );
    return successResponse(res.rows[0], '创建成功');
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') return errorResponse(ResultCode.BAD_REQUEST, '账号或邮箱已存在');
    return errorResponse(ResultCode.DB_ERROR, '数据库错误');
  } finally {
    client.release();
  }
}

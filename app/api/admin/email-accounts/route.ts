import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

/**
 * @swagger
 * /api/admin/email-accounts:
 *   get:
 *     summary: 获取邮箱账号列表（仅超级管理员）
 *     tags: [Admin/EmailAccounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: 搜索名称/邮箱
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 分页列表
 *   post:
 *     summary: 新建邮箱账号（仅超级管理员）
 *     tags: [Admin/EmailAccounts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, host, port, user_addr, password]
 *             properties:
 *               name: { type: string }
 *               host: { type: string, example: smtp.qq.com }
 *               port: { type: integer, example: 465 }
 *               secure: { type: boolean, default: true }
 *               user_addr: { type: string }
 *               password: { type: string }
 *               from_name: { type: string }
 *               is_active: { type: boolean, default: true }
 *               use_for_reg: { type: boolean, default: false }
 *               use_for_pwd: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: 创建成功
 */

/** GET /api/admin/email-accounts */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可管理邮箱配置');

  const { searchParams } = new URL(request.url);
  const isActive = searchParams.get('is_active') ?? '';
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  if (q) {
    conditions.push(`(name ILIKE $${pi} OR user_addr ILIKE $${pi})`);
    params.push(`%${q}%`); pi++;
  }
  if (isActive !== '') {
    conditions.push(`is_active = $${pi}`);
    params.push(isActive === 'true'); pi++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const client = await pool.connect();
  try {
    const countRes = await client.query(`SELECT COUNT(*) FROM email_accounts ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const listRes = await client.query(
      // 不返回密码字段
      `SELECT id, name, host, port, secure, user_addr, from_name, is_active, use_for_reg, use_for_pwd, created_at, updated_at
       FROM email_accounts ${where} ORDER BY id DESC LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset]
    );
    return successResponse({ list: listRes.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } finally {
    client.release();
  }
}

/** POST /api/admin/email-accounts */
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可管理邮箱配置');

  let body: {
    name?: string; host?: string; port?: number; secure?: boolean;
    user_addr?: string; password?: string; from_name?: string;
    is_active?: boolean; use_for_reg?: boolean; use_for_pwd?: boolean;
  };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { name, host, port, secure, user_addr, password, from_name, is_active, use_for_reg, use_for_pwd } = body;
  if (!name || !host || !user_addr || !password) {
    return errorResponse(ResultCode.BAD_REQUEST, '名称、服务器、邮箱地址、密码为必填');
  }
  if (port !== undefined && (port < 1 || port > 65535)) {
    return errorResponse(ResultCode.BAD_REQUEST, '端口号必须在 1-65535 之间');
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO email_accounts (name, host, port, secure, user_addr, password, from_name, is_active, use_for_reg, use_for_pwd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, name, host, port, secure, user_addr, from_name, is_active, use_for_reg, use_for_pwd, created_at`,
      [name, host, port ?? 465, secure ?? true, user_addr, password, from_name ?? '', is_active ?? true, use_for_reg ?? false, use_for_pwd ?? false]
    );
    return successResponse(res.rows[0], '创建成功');
  } finally {
    client.release();
  }
}

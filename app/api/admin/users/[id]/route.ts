import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

type Params = { params: Promise<{ id: string }> };

function isAdminOrSuper(role: string) {
  return role === 'superadmin' || role === 'admin';
}

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: 获取单个用户详情
 *     tags: [Admin/Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 用户详情
 *   patch:
 *     summary: 更新用户信息
 *     tags: [Admin/Users]
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
 *               nickname: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               role: { type: string, enum: [superadmin, admin, user] }
 *               is_active: { type: boolean }
 *               password: { type: string, description: 留空则不修改 }
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     summary: 删除用户
 *     tags: [Admin/Users]
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

/** GET /api/admin/users/[id] */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminOrSuper(auth.role)) return errorResponse(ResultCode.FORBIDDEN, '无权限');

  const { id } = await params;

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('users')
      .select('id,username,nickname,avatar,email,phone,bio,gender,role,is_active,last_login,created_at')
      .eq('id', id).maybeSingle();
    if (!data) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    if (auth.role === 'admin' && data.role !== 'user') return errorResponse(ResultCode.FORBIDDEN, '无权限查看该用户');
    return successResponse(data);
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, username, nickname, avatar, email, phone, bio, gender, role, is_active, last_login, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!res.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    // admin 不能查看 superadmin/admin 用户
    if (auth.role === 'admin' && res.rows[0].role !== 'user') {
      return errorResponse(ResultCode.FORBIDDEN, '无权限查看该用户');
    }
    return successResponse(res.rows[0]);
  } finally {
    client.release();
  }
}

/** PATCH /api/admin/users/[id] */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminOrSuper(auth.role)) return errorResponse(ResultCode.FORBIDDEN, '无权限');

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const client = DB_TYPE !== 'supabase' ? await pool.connect() : null;
  try {
    let existingRole: string;
    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      const { data: existingData } = await supabase.from('users').select('role').eq('id', id).maybeSingle();
      if (!existingData) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
      existingRole = existingData.role;
    } else {
      // 先查出目标用户
      const existing = await client!.query('SELECT role FROM users WHERE id = $1', [id]);
      if (!existing.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
      existingRole = existing.rows[0].role;
    }

    // admin 只能操作 user 角色
    if (auth.role === 'admin' && existingRole !== 'user') {
      return errorResponse(ResultCode.FORBIDDEN, '无权限修改该用户');
    }
    // admin 不能提权
    if (auth.role === 'admin' && body.role && body.role !== 'user') {
      return errorResponse(ResultCode.FORBIDDEN, '管理员无权限提升用户角色');
    }
    // 不允许降级 superadmin（防止误操作）
    if (existingRole === 'superadmin' && auth.role !== 'superadmin') {
      return errorResponse(ResultCode.FORBIDDEN, '无权限修改超级管理员');
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let pi = 1;

    const allowed = ['nickname', 'email', 'phone', 'bio', 'gender', 'avatar', 'is_active', 'role'];
    for (const key of allowed) {
      if (key in body) {
        if (key === 'role') {
          const newRole = body.role as string;
          if (!['superadmin', 'admin', 'user'].includes(newRole)) {
            return errorResponse(ResultCode.BAD_REQUEST, '非法角色值');
          }
          // 只有 superadmin 能提权
          if (newRole !== 'user' && auth.role !== 'superadmin') {
            return errorResponse(ResultCode.FORBIDDEN, '只有超级管理员才能提升角色');
          }
        }
        sets.push(`${key} = $${pi}`);
        vals.push(body[key]);
        pi++;
      }
    }

    // 密码单独处理
    if (body.password) {
      if ((body.password as string).length < 6) {
        return errorResponse(ResultCode.BAD_REQUEST, '密码长度不能少于 6 位');
      }
      sets.push(`password = $${pi}`);
      vals.push(await bcrypt.hash(body.password as string, 12));
      pi++;
    }

    if (sets.length === 0) return errorResponse(ResultCode.BAD_REQUEST, '无可更新字段');

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      const supabaseUpdates: Record<string, unknown> = {};
      const allowed2 = ['nickname', 'email', 'phone', 'bio', 'gender', 'avatar', 'is_active', 'role'];
      for (const key of allowed2) {
        if (key in body) supabaseUpdates[key] = body[key];
      }
      if (body.password) {
        supabaseUpdates.password = await bcrypt.hash(body.password as string, 12);
      }
      supabaseUpdates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('users').update(supabaseUpdates).eq('id', id)
        .select('id,username,nickname,email,phone,role,is_active,gender,avatar').single();
      if (error) {
        if (error.code === '23505') return errorResponse(ResultCode.BAD_REQUEST, '邮箱或手机号已被使用');
        return errorResponse(ResultCode.DB_ERROR, '数据库错误');
      }
      return successResponse(data, '更新成功');
    }

    const res = await client!.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${pi}
       RETURNING id, username, nickname, email, phone, role, is_active, gender, avatar`,
      vals
    );
    return successResponse(res.rows[0], '更新成功');
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') return errorResponse(ResultCode.BAD_REQUEST, '邮箱或手机号已被使用');
    return errorResponse(ResultCode.DB_ERROR, '数据库错误');
  } finally {
    client?.release();
  }
}

/** DELETE /api/admin/users/[id] */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminOrSuper(auth.role)) return errorResponse(ResultCode.FORBIDDEN, '无权限');

  const { id } = await params;
  const numId = parseInt(id);
  if (numId === auth.userId) return errorResponse(ResultCode.BAD_REQUEST, '不能删除自己');

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data: existingData } = await supabase.from('users').select('role').eq('id', id).maybeSingle();
    if (!existingData) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    if (existingData.role === 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '不能删除超级管理员');
    if (auth.role === 'admin' && existingData.role !== 'user') return errorResponse(ResultCode.FORBIDDEN, '无权限删除该用户');
    await supabase.from('users').delete().eq('id', id);
    return successResponse(null, '删除成功');
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    if (existing.rows[0].role === 'superadmin') {
      return errorResponse(ResultCode.FORBIDDEN, '不能删除超级管理员');
    }
    if (auth.role === 'admin' && existing.rows[0].role !== 'user') {
      return errorResponse(ResultCode.FORBIDDEN, '无权限删除该用户');
    }
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    return successResponse(null, '删除成功');
  } finally {
    client.release();
  }
}

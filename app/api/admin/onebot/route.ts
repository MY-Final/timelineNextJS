import { NextRequest } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import {
  getOnebotConfig,
  invalidateOnebotCache,
  sendTestNotification,
  type OnebotConfig,
} from '@/lib/onebot';

/**
 * @swagger
 * /api/admin/onebot:
 *   get:
 *     summary: 获取 OneBot 推送配置（仅超级管理员）
 *     tags: [Admin/Onebot]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: OneBot 配置对象
 *   put:
 *     summary: 更新 OneBot 推送配置（仅超级管理员）
 *     tags: [Admin/Onebot]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled: { type: boolean }
 *               http_url: { type: string }
 *               access_token: { type: string }
 *               target_qq: { type: string, description: "多个 QQ 号用英文逗号分隔" }
 *               target_group: { type: string, description: "多个群号用英文逗号分隔" }
 *               notify_on_like: { type: boolean }
 *               notify_on_comment: { type: boolean }
 *               notify_on_post: { type: boolean }
 *               email_threshold: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: 更新成功
 */

/** GET /api/admin/onebot */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可访问');

  const cfg = await getOnebotConfig();
  return successResponse(cfg ?? {
    id: 1,
    enabled: false,
    http_url: '',
    access_token: '',
    target_qq: '',
    target_group: '',
    notify_on_like: true,
    notify_on_comment: true,
    notify_on_post: true,
    email_threshold: 0,
  });
}

/** PUT /api/admin/onebot */
export async function PUT(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可修改');

  let body: Partial<OnebotConfig>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  // 值校验
  if (body.email_threshold !== undefined) {
    const n = Number(body.email_threshold);
    if (!Number.isInteger(n) || n < 0) {
      return errorResponse(ResultCode.BAD_REQUEST, 'email_threshold 必须为非负整数');
    }
    body.email_threshold = n;
  }

  if (body.http_url !== undefined) {
    body.http_url = body.http_url.trim();
  }

  // 清理多目标字段：去除多余空格，过滤空元素
  if (body.target_qq !== undefined) {
    body.target_qq = body.target_qq.split(',').map(s => s.trim()).filter(Boolean).join(',');
  }
  if (body.target_group !== undefined) {
    body.target_group = body.target_group.split(',').map(s => s.trim()).filter(Boolean).join(',');
  }

  const fields = [
    'enabled', 'http_url', 'access_token',
    'target_qq', 'target_group',
    'notify_on_like', 'notify_on_comment', 'notify_on_post',
    'email_threshold',
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(ResultCode.BAD_REQUEST, '未提供任何可更新的字段');
  }

  try {
    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('onebot_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    } else {
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await pool.query(
        `UPDATE onebot_config SET ${setClauses}, updated_at = NOW() WHERE id = 1`,
        values
      );
    }

    await invalidateOnebotCache();
    const updated = await getOnebotConfig();
    return successResponse(updated, '配置已保存');
  } catch (e) {
    console.error('[PUT /api/admin/onebot]', e);
    return errorResponse(ResultCode.DB_ERROR, '保存失败');
  }
}

/**
 * POST /api/admin/onebot/test — 发送测试消息
 * 注意：测试使用请求体中的临时配置，不要求已保存到数据库
 */
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可操作');

  let body: Partial<OnebotConfig>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const testCfg: OnebotConfig = {
    id: 1,
    enabled: true,
    http_url: body.http_url?.trim() ?? '',
    access_token: body.access_token?.trim() ?? '',
    target_qq: body.target_qq?.trim() ?? '',
    target_group: body.target_group?.trim() ?? '',
    notify_on_like: true,
    notify_on_comment: true,
    notify_on_post: true,
    email_threshold: 0,
  };

  const result = await sendTestNotification(testCfg);
  if (!result.ok) {
    return errorResponse(ResultCode.UPSTREAM_ERROR, result.error ?? '发送失败');
  }
  return successResponse(null, '测试消息已发送');
}

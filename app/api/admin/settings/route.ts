import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/site-settings';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

const ALLOWED_KEYS = new Set([
  'site_name',
  'registration_enabled',
  'email_daily_limit',
  'love_start_date',
  'love_start_date_label',
  'person_a_name',
  'person_b_name',
  'avatar_a',
  'avatar_b',
]);

/** GET /api/admin/settings — 获取所有站点配置（仅超级管理员） */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可访问');

  const settings = await getAllSettings();
  return successResponse(settings);
}

/** PUT /api/admin/settings — 更新单个配置（仅超级管理员）
 * body: { key: string; value: string }
 */
export async function PUT(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可修改');

  let body: { key?: string; value?: string };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { key, value } = body;
  if (!key || value === undefined) {
    return errorResponse(ResultCode.BAD_REQUEST, 'key 和 value 均为必填');
  }
  if (!ALLOWED_KEYS.has(key)) {
    return errorResponse(ResultCode.BAD_REQUEST, '不允许修改的配置项');
  }

  // 值校验
  if (key === 'registration_enabled' && value !== 'true' && value !== 'false') {
    return errorResponse(ResultCode.BAD_REQUEST, 'registration_enabled 只能为 true 或 false');
  }
  if (key === 'email_daily_limit') {
    const n = parseInt(value);
    if (isNaN(n) || n < 0) {
      return errorResponse(ResultCode.BAD_REQUEST, 'email_daily_limit 必须为非负整数');
    }
  }

  await setSetting(key, value);
  return successResponse(null, '配置已更新');
}

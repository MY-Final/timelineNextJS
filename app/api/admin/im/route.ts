import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import {
  getDefaultImConfigListResponse,
  getImConfigListResponse,
  parseImProviderType,
  sendImTestNotification,
  updateImConfig,
} from '@/lib/im';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可访问');

  try {
    const data = await getImConfigListResponse();
    return successResponse(data);
  } catch (error) {
    console.error('[GET /api/admin/im]', error);
    return successResponse(getDefaultImConfigListResponse());
  }
}

export async function PUT(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可修改');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const type = parseImProviderType(body.type);
  if (!type) {
    return errorResponse(ResultCode.BAD_REQUEST, 'type 必须为 onebot 或 gotify');
  }

  if (body.email_threshold !== undefined) {
    const threshold = Number(body.email_threshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      return errorResponse(ResultCode.BAD_REQUEST, 'email_threshold 必须为非负整数');
    }
  }

  try {
    const data = await updateImConfig({
      type,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      notify_on_like: typeof body.notify_on_like === 'boolean' ? body.notify_on_like : undefined,
      notify_on_comment: typeof body.notify_on_comment === 'boolean' ? body.notify_on_comment : undefined,
      notify_on_post: typeof body.notify_on_post === 'boolean' ? body.notify_on_post : undefined,
      email_threshold: body.email_threshold === undefined ? undefined : Number(body.email_threshold),
      config: typeof body.config === 'object' && body.config !== null ? body.config as Record<string, unknown> : undefined,
    });
    return successResponse(data, '配置已保存');
  } catch (error) {
    console.error('[PUT /api/admin/im]', error);
    return errorResponse(ResultCode.DB_ERROR, '保存失败');
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可操作');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const type = parseImProviderType(body.type);
  if (!type) {
    return errorResponse(ResultCode.BAD_REQUEST, 'type 必须为 onebot 或 gotify');
  }

  const config = typeof body.config === 'object' && body.config !== null
    ? body.config as Record<string, unknown>
    : {};

  const result = await sendImTestNotification({ type, config });
  if (!result.ok) {
    return errorResponse(ResultCode.UPSTREAM_ERROR, result.error ?? '发送失败');
  }

  return successResponse(null, '测试消息已发送');
}

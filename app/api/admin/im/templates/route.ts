import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import {
  getImTemplates,
  updateImTemplate,
  previewTemplate,
  DEFAULT_TEMPLATES,
  TEMPLATE_VARIABLES,
} from '@/lib/im';
import type { NotificationType } from '@/lib/onebot';

const VALID_TYPES: NotificationType[] = ['like', 'comment', 'post', 'email_threshold'];

function isNotificationType(v: unknown): v is NotificationType {
  return typeof v === 'string' && (VALID_TYPES as string[]).includes(v);
}

// GET /api/admin/im/templates — 获取全部模版
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'superadmin') return errorResponse(ResultCode.FORBIDDEN, '仅超级管理员可访问');

  try {
    const templates = await getImTemplates();
    return successResponse({ templates, variables: TEMPLATE_VARIABLES, defaults: DEFAULT_TEMPLATES });
  } catch (error) {
    console.error('[GET /api/admin/im/templates]', error);
    return errorResponse(ResultCode.DB_ERROR, '获取模版失败');
  }
}

// PUT /api/admin/im/templates — 更新单条模版
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

  if (!isNotificationType(body.type)) {
    return errorResponse(ResultCode.BAD_REQUEST, 'type 必须为 like | comment | post | email_threshold');
  }
  if (typeof body.template !== 'string' || !body.template.trim()) {
    return errorResponse(ResultCode.BAD_REQUEST, 'template 不能为空');
  }

  try {
    const templates = await updateImTemplate({
      type: body.type,
      template: body.template.trim(),
      enabled: body.enabled !== false,
    });
    return successResponse({ templates }, '模版已保存');
  } catch (error) {
    console.error('[PUT /api/admin/im/templates]', error);
    return errorResponse(ResultCode.DB_ERROR, '保存失败');
  }
}

// POST /api/admin/im/templates — 预览模版（用模拟数据渲染）
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

  if (!isNotificationType(body.type)) {
    return errorResponse(ResultCode.BAD_REQUEST, 'type 必须为 like | comment | post | email_threshold');
  }

  const templateOverride = typeof body.template === 'string' ? body.template : undefined;

  try {
    const preview = await previewTemplate(body.type, templateOverride);
    return successResponse({ preview });
  } catch (error) {
    console.error('[POST /api/admin/im/templates]', error);
    return errorResponse(ResultCode.DB_ERROR, '预览失败');
  }
}

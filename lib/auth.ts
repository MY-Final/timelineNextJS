import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export const TOKEN_COOKIE = 'token';

/**
 * 从 Cookie 或 Authorization header 提取并验证 JWT。
 * Cookie 优先；Postman 等工具可继续用 Bearer token 调试。
 */
export function getAuthUser(
  request: NextRequest
): (TokenPayload & { iat?: number; exp?: number }) | NextResponse {
  // 1. 优先读 HttpOnly Cookie
  let token = request.cookies.get(TOKEN_COOKIE)?.value;

  // 2. 降级到 Authorization header（兼容 Postman / 移动端）
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return NextResponse.json(
      { success: false, message: '未提供认证 Token' },
      { status: 401 }
    );
  }

  try {
    return verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Token 无效或已过期' },
      { status: 401 }
    );
  }
}

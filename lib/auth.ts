import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

/**
 * 从请求头提取并验证 JWT，验证通过返回 payload，否则返回 401 响应。
 * 用法：
 *   const result = getAuthUser(request);
 *   if (result instanceof NextResponse) return result;  // 401
 *   const { userId, role } = result;
 */
export function getAuthUser(
  request: NextRequest
): (TokenPayload & { iat?: number; exp?: number }) | NextResponse {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, message: '未提供认证 Token' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  try {
    return verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Token 无效或已过期' },
      { status: 401 }
    );
  }
}

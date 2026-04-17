import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, TOKEN_COOKIE } from '@/lib/auth';
import { successResponse } from '@/lib/result';

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (user instanceof NextResponse) return user;

  const response = successResponse(null, '登出成功');
  // 清除 Cookie
  response.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// JWT 是无状态的，客户端删除 token 即完成登出。
// 如需服务端强制失效，可在此写入 token 黑名单（Redis / DB）。
export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (user instanceof NextResponse) return user;

  return NextResponse.json({
    success: true,
    message: '登出成功，请客户端清除 Token',
  });
}

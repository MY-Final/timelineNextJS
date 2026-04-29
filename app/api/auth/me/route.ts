import { NextRequest, NextResponse } from 'next/server';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = getAuthUser(request);
  if (auth instanceof NextResponse) return auth;

  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, username, nickname, email, avatar, role, bio, created_at, last_login')
      .eq('id', auth.userId)
      .maybeSingle();
    if (error || !data) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    return successResponse(data);
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, nickname, email, avatar, role, bio, created_at, last_login FROM users WHERE id = $1',
      [auth.userId]
    );
    const user = result.rows[0];
    if (!user) return errorResponse(ResultCode.NOT_FOUND, '用户不存在');
    return successResponse(user);
  } finally {
    client.release();
  }
}

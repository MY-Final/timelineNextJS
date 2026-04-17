import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect().catch((err: Error) => {
    throw err;
  });

  try {
    const result = await client.query('SELECT NOW()');
    return NextResponse.json({
      success: true,
      message: '数据库连接成功',
      data: result.rows[0],
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        message: '数据库连接失败',
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

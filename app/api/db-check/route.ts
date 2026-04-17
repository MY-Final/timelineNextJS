import pool from '@/lib/db';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';

export async function GET() {
  const client = await pool.connect().catch((err: Error) => {
    throw err;
  });

  try {
    const result = await client.query('SELECT NOW()');
    return successResponse(result.rows[0], '数据库连接成功');
  } catch (err) {
    const error = err as Error;
    return errorResponse(ResultCode.DB_ERROR, `数据库连接失败：${error.message}`);
  } finally {
    client.release();
  }
}

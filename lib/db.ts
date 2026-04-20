import { Pool } from 'pg';

// 数据库类型选择: "self-hosted" | "supabase"
export const DB_TYPE = process.env.DB_TYPE || 'self-hosted';

/**
 * 创建数据库连接池
 * 根据 DB_TYPE 环境变量选择:
 * - "self-hosted" → 使用自建 PostgreSQL
 * - "supabase" → 使用 Supabase PostgreSQL
 */
export function createDbPool(): Pool {
  console.log('[DB] Creating pool with type:', DB_TYPE);
  if (DB_TYPE === 'supabase') {
    // Supabase: 使用连接字符串
    const supabaseUrl = process.env.SUPABASE_DB_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_DB_URL 环境变量未设置');
    }
    return new Pool({
      connectionString: supabaseUrl,
    });
  } else {
    // 自建 PostgreSQL
    return new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }
}

// 直接创建并导出 pool 实例
const pool = createDbPool();
export default pool;
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
      ssl: { rejectUnauthorized: false },
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

// 懒加载：首次调用时创建 pool，避免模块加载时崩溃导致空响应
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = createDbPool();
  }
  return _pool;
}

// 代理对象：透明转发所有调用到懒加载的 pool
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default pool;
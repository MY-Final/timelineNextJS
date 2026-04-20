import pool, { DB_TYPE } from './db';
import { getSupabaseClient } from './supabase';
import { getRedis, REDIS_TYPE } from './redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

const CACHE_TTL = 300; // 5 分钟
const CACHE_PREFIX = 'setting:';

/** 默认值（数据库不存在时的兜底） */
const DEFAULTS: Record<string, string> = {
  site_name: 'Our Story',
  registration_enabled: 'true',
  email_daily_limit: '100',
  love_start_date: '2026-03-08T18:35:00',
  love_start_date_label: '2026年3月8日',
  person_a_name: '阳阳',
  person_b_name: '湘湘',
  avatar_a: 'https://q1.qlogo.cn/g?b=qq&nk=3486159271&s=640',
  avatar_b: 'https://q1.qlogo.cn/g?b=qq&nk=1789859045&s=640',
};

/** 从 Redis 读缓存 */
async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = getRedis();
    return await redis.get(CACHE_PREFIX + key) as string | null;
  } catch {
    return null;
  }
}

/** 写 Redis 缓存 */
async function cacheSet(key: string, value: string): Promise<void> {
  try {
    const redis = getRedis();
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(CACHE_PREFIX + key, value, { ex: CACHE_TTL });
    } else {
      await (redis as Redis).set(CACHE_PREFIX + key, value, 'EX', CACHE_TTL);
    }
  } catch {
    // 缓存写失败不影响主流程
  }
}

/** 删除 Redis 缓存 */
async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_PREFIX + key);
  } catch {
    // 忽略
  }
}

/** 从数据库读取单个配置 */
async function fetchFromDb(key: string): Promise<string | null> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return data?.value ?? null;
  }
  const client = await pool.connect();
  try {
    const res = await client.query<{ value: string }>(
      'SELECT value FROM site_settings WHERE key = $1',
      [key]
    );
    return res.rows[0]?.value ?? null;
  } finally {
    client.release();
  }
}

/** 批量从数据库读取 */
async function fetchManyFromDb(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', keys);
    const result: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => { result[row.key] = row.value; });
    return result;
  }
  const client = await pool.connect();
  try {
    const res = await client.query<{ key: string; value: string }>(
      'SELECT key, value FROM site_settings WHERE key = ANY($1)',
      [keys]
    );
    const result: Record<string, string> = {};
    res.rows.forEach(row => { result[row.key] = row.value; });
    return result;
  } finally {
    client.release();
  }
}

/** 获取单个配置，带 Redis 缓存和默认值兜底 */
export async function getSetting(key: string): Promise<string> {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const val = await fetchFromDb(key);
  const result = val ?? DEFAULTS[key] ?? '';
  await cacheSet(key, result);
  return result;
}

/** 批量获取配置 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of keys) {
    const cached = await cacheGet(key);
    if (cached !== null) {
      result[key] = cached;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const fromDb = await fetchManyFromDb(missing);
    for (const key of missing) {
      const val = fromDb[key] ?? DEFAULTS[key] ?? '';
      result[key] = val;
      await cacheSet(key, val);
    }
  }

  return result;
}

/** 更新单个配置，同时清除 Redis 缓存 */
export async function setSetting(key: string, value: string): Promise<void> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    await supabase.from('site_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } else {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    } finally {
      client.release();
    }
  }
  await cacheDel(key);
}

/** 获取所有配置（仅用于管理后台） */
export async function getAllSettings(): Promise<{ key: string; value: string; description: string; updated_at: string }[]> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value, description, updated_at')
      .order('key');
    return data ?? [];
  }
  const client = await pool.connect();
  try {
    const res = await client.query<{ key: string; value: string; description: string; updated_at: string }>(
      'SELECT key, value, description, updated_at FROM site_settings ORDER BY key'
    );
    return res.rows;
  } finally {
    client.release();
  }
}

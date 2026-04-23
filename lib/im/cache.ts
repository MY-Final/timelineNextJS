// ─────────────────────────────────────────────
//  lib/im/cache.ts  —  Redis 缓存读写
// ─────────────────────────────────────────────

import { getRedis, REDIS_TYPE } from '@/lib/redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { invalidateOnebotCache } from '@/lib/onebot';
import type { ImConfig } from './types';

const CACHE_KEY = 'im:config:list';
const CACHE_TTL = 300;

export async function cacheGet(): Promise<ImConfig[] | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(CACHE_KEY) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as ImConfig[];
  } catch {
    return null;
  }
}

export async function cacheSet(configs: ImConfig[]): Promise<void> {
  try {
    const redis = getRedis();
    const value = JSON.stringify(configs);
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(CACHE_KEY, value, { ex: CACHE_TTL });
    } else {
      await (redis as Redis).set(CACHE_KEY, value, 'EX', CACHE_TTL);
    }
  } catch {}
}

export async function invalidateImConfigCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
  } catch {}
  await invalidateOnebotCache();
}

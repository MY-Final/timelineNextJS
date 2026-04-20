import Redis from 'ioredis';
// @upstash/redis 用于云 Redis (Upstash)
import { Redis as UpstashRedis } from '@upstash/redis';

// Redis 类型选择: "upstash" | "self-hosted"
export const REDIS_TYPE = process.env.REDIS_TYPE || 'self-hosted';

// 自托管 Redis 配置
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let ioredisClient: Redis | null = null;

// 云 Redis 客户端 (@upstash/redis)
let upstashClient: UpstashRedis | null = null;

/**
 * 获取 Redis 客户端
 * 根据 REDIS_TYPE 环境变量选择:
 * - "upstash" → 使用 @upstash/redis (云)
 * - "self-hosted" → 使用 ioredis (自托管)
 */
export function getRedis(): Redis | UpstashRedis {
  if (REDIS_TYPE === 'upstash') {
    // 使用 Upstash 云 Redis
    if (!upstashClient) {
      upstashClient = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    }
    return upstashClient;
  } else {
    // 使用自托管 Redis (ioredis)
    if (!ioredisClient) {
      ioredisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      ioredisClient.on('error', (err) => {
        console.error('[Redis] connection error:', err.message);
      });
    }
    return ioredisClient;
  }
}

/**
 * 生成并存储 OTP，有效期 5 分钟
 */
export async function setOtp(key: string, code: string): Promise<void> {
  const redis = getRedis();
  if (REDIS_TYPE === 'upstash') {
    // @upstash/redis API
    await (redis as UpstashRedis).set(`otp:${key}`, code, { ex: 300 });
  } else {
    // ioredis API
    await (redis as Redis).set(`otp:${key}`, code, 'EX', 300);
  }
}

/**
 * 获取 OTP
 */
export async function getOtp(key: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`otp:${key}`) as Promise<string | null>;
}

/**
 * 删除 OTP（验证成功后使用）
 */
export async function delOtp(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`otp:${key}`);
}

/**
 * 生成 6 位字母+数字验证码
 */
export function generateOtpCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
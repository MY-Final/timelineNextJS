import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on('error', (err) => {
      console.error('[Redis] connection error:', err.message);
    });
  }
  return client;
}

/** 生成并存储 OTP，有效期 5 分钟 */
export async function setOtp(key: string, code: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`otp:${key}`, code, 'EX', 300); // 300s = 5min
}

/** 获取 OTP */
export async function getOtp(key: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`otp:${key}`);
}

/** 删除 OTP（验证成功后使用） */
export async function delOtp(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`otp:${key}`);
}

/** 生成 6 位字母+数字验证码 */
export function generateOtpCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

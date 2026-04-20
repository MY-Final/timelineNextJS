import { NextRequest } from 'next/server';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { generateOtpCode, setOtp, REDIS_TYPE, getRedis } from '@/lib/redis';
import { sendOtpMail, getActiveAccount } from '@/lib/mailer';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { getSetting } from '@/lib/site-settings';

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     summary: 发送邮箱验证码
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, purpose]
 *             properties:
 *               email: { type: string }
 *               purpose:
 *                 type: string
 *                 enum: [register, reset]
 *                 description: register=注册验证, reset=找回密码
 *     responses:
 *       200:
 *         description: 验证码已发送
 */

/** POST /api/auth/send-code
 * body: { email, purpose: 'register' | 'reset' }
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; purpose?: string };
  try { body = await request.json(); } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误');
  }

  const { email, purpose } = body;
  if (!email || !purpose) {
    return errorResponse(ResultCode.BAD_REQUEST, '邮箱和用途均为必填');
  }
  if (!['register', 'reset'].includes(purpose)) {
    return errorResponse(ResultCode.BAD_REQUEST, '非法 purpose');
  }

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(email)) {
    return errorResponse(ResultCode.BAD_REQUEST, '邮箱格式不正确');
  }

  // 注册开关检查
  if (purpose === 'register') {
    const regEnabled = await getSetting('registration_enabled');
    if (regEnabled !== 'true') {
      return errorResponse(ResultCode.FORBIDDEN, '注册功能已关闭，请联系管理员');
    }
  }

  // 注册时：邮箱不能已存在；重置时：邮箱必须存在
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data: existData } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (purpose === 'register' && existData) return errorResponse(ResultCode.BAD_REQUEST, '该邮箱已被注册');
    if (purpose === 'reset' && !existData) return errorResponse(ResultCode.NOT_FOUND, '未找到使用该邮箱的账号');
  } else {
    const client = await pool.connect();
    try {
      const existRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (purpose === 'register' && existRes.rows.length > 0) {
        return errorResponse(ResultCode.BAD_REQUEST, '该邮箱已被注册');
      }
      if (purpose === 'reset' && existRes.rows.length === 0) {
        return errorResponse(ResultCode.NOT_FOUND, '未找到使用该邮箱的账号');
      }
    } finally {
      client.release();
    }
  }

  // 防刷限流：60s 内只能发一次
  const redis = getRedis();
  const rateLimitKey = `otp_rate:${email}`;
  try {
    const exists = await redis.get(rateLimitKey);
    if (exists) {
      return errorResponse(ResultCode.BAD_REQUEST, '发送过于频繁，请 60 秒后再试');
    }
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(rateLimitKey, '1', { ex: 60 });
    } else {
      await (redis as Redis).set(rateLimitKey, '1', 'EX', 60);
    }
  } catch {
    // Redis 不可用时拒绝发送，避免限流被绕过
    return errorResponse(ResultCode.INTERNAL_ERROR, '服务暂时不可用，请稍后再试');
  }

  const code = generateOtpCode();
  const otpKey = `${purpose === 'register' ? 'reg' : 'pwd'}:${email}`;

  try {
    await setOtp(otpKey, code);
  } catch (err) {
    console.error('[send-code] Redis setOtp failed:', err);
    return errorResponse(ResultCode.INTERNAL_ERROR, 'Redis 不可用，无法发送验证码');
  }

  // ── 每日限流检查 ─────────────────────────────────
  // 获取限流配置
  const dailyLimitStr = await getSetting('email_daily_limit');
  const dailyLimit = parseInt(dailyLimitStr) || 0;

  if (dailyLimit > 0) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const redis = getRedis();

    // 1. 按收件人邮箱限流（防止对同一地址狂刷）
    const toKey = `email_daily_to:${email}:${today}`;
    try {
      const toCount = parseInt((await redis.get(toKey) as string | null) ?? '0');
      if (toCount >= dailyLimit) {
        return errorResponse(ResultCode.TOO_MANY_REQUESTS, `该邮箱今日接收验证码已达上限（${dailyLimit} 封），请明天再试`);
      }
    } catch {
      return errorResponse(ResultCode.INTERNAL_ERROR, '服务暂时不可用（限流服务异常），请稍后再试');
    }

    // 2. 按发件账号限流（防止账号封禁）
    const account = await getActiveAccount(purpose === 'register' ? 'reg' : 'pwd');
    if (account) {
      const accKey = `email_daily:${account.id}:${today}`;
      try {
        const accCount = parseInt((await redis.get(accKey) as string | null) ?? '0');
        if (accCount >= dailyLimit) {
          return errorResponse(ResultCode.TOO_MANY_REQUESTS, `邮件服务今日发送已达上限（${dailyLimit} 封），请明天再试或联系管理员`);
        }
        // 计数 +1，TTL 设到当日结束（剩余秒数）
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const ttl = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
        if (REDIS_TYPE === 'upstash') {
          await (redis as UpstashRedis).incr(accKey);
          await (redis as UpstashRedis).expire(accKey, ttl);
          await (redis as UpstashRedis).incr(toKey);
          await (redis as UpstashRedis).expire(toKey, ttl);
        } else {
          await (redis as Redis).incr(accKey);
          await (redis as Redis).expire(accKey, ttl);
          await (redis as Redis).incr(toKey);
          await (redis as Redis).expire(toKey, ttl);
        }
      } catch {
        return errorResponse(ResultCode.INTERNAL_ERROR, '服务暂时不可用（限流服务异常），请稍后再试');
      }
    }
  }
  // ─────────────────────────────────────────────────

  const result = await sendOtpMail(email, code, purpose as 'register' | 'reset');
  if (!result.success) {
    console.error('[send-code] sendOtpMail failed:', result.message);
    return errorResponse(ResultCode.UPSTREAM_ERROR, result.message);
  }

  return successResponse(null, '验证码已发送，请查收邮件');
}

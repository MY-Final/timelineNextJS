import { NextRequest } from 'next/server';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import pool from '@/lib/db';
import { generateOtpCode, setOtp, REDIS_TYPE } from '@/lib/redis';
import { sendOtpMail } from '@/lib/mailer';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { getRedis } from '@/lib/redis';

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

  // 注册时：邮箱不能已存在；重置时：邮箱必须存在
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

  const result = await sendOtpMail(email, code, purpose as 'register' | 'reset');
  if (!result.success) {
    console.error('[send-code] sendOtpMail failed:', result.message);
    return errorResponse(ResultCode.UPSTREAM_ERROR, result.message);
  }

  return successResponse(null, '验证码已发送，请查收邮件');
}

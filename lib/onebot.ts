/**
 * OneBot HTTP 正向调用封装
 * 支持私聊（send_private_msg）和群消息（send_group_msg）
 * 目标 QQ 号 / 群号均支持多个（英文逗号分隔）
 * 所有发送操作均为 fire-and-forget，失败静默，不抛出异常
 */

import pool, { DB_TYPE } from './db';
import { getSupabaseClient } from './supabase';
import { getRedis, REDIS_TYPE } from './redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { getSetting } from './site-settings';

const CACHE_KEY = 'onebot:config';
const CACHE_TTL = 300; // 5 分钟

export interface OnebotConfig {
  id: number;
  enabled: boolean;
  http_url: string;
  access_token: string;
  target_qq: string;       // 英文逗号分隔的 QQ 号列表
  target_group: string;    // 英文逗号分隔的群号列表
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number; // 0 表示不启用
}

// ─── 缓存 ────────────────────────────────────────────────────────────────────

async function cacheGet(): Promise<OnebotConfig | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(CACHE_KEY) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as OnebotConfig;
  } catch {
    return null;
  }
}

async function cacheSet(cfg: OnebotConfig): Promise<void> {
  try {
    const redis = getRedis();
    const value = JSON.stringify(cfg);
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(CACHE_KEY, value, { ex: CACHE_TTL });
    } else {
      await (redis as Redis).set(CACHE_KEY, value, 'EX', CACHE_TTL);
    }
  } catch {
    // 缓存写失败不影响主流程
  }
}

export async function invalidateOnebotCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
  } catch {
    // ignore
  }
}

// ─── 配置读取 ─────────────────────────────────────────────────────────────────

export async function getOnebotConfig(): Promise<OnebotConfig | null> {
  const cached = await cacheGet();
  if (cached) return cached;

  try {
    let row: OnebotConfig | null = null;

    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('onebot_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      row = data as OnebotConfig | null;
    } else {
      const { rows } = await pool.query<OnebotConfig>(
        'SELECT * FROM onebot_config WHERE id = 1 LIMIT 1'
      );
      row = rows[0] ?? null;
    }

    if (row) await cacheSet(row);
    return row;
  } catch (e) {
    console.error('[OneBot] getOnebotConfig error:', e);
    return null;
  }
}

// ─── HTTP 调用 ────────────────────────────────────────────────────────────────

async function callOnebot(
  httpUrl: string,
  accessToken: string,
  endpoint: string,
  params: Record<string, unknown>
): Promise<void> {
  const url = `${httpUrl.replace(/\/$/, '')}/${endpoint}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OneBot HTTP ${res.status}: ${text}`);
  }
}

async function sendPrivateMsg(
  cfg: OnebotConfig,
  userId: string,
  message: string
): Promise<void> {
  await callOnebot(cfg.http_url, cfg.access_token, 'send_private_msg', {
    user_id: parseInt(userId, 10),
    message,
  });
}

async function sendGroupMsg(
  cfg: OnebotConfig,
  groupId: string,
  message: string
): Promise<void> {
  await callOnebot(cfg.http_url, cfg.access_token, 'send_group_msg', {
    group_id: parseInt(groupId, 10),
    message,
  });
}

// ─── 解析多目标 ───────────────────────────────────────────────────────────────

function parseTargets(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ─── 消息文本构建 ──────────────────────────────────────────────────────────────

async function buildMessage(
  type: NotificationType,
  payload: NotificationPayload
): Promise<string> {
  const siteName = await getSetting('site_name').catch(() => 'Our Story');
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  switch (type) {
    case 'like':
      return `[${siteName}] 新点赞通知\n时间：${now}\n用户 ${payload.username ?? payload.userId} 赞了帖子「${payload.postTitle ?? payload.postId}」`;
    case 'comment':
      return `[${siteName}] 新评论通知\n时间：${now}\n用户 ${payload.username ?? payload.userId} 评论了帖子「${payload.postTitle ?? payload.postId}」：\n${payload.content ?? ''}`;
    case 'post':
      return `[${siteName}] 新帖子通知\n时间：${now}\n用户 ${payload.username ?? payload.userId} 发布了帖子「${payload.postTitle ?? payload.postId}」`;
    case 'email_threshold':
      return `[${siteName}] 邮件发送量预警\n时间：${now}\n今日邮件发送量已达 ${payload.count} 封，超过阈值 ${payload.threshold} 封`;
    default:
      return `[${siteName}] 系统通知\n时间：${now}`;
  }
}

// ─── 统一发送入口 ──────────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'comment' | 'post' | 'email_threshold';

export interface NotificationPayload {
  userId?: number | string;
  username?: string;
  postId?: number | string;
  postTitle?: string;
  content?: string;    // 评论内容，截断后传入
  count?: number;      // 邮件发送量
  threshold?: number;  // 邮件阈值
}

export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  try {
    const cfg = await getOnebotConfig();
    if (!cfg || !cfg.enabled || !cfg.http_url) return;

    // 按事件类型检查开关
    if (type === 'like' && !cfg.notify_on_like) return;
    if (type === 'comment' && !cfg.notify_on_comment) return;
    if (type === 'post' && !cfg.notify_on_post) return;
    if (type === 'email_threshold' && cfg.email_threshold <= 0) return;

    const message = await buildMessage(type, payload);
    const qqTargets = parseTargets(cfg.target_qq);
    const groupTargets = parseTargets(cfg.target_group);

    await Promise.allSettled([
      ...qqTargets.map(qq => sendPrivateMsg(cfg, qq, message)),
      ...groupTargets.map(gid => sendGroupMsg(cfg, gid, message)),
    ]);
  } catch (e) {
    console.error('[OneBot] sendNotification error:', e);
  }
}

/** 发送测试消息（用于管理员界面验证配置） */
export async function sendTestNotification(cfg: OnebotConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!cfg.http_url) return { ok: false, error: 'HTTP 地址不能为空' };

    const siteName = await getSetting('site_name').catch(() => 'Our Story');
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const message = `[${siteName}] 测试消息\n时间：${now}\nOneBot 通知配置成功！`;

    const qqTargets = parseTargets(cfg.target_qq);
    const groupTargets = parseTargets(cfg.target_group);

    if (qqTargets.length === 0 && groupTargets.length === 0) {
      return { ok: false, error: '请至少填写一个目标 QQ 号或群号' };
    }

    const results = await Promise.allSettled([
      ...qqTargets.map(qq => sendPrivateMsg(cfg, qq, message)),
      ...groupTargets.map(gid => sendGroupMsg(cfg, gid, message)),
    ]);

    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length > 0) {
      const reasons = failed.map(f => f.reason instanceof Error ? f.reason.message : String(f.reason));
      return { ok: false, error: reasons.join('; ') };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

import pool, { DB_TYPE } from './db';
import { getSupabaseClient } from './supabase';
import { getRedis, REDIS_TYPE } from './redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { getSetting } from './site-settings';

// buildNotificationMessage 的实现已迁移至 lib/im/templates.ts
// 这里保留 re-export 以兼容现有引用
export { buildNotificationMessage } from './im/templates';
import { buildNotificationMessage } from './im/templates';

const CACHE_KEY = 'onebot:config';
const CACHE_TTL = 300; // 5 分钟

export interface OnebotConfig {
  id: number;
  enabled: boolean;
  http_url: string;
  access_token: string;
  target_qq: string;
  target_group: string;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number;
}

export type NotificationType = 'like' | 'comment' | 'post' | 'email_threshold';

export interface NotificationPayload {
  userId?: number | string;
  username?: string;
  postId?: number | string;
  postTitle?: string;
  content?: string;
  count?: number;
  threshold?: number;
}

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
  }
}

export async function invalidateOnebotCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
  } catch {
  }
}

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

function parseTargets(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export async function sendOnebotMessage(
  cfg: OnebotConfig,
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  if (!cfg.enabled || !cfg.http_url) return;
  if (type === 'like' && !cfg.notify_on_like) return;
  if (type === 'comment' && !cfg.notify_on_comment) return;
  if (type === 'post' && !cfg.notify_on_post) return;
  if (type === 'email_threshold' && cfg.email_threshold <= 0) return;

  const message = await buildNotificationMessage(type, payload);
  const qqTargets = parseTargets(cfg.target_qq);
  const groupTargets = parseTargets(cfg.target_group);

  await Promise.allSettled([
    ...qqTargets.map(qq => sendPrivateMsg(cfg, qq, message)),
    ...groupTargets.map(gid => sendGroupMsg(cfg, gid, message)),
  ]);
}

export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  try {
    const cfg = await getOnebotConfig();
    if (!cfg) return;
    await sendOnebotMessage(cfg, type, payload);
  } catch (e) {
    console.error('[OneBot] sendNotification error:', e);
  }
}

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

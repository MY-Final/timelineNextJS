import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getRedis, REDIS_TYPE } from '@/lib/redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import {
  buildNotificationMessage,
  getOnebotConfig,
  invalidateOnebotCache,
  sendOnebotMessage,
  sendTestNotification as sendOnebotTestNotification,
  type NotificationPayload,
  type NotificationType,
  type OnebotConfig,
} from '@/lib/onebot';

const CACHE_KEY = 'im:config:list';
const CACHE_TTL = 300;

export type ImProviderType = 'onebot' | 'gotify';

interface ImConfigRow {
  id: number;
  type: string;
  enabled: boolean;
  config: unknown;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface ImConfigBase<T extends ImProviderType, C> {
  id: number;
  type: T;
  enabled: boolean;
  config: C;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface GotifyConfigFields {
  server_url: string;
  app_token: string;
  priority: number;
}

export type OnebotImConfig = ImConfigBase<'onebot', {
  http_url: string;
  access_token: string;
  target_qq: string;
  target_group: string;
}>;

export type GotifyImConfig = ImConfigBase<'gotify', GotifyConfigFields>;

export type ImConfig = OnebotImConfig | GotifyImConfig;

export interface ImConfigListResponse {
  items: ImConfig[];
  activeType: ImProviderType | null;
}

export interface UpdateImConfigInput {
  type: ImProviderType;
  enabled?: boolean;
  notify_on_like?: boolean;
  notify_on_comment?: boolean;
  notify_on_post?: boolean;
  email_threshold?: number;
  config?: Record<string, unknown>;
}

export interface SendImTestInput {
  type: ImProviderType;
  config: Record<string, unknown>;
}

const DEFAULT_ONEBOT_CONFIG: OnebotImConfig = {
  id: 0,
  type: 'onebot',
  enabled: false,
  config: {
    http_url: '',
    access_token: '',
    target_qq: '',
    target_group: '',
  },
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_post: true,
  email_threshold: 0,
  sort_order: 1,
};

const DEFAULT_GOTIFY_CONFIG: GotifyImConfig = {
  id: 0,
  type: 'gotify',
  enabled: false,
  config: {
    server_url: '',
    app_token: '',
    priority: 5,
  },
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_post: true,
  email_threshold: 0,
  sort_order: 2,
};

function defaultConfigForType(type: ImProviderType): ImConfig {
  return type === 'onebot'
    ? { ...DEFAULT_ONEBOT_CONFIG, config: { ...DEFAULT_ONEBOT_CONFIG.config } }
    : { ...DEFAULT_GOTIFY_CONFIG, config: { ...DEFAULT_GOTIFY_CONFIG.config } };
}

function parseJsonConfig(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeCommaSeparated(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.split(',').map(item => item.trim()).filter(Boolean).join(',');
}

function normalizeOnebotConfig(config: Record<string, unknown>): OnebotImConfig['config'] {
  return {
    http_url: typeof config.http_url === 'string' ? config.http_url.trim() : '',
    access_token: typeof config.access_token === 'string' ? config.access_token.trim() : '',
    target_qq: normalizeCommaSeparated(config.target_qq),
    target_group: normalizeCommaSeparated(config.target_group),
  };
}

function normalizeGotifyConfig(config: Record<string, unknown>): GotifyConfigFields {
  const priority = Number(config.priority);
  return {
    server_url: typeof config.server_url === 'string' ? config.server_url.trim() : '',
    app_token: typeof config.app_token === 'string' ? config.app_token.trim() : '',
    priority: Number.isFinite(priority) ? priority : 5,
  };
}

function mapImConfigRow(row: ImConfigRow): ImConfig {
  const base = {
    id: row.id,
    enabled: row.enabled,
    notify_on_like: row.notify_on_like,
    notify_on_comment: row.notify_on_comment,
    notify_on_post: row.notify_on_post,
    email_threshold: row.email_threshold,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.type === 'gotify') {
    return {
      ...base,
      type: 'gotify',
      config: normalizeGotifyConfig(parseJsonConfig(row.config)),
    };
  }

  return {
    ...base,
    type: 'onebot',
    config: normalizeOnebotConfig(parseJsonConfig(row.config)),
  };
}

function getSupportedTypes(): ImProviderType[] {
  return ['onebot', 'gotify'];
}

async function cacheGet(): Promise<ImConfig[] | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(CACHE_KEY) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as ImConfig[];
  } catch {
    return null;
  }
}

async function cacheSet(configs: ImConfig[]): Promise<void> {
  try {
    const redis = getRedis();
    const value = JSON.stringify(configs);
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(CACHE_KEY, value, { ex: CACHE_TTL });
    } else {
      await (redis as Redis).set(CACHE_KEY, value, 'EX', CACHE_TTL);
    }
  } catch {
  }
}

export async function invalidateImConfigCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
  } catch {
  }
  await invalidateOnebotCache();
}

async function fetchImConfigRows(): Promise<ImConfigRow[]> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('im_config')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ImConfigRow[];
  }

  const { rows } = await pool.query<ImConfigRow>(
    'SELECT * FROM im_config ORDER BY sort_order ASC, id ASC'
  );
  return rows;
}

export async function getImConfigs(): Promise<ImConfig[]> {
  const cached = await cacheGet();
  if (cached) return cached;

  try {
    const rows = await fetchImConfigRows();
    const mapped = rows.map(mapImConfigRow);
    const byType = new Map(mapped.map(item => [item.type, item]));
    const complete = getSupportedTypes().map(type => byType.get(type) ?? defaultConfigForType(type));
    await cacheSet(complete);
    return complete;
  } catch (error) {
    console.error('[IM] getImConfigs error:', error);
    return getSupportedTypes().map(defaultConfigForType);
  }
}

export async function getImConfigListResponse(): Promise<ImConfigListResponse> {
  const items = await getImConfigs();
  const active = items.find(item => item.enabled) ?? items[0] ?? null;
  return { items, activeType: active?.type ?? null };
}

export async function getEnabledImConfig(): Promise<ImConfig | null> {
  const items = await getImConfigs();
  return items.find(item => item.enabled) ?? null;
}

export async function getLegacyOnebotConfig(): Promise<OnebotConfig | null> {
  const active = await getEnabledImConfig();
  if (active?.type === 'onebot') {
    return toOnebotConfig(active);
  }

  const onebot = (await getImConfigs()).find(item => item.type === 'onebot');
  if (onebot) return toOnebotConfig(onebot);

  return getOnebotConfig();
}

function toOnebotConfig(config: OnebotImConfig): OnebotConfig {
  return {
    id: config.id || 1,
    enabled: config.enabled,
    http_url: config.config.http_url,
    access_token: config.config.access_token,
    target_qq: config.config.target_qq,
    target_group: config.config.target_group,
    notify_on_like: config.notify_on_like,
    notify_on_comment: config.notify_on_comment,
    notify_on_post: config.notify_on_post,
    email_threshold: config.email_threshold,
  };
}

function shouldSend(config: ImConfig, type: NotificationType): boolean {
  if (!config.enabled) return false;
  if (type === 'like') return config.notify_on_like;
  if (type === 'comment') return config.notify_on_comment;
  if (type === 'post') return config.notify_on_post;
  if (type === 'email_threshold') return config.email_threshold > 0;
  return true;
}

async function sendGotifyMessage(
  config: GotifyImConfig,
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  const { server_url, app_token, priority } = config.config;
  if (!server_url || !app_token) return;

  const message = await buildNotificationMessage(type, payload);
  const url = `${server_url.replace(/\/$/, '')}/message`;
  const body = new URLSearchParams();
  body.set('title', 'IM 通知');
  body.set('message', message);
  body.set('priority', String(priority));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Gotify-Key': app_token,
    },
    body,
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gotify HTTP ${res.status}: ${text}`);
  }
}

export async function sendImNotification(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  try {
    const config = await getEnabledImConfig();
    if (!config || !shouldSend(config, type)) return;

    if (config.type === 'gotify') {
      await sendGotifyMessage(config, type, payload);
      return;
    }

    await sendOnebotMessage(toOnebotConfig(config), type, payload);
  } catch (error) {
    console.error('[IM] sendImNotification error:', error);
  }
}

export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  await sendImNotification(type, payload);
}

function getProviderConfig(type: ImProviderType, config: Record<string, unknown>) {
  if (type === 'gotify') {
    return normalizeGotifyConfig(config);
  }
  return normalizeOnebotConfig(config);
}

function isImProviderType(value: string): value is ImProviderType {
  return value === 'onebot' || value === 'gotify';
}

export async function updateImConfig(input: UpdateImConfigInput): Promise<ImConfigListResponse> {
  const type = input.type;
  const currentList = await getImConfigs();
  const current = currentList.find(item => item.type === type) ?? defaultConfigForType(type);
  const nextConfig = getProviderConfig(type, {
    ...current.config,
    ...(input.config ?? {}),
  });
  const nextEnabled = input.enabled ?? current.enabled;
  const nextNotifyOnLike = input.notify_on_like ?? current.notify_on_like;
  const nextNotifyOnComment = input.notify_on_comment ?? current.notify_on_comment;
  const nextNotifyOnPost = input.notify_on_post ?? current.notify_on_post;
  const nextEmailThreshold = input.email_threshold ?? current.email_threshold;

  try {
    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      if (nextEnabled) {
        const { error: disableError } = await supabase
          .from('im_config')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .neq('type', type);
        if (disableError) throw disableError;
      }

      const { error } = await supabase
        .from('im_config')
        .update({
          enabled: nextEnabled,
          config: nextConfig,
          notify_on_like: nextNotifyOnLike,
          notify_on_comment: nextNotifyOnComment,
          notify_on_post: nextNotifyOnPost,
          email_threshold: nextEmailThreshold,
          updated_at: new Date().toISOString(),
        })
        .eq('type', type);
      if (error) throw error;
    } else {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (nextEnabled) {
          await client.query(
            'UPDATE im_config SET enabled = FALSE, updated_at = NOW() WHERE type <> $1',
            [type]
          );
        }
        await client.query(
          `UPDATE im_config
           SET enabled = $1,
               config = $2::jsonb,
               notify_on_like = $3,
               notify_on_comment = $4,
               notify_on_post = $5,
               email_threshold = $6,
               updated_at = NOW()
           WHERE type = $7`,
          [
            nextEnabled,
            JSON.stringify(nextConfig),
            nextNotifyOnLike,
            nextNotifyOnComment,
            nextNotifyOnPost,
            nextEmailThreshold,
            type,
          ]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    await invalidateImConfigCache();
    return getImConfigListResponse();
  } catch (error) {
    console.error('[IM] updateImConfig error:', error);
    throw error;
  }
}

export async function sendImTestNotification(input: SendImTestInput): Promise<{ ok: boolean; error?: string }> {
  if (input.type === 'gotify') {
    const config = normalizeGotifyConfig(input.config);
    if (!config.server_url) return { ok: false, error: '服务地址不能为空' };
    if (!config.app_token) return { ok: false, error: 'App Token 不能为空' };

    try {
      await sendGotifyMessage({
        ...DEFAULT_GOTIFY_CONFIG,
        enabled: true,
        config,
      }, 'post', {
        username: 'System',
        postTitle: 'Gotify 测试消息',
        postId: 'test',
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return sendOnebotTestNotification({
    id: 1,
    enabled: true,
    http_url: typeof input.config.http_url === 'string' ? input.config.http_url.trim() : '',
    access_token: typeof input.config.access_token === 'string' ? input.config.access_token.trim() : '',
    target_qq: normalizeCommaSeparated(input.config.target_qq),
    target_group: normalizeCommaSeparated(input.config.target_group),
    notify_on_like: true,
    notify_on_comment: true,
    notify_on_post: true,
    email_threshold: 0,
  });
}

export function getDefaultImConfigListResponse(): ImConfigListResponse {
  const items = getSupportedTypes().map(defaultConfigForType);
  return {
    items,
    activeType: items[0]?.type ?? null,
  };
}

export function parseImProviderType(value: unknown): ImProviderType | null {
  return typeof value === 'string' && isImProviderType(value) ? value : null;
}

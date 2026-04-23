// ─────────────────────────────────────────────
//  lib/im/types.ts  —  所有 IM 相关类型与默认值
// ─────────────────────────────────────────────

export type ImProviderType = 'onebot' | 'gotify';

export interface GotifyConfigFields {
  server_url: string;
  app_token: string;
  priority: number;
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

export interface ImConfigRow {
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

export const DEFAULT_ONEBOT_CONFIG: OnebotImConfig = {
  id: 0,
  type: 'onebot',
  enabled: false,
  config: { http_url: '', access_token: '', target_qq: '', target_group: '' },
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_post: true,
  email_threshold: 0,
  sort_order: 1,
};

export const DEFAULT_GOTIFY_CONFIG: GotifyImConfig = {
  id: 0,
  type: 'gotify',
  enabled: false,
  config: { server_url: '', app_token: '', priority: 5 },
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_post: true,
  email_threshold: 0,
  sort_order: 2,
};

export function defaultConfigForType(type: ImProviderType): ImConfig {
  return type === 'onebot'
    ? { ...DEFAULT_ONEBOT_CONFIG, config: { ...DEFAULT_ONEBOT_CONFIG.config } }
    : { ...DEFAULT_GOTIFY_CONFIG, config: { ...DEFAULT_GOTIFY_CONFIG.config } };
}

export function getSupportedTypes(): ImProviderType[] {
  return ['onebot', 'gotify'];
}

export function isImProviderType(value: string): value is ImProviderType {
  return value === 'onebot' || value === 'gotify';
}

export function parseImProviderType(value: unknown): ImProviderType | null {
  return typeof value === 'string' && isImProviderType(value) ? value : null;
}

export function normalizeCommaSeparated(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.split(',').map(item => item.trim()).filter(Boolean).join(',');
}

export function parseJsonConfig(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

export function normalizeOnebotConfig(config: Record<string, unknown>): OnebotImConfig['config'] {
  return {
    http_url: typeof config.http_url === 'string' ? config.http_url.trim() : '',
    access_token: typeof config.access_token === 'string' ? config.access_token.trim() : '',
    target_qq: normalizeCommaSeparated(config.target_qq),
    target_group: normalizeCommaSeparated(config.target_group),
  };
}

export function normalizeGotifyConfig(config: Record<string, unknown>): GotifyConfigFields {
  const priority = Number(config.priority);
  return {
    server_url: typeof config.server_url === 'string' ? config.server_url.trim() : '',
    app_token: typeof config.app_token === 'string' ? config.app_token.trim() : '',
    priority: Number.isFinite(priority) ? priority : 5,
  };
}

export function mapImConfigRow(row: ImConfigRow): ImConfig {
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
    return { ...base, type: 'gotify', config: normalizeGotifyConfig(parseJsonConfig(row.config)) };
  }
  return { ...base, type: 'onebot', config: normalizeOnebotConfig(parseJsonConfig(row.config)) };
}

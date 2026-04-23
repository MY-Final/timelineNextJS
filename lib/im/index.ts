// ─────────────────────────────────────────────
//  lib/im/index.ts  —  公开 API 整合入口
// ─────────────────────────────────────────────

export type {
  ImProviderType,
  ImConfig,
  OnebotImConfig,
  GotifyImConfig,
  GotifyConfigFields,
  ImConfigListResponse,
  UpdateImConfigInput,
  SendImTestInput,
} from './types';

export {
  defaultConfigForType,
  getSupportedTypes,
  parseImProviderType,
  isImProviderType,
  normalizeCommaSeparated,
  normalizeGotifyConfig,
  normalizeOnebotConfig,
} from './types';

export { invalidateImConfigCache } from './cache';

export {
  getImConfigs,
  getImConfigListResponse,
  getDefaultImConfigListResponse,
  updateImConfig,
} from './db';

export {
  sendGotifyMessage,
  sendGotifyTestNotification,
} from './gotify';

export {
  type ImTemplate,
  type UpdateImTemplateInput,
  DEFAULT_TEMPLATES,
  TEMPLATE_VARIABLES,
  getImTemplates,
  updateImTemplate,
  previewTemplate,
  buildNotificationMessage,
  invalidateTemplateCache,
} from './templates';

// ── 通知发送 ──────────────────────────────────

import {
  sendOnebotMessage,
  sendTestNotification as sendOnebotTestNotification,
} from '@/lib/onebot';
import type { NotificationType, NotificationPayload, OnebotConfig } from '@/lib/onebot';
import type { ImConfig, OnebotImConfig, GotifyImConfig, SendImTestInput } from './types';
import { normalizeCommaSeparated, normalizeGotifyConfig } from './types';
import { getImConfigs } from './db';
import { sendGotifyMessage, sendGotifyTestNotification } from './gotify';
import { buildNotificationMessage } from './templates';

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

export async function getEnabledImConfig(): Promise<ImConfig | null> {
  const items = await getImConfigs();
  return items.find(item => item.enabled) ?? null;
}

export async function getEnabledImConfigs(): Promise<ImConfig[]> {
  const items = await getImConfigs();
  return items.filter(item => item.enabled);
}

export async function getLegacyOnebotConfig(): Promise<OnebotConfig | null> {
  const active = await getEnabledImConfig();
  if (active?.type === 'onebot') return toOnebotConfig(active as OnebotImConfig);

  const { getOnebotConfig } = await import('@/lib/onebot');
  const onebot = (await getImConfigs()).find(item => item.type === 'onebot');
  if (onebot) return toOnebotConfig(onebot as OnebotImConfig);
  return getOnebotConfig();
}

export async function sendImNotification(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  try {
    const configs = await getEnabledImConfigs();
    const filtered = configs.filter(config => shouldSend(config, type));
    if (filtered.length === 0) return;

    // 渲染一次消息，所有渠道共用
    const message = await buildNotificationMessage(type, payload);

    await Promise.allSettled(
      filtered.map(config => {
        if (config.type === 'gotify') {
          return sendGotifyMessage(config as GotifyImConfig, message);
          }
          return sendOnebotMessage(toOnebotConfig(config as OnebotImConfig), type, payload);
        })
    );
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

export async function sendImTestNotification(
  input: SendImTestInput
): Promise<{ ok: boolean; error?: string }> {
  if (input.type === 'gotify') {
    const config = normalizeGotifyConfig(input.config);
    const message = await buildNotificationMessage('post', {
      username: 'System',
      postTitle: 'Gotify 测试消息',
      postId: 'test',
    });
    return sendGotifyTestNotification(config, message);
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

// ─────────────────────────────────────────────
//  lib/im/gotify.ts  —  Gotify 发送逻辑
// ─────────────────────────────────────────────

import type { GotifyImConfig, GotifyConfigFields } from './types';
import type { NotificationType, NotificationPayload } from '@/lib/onebot';
import { buildNotificationMessage } from './templates';

export async function sendGotifyMessage(
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

export async function sendGotifyTestNotification(
  config: GotifyConfigFields
): Promise<{ ok: boolean; error?: string }> {
  if (!config.server_url) return { ok: false, error: '服务地址不能为空' };
  if (!config.app_token) return { ok: false, error: 'App Token 不能为空' };

  try {
    const url = `${config.server_url.replace(/\/$/, '')}/message`;
    const body = new URLSearchParams();
    body.set('title', 'IM 通知');
    body.set('message', await buildNotificationMessage('post', {
      username: 'System',
      postTitle: 'Gotify 测试消息',
      postId: 'test',
    }));
    body.set('priority', String(config.priority));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Gotify-Key': config.app_token,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Gotify HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

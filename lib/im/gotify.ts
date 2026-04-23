// -------------------------------------------------
//  lib/im/gotify.ts  --  Gotify sending logic
//
//  Note: message string is passed in pre-rendered to avoid
//  a circular dependency with templates.ts
// -------------------------------------------------

import type { GotifyImConfig, GotifyConfigFields } from './types';

async function postToGotify(
  server_url: string,
  app_token: string,
  priority: number,
  message: string
): Promise<void> {
  const url = `${server_url.replace(/\/$/, '')}/message`;
  const body = new URLSearchParams();
  body.set('title', 'IM ֪ͨ');
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

export async function sendGotifyMessage(
  config: GotifyImConfig,
  message: string
): Promise<void> {
  const { server_url, app_token, priority } = config.config;
  if (!server_url || !app_token) return;
  await postToGotify(server_url, app_token, priority, message);
}

export async function sendGotifyTestNotification(
  config: GotifyConfigFields,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  if (!config.server_url) return { ok: false, error: '�����ַ����Ϊ��' };
  if (!config.app_token) return { ok: false, error: 'App Token ����Ϊ��' };

  try {
    await postToGotify(config.server_url, config.app_token, config.priority, message);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

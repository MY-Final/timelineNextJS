// ─────────────────────────────────────────────
//  lib/im/db.ts  —  数据库读写操作
// ─────────────────────────────────────────────

import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import {
  type ImConfig,
  type ImConfigRow,
  type ImConfigListResponse,
  type UpdateImConfigInput,
  defaultConfigForType,
  getSupportedTypes,
  normalizeOnebotConfig,
  normalizeGotifyConfig,
  mapImConfigRow,
} from './types';
import { cacheGet, cacheSet, invalidateImConfigCache } from './cache';

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

export function getDefaultImConfigListResponse(): ImConfigListResponse {
  const items = getSupportedTypes().map(defaultConfigForType);
  return { items, activeType: items[0]?.type ?? null };
}

function getProviderConfig(type: UpdateImConfigInput['type'], config: Record<string, unknown>) {
  return type === 'gotify' ? normalizeGotifyConfig(config) : normalizeOnebotConfig(config);
}

export async function updateImConfig(input: UpdateImConfigInput): Promise<ImConfigListResponse> {
  const { type } = input;
  const currentList = await getImConfigs();
  const current = currentList.find(item => item.type === type) ?? defaultConfigForType(type);

  const nextConfig = getProviderConfig(type, { ...current.config, ...(input.config ?? {}) });
  const nextEnabled = input.enabled ?? current.enabled;
  const nextNotifyOnLike = input.notify_on_like ?? current.notify_on_like;
  const nextNotifyOnComment = input.notify_on_comment ?? current.notify_on_comment;
  const nextNotifyOnPost = input.notify_on_post ?? current.notify_on_post;
  const nextEmailThreshold = input.email_threshold ?? current.email_threshold;

  try {
    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
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
          [nextEnabled, JSON.stringify(nextConfig), nextNotifyOnLike, nextNotifyOnComment, nextNotifyOnPost, nextEmailThreshold, type]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
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

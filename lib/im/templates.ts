// ─────────────────────────────────────────────
//  lib/im/templates.ts  —  通知消息模版
//
//  可用变量（全类型通用）：
//    {site_name}  站点名称
//    {time}       当前时间（上海时区）
//    {username}   操作用户名
//    {post_title} 帖子标题
//    {content}    评论内容（comment 类型）
//    {count}      今日邮件数（email_threshold 类型）
//    {threshold}  阈值（email_threshold 类型）
// ─────────────────────────────────────────────

import pool, { DB_TYPE } from '@/lib/db';
import { getSupabaseClient } from '@/lib/supabase';
import { getRedis, REDIS_TYPE } from '@/lib/redis';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { getSetting } from '@/lib/site-settings';
import type { NotificationType, NotificationPayload } from '@/lib/onebot';

// ── 类型 ─────────────────────────────────────

export interface ImTemplate {
  type: NotificationType;
  template: string;
  enabled: boolean;
  updated_at?: string;
}

export interface UpdateImTemplateInput {
  type: NotificationType;
  template: string;
  enabled: boolean;
}

// ── 内置默认模版 ──────────────────────────────

export const DEFAULT_TEMPLATES: Record<NotificationType, string> = {
  like:            '[{site_name}] 新点赞通知\n时间：{time}\n用户 {username} 赞了帖子「{post_title}」',
  comment:         '[{site_name}] 新评论通知\n时间：{time}\n用户 {username} 评论了帖子「{post_title}」：\n{content}',
  post:            '[{site_name}] 新帖子通知\n时间：{time}\n用户 {username} 发布了帖子「{post_title}」',
  email_threshold: '[{site_name}] 邮件发送量预警\n时间：{time}\n今日邮件发送量已达 {count} 封，超过阈值 {threshold} 封',
};

// 每个事件类型的可用变量说明（供前端展示）
export const TEMPLATE_VARIABLES: Record<NotificationType, { name: string; desc: string }[]> = {
  like: [
    { name: '{site_name}', desc: '站点名称' },
    { name: '{time}',      desc: '当前时间' },
    { name: '{username}',  desc: '点赞用户' },
    { name: '{post_title}',desc: '帖子标题' },
  ],
  comment: [
    { name: '{site_name}', desc: '站点名称' },
    { name: '{time}',      desc: '当前时间' },
    { name: '{username}',  desc: '评论用户' },
    { name: '{post_title}',desc: '帖子标题' },
    { name: '{content}',   desc: '评论内容' },
  ],
  post: [
    { name: '{site_name}', desc: '站点名称' },
    { name: '{time}',      desc: '当前时间' },
    { name: '{username}',  desc: '发布用户' },
    { name: '{post_title}',desc: '帖子标题' },
  ],
  email_threshold: [
    { name: '{site_name}', desc: '站点名称' },
    { name: '{time}',      desc: '当前时间' },
    { name: '{count}',     desc: '今日邮件数' },
    { name: '{threshold}', desc: '预警阈值' },
  ],
};

// ── 缓存 ──────────────────────────────────────

const TEMPLATE_CACHE_KEY = 'im:templates';
const TEMPLATE_CACHE_TTL = 300;

async function templateCacheGet(): Promise<ImTemplate[] | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEMPLATE_CACHE_KEY) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as ImTemplate[];
  } catch {
    return null;
  }
}

async function templateCacheSet(templates: ImTemplate[]): Promise<void> {
  try {
    const redis = getRedis();
    const value = JSON.stringify(templates);
    if (REDIS_TYPE === 'upstash') {
      await (redis as UpstashRedis).set(TEMPLATE_CACHE_KEY, value, { ex: TEMPLATE_CACHE_TTL });
    } else {
      await (redis as Redis).set(TEMPLATE_CACHE_KEY, value, 'EX', TEMPLATE_CACHE_TTL);
    }
  } catch {}
}

export async function invalidateTemplateCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(TEMPLATE_CACHE_KEY);
  } catch {}
}

// ── DB 读写 ───────────────────────────────────

const ALL_TYPES: NotificationType[] = ['like', 'comment', 'post', 'email_threshold'];

function toDefaultTemplate(type: NotificationType): ImTemplate {
  return { type, template: DEFAULT_TEMPLATES[type], enabled: true };
}

export async function getImTemplates(): Promise<ImTemplate[]> {
  const cached = await templateCacheGet();
  if (cached) return cached;

  try {
    let rows: ImTemplate[] = [];

    if (DB_TYPE === 'supabase') {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('im_notification_templates')
        .select('type, template, enabled, updated_at');
      if (error) throw error;
      rows = (data ?? []) as ImTemplate[];
    } else {
      const { rows: dbRows } = await pool.query<ImTemplate>(
        'SELECT type, template, enabled, updated_at FROM im_notification_templates'
      );
      rows = dbRows;
    }

    const byType = new Map(rows.map(r => [r.type, r]));
    const complete = ALL_TYPES.map(t => byType.get(t) ?? toDefaultTemplate(t));
    await templateCacheSet(complete);
    return complete;
  } catch (error) {
    console.error('[IM] getImTemplates error:', error);
    return ALL_TYPES.map(toDefaultTemplate);
  }
}

export async function updateImTemplate(input: UpdateImTemplateInput): Promise<ImTemplate[]> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('im_notification_templates')
      .upsert({
        type: input.type,
        template: input.template,
        enabled: input.enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'type' });
    if (error) throw error;
  } else {
    await pool.query(
      `INSERT INTO im_notification_templates (type, template, enabled, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (type) DO UPDATE
         SET template = EXCLUDED.template,
             enabled = EXCLUDED.enabled,
             updated_at = NOW()`,
      [input.type, input.template, input.enabled]
    );
  }

  await invalidateTemplateCache();
  return getImTemplates();
}

// ── 渲染 ──────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// 模拟数据，用于预览
export async function previewTemplate(
  type: NotificationType,
  templateOverride?: string
): Promise<string> {
  const templates = await getImTemplates();
  const record = templates.find(t => t.type === type);
  const tpl = templateOverride ?? (record?.enabled ? record.template : DEFAULT_TEMPLATES[type]);

  const siteName = await getSetting('site_name').catch(() => 'Our Story');
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const mockVars: Record<string, string> = {
    site_name:  siteName,
    time:       now,
    username:   '示例用户',
    post_title: '今天天气真好',
    content:    '这篇文章写得很好！',
    count:      '128',
    threshold:  '100',
  };

  return renderTemplate(tpl, mockVars);
}

// ── 核心：构建通知消息 ─────────────────────────

export async function buildNotificationMessage(
  type: NotificationType,
  payload: NotificationPayload
): Promise<string> {
  const templates = await getImTemplates();
  const record = templates.find(t => t.type === type);

  const siteName = await getSetting('site_name').catch(() => 'Our Story');
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 如果启用了自定义模版，使用它；否则使用内置默认逻辑
  if (record?.enabled && record.template) {
    return renderTemplate(record.template, {
      site_name:  siteName,
      time:       now,
      username:   String(payload.username ?? payload.userId ?? ''),
      post_title: String(payload.postTitle ?? payload.postId ?? ''),
      content:    String(payload.content ?? ''),
      count:      String(payload.count ?? ''),
      threshold:  String(payload.threshold ?? ''),
    });
  }

  // 内置 fallback（与 onebot.ts 原始逻辑一致）
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

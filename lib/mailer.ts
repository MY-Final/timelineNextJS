import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import path from 'path';
import pool from './db';
import { getSetting } from './site-settings';

export interface EmailAccount {
  id: number;
  name: string;
  provider?: string; // 'smtp' | 'resend'，默认 'smtp'
  host: string;
  port: number;
  secure: boolean;
  user_addr: string;
  password: string;
  from_name: string;
  is_active: boolean;
  use_for_reg: boolean;
  use_for_pwd: boolean;
}

const TEMPLATE_FILE = path.join(process.cwd(), 'data', 'email-templates.json');

interface TemplateDef {
  useCustom: boolean;
  customSubject: string;
  customHtml: string;
}

async function getTemplate(type: 'register' | 'reset'): Promise<TemplateDef> {
  try {
    const raw = await readFile(TEMPLATE_FILE, 'utf-8');
    const store = JSON.parse(raw);
    return store[type] ?? { useCustom: false, customSubject: '', customHtml: '' };
  } catch {
    return { useCustom: false, customSubject: '', customHtml: '' };
  }
}

/** 默认注册验证码 HTML 模板 */
export function defaultOtpHtml(code: string, title: string, action: string, siteName = 'Our Story'): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff5f7; border-radius: 16px;">
      <h2 style="color: #c0446a; margin: 0 0 16px; font-size: 20px;">${siteName} — ${title}</h2>
      <p style="color: #6b5060; font-size: 14px; line-height: 1.8; margin: 0 0 24px;">
        您正在${action}，验证码如下，<strong>有效期 5 分钟</strong>，请勿泄露给他人。
      </p>
      <div style="background: #fff; border: 2px solid #f9a8c9; border-radius: 12px; text-align: center; padding: 20px 0; margin: 0 0 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #c0446a;">${code}</span>
      </div>
      <p style="color: #b090a8; font-size: 12px; margin: 0;">
        如非本人操作，请忽略此邮件。
      </p>
    </div>
  `;
}

/** 将模板中的占位符替换为实际值 */
function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * 获取指定用途的活跃邮箱账号（取第一个）
 * purpose: 'reg' | 'pwd'
 */
export async function getActiveAccount(purpose: 'reg' | 'pwd'): Promise<EmailAccount | null> {
  const col = purpose === 'reg' ? 'use_for_reg' : 'use_for_pwd';
  const result = await pool.query<EmailAccount>(
    `SELECT * FROM email_accounts WHERE is_active = TRUE AND ${col} = TRUE ORDER BY id LIMIT 1`
  );
  return result.rows[0] ?? null;
}

/** 发送邮件，传入账号配置 */
export async function sendMail(
  account: EmailAccount,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const provider = account.provider ?? 'smtp';

  if (provider === 'resend') {
    const resend = new Resend(account.password);
    const from = account.from_name
      ? `${account.from_name} <${account.user_addr}>`
      : account.user_addr;
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) throw new Error(error.message);
    return;
  }

  // SMTP（默认）
  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.user_addr, pass: account.password },
  });

  await transporter.sendMail({
    from: account.from_name
      ? `"${account.from_name}" <${account.user_addr}>`
      : account.user_addr,
    to,
    subject,
    html,
  });
}

/** 发送验证码邮件 */
export async function sendOtpMail(
  to: string,
  code: string,
  purpose: 'register' | 'reset'
): Promise<{ success: boolean; message: string }> {
  const account = await getActiveAccount(purpose === 'register' ? 'reg' : 'pwd');
  if (!account) {
    return { success: false, message: '暂无可用的发件邮箱，请联系管理员配置' };
  }

  const siteName = await getSetting('site_name');
  const title = purpose === 'register' ? '注册验证码' : '密码重置验证码';
  const action = purpose === 'register' ? '完成注册' : '重置密码';

  const tpl = await getTemplate(purpose);
  let subject = `【${siteName}】${title}`;
  let html: string;

  if (tpl.useCustom && tpl.customHtml) {
    const vars = { code, title, action, site: siteName };
    html = renderTemplate(tpl.customHtml, vars);
    if (tpl.customSubject) {
      subject = renderTemplate(tpl.customSubject, vars);
    }
  } else {
    html = defaultOtpHtml(code, title, action, siteName);
  }

  try {
    await sendMail(account, to, subject, html);
    return { success: true, message: '验证码已发送' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Mailer] send error:', msg);
    return { success: false, message: `邮件发送失败：${msg}` };
  }
}

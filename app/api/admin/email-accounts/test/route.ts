import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import pool from "@/lib/db";
import { errorResponse, successResponse, ResultCode } from "@/lib/result";
import nodemailer from "nodemailer";
import { defaultOtpHtml } from "@/lib/mailer";
import { readFile } from "fs/promises";
import path from "path";

const TEMPLATE_FILE = path.join(process.cwd(), "data", "email-templates.json");

interface TemplateDef {
  useCustom: boolean;
  customSubject: string;
  customHtml: string;
}

async function getTemplate(type: "register" | "reset"): Promise<TemplateDef> {
  try {
    const raw = await readFile(TEMPLATE_FILE, "utf-8");
    const store = JSON.parse(raw);
    return store[type] ?? { useCustom: false, customSubject: "", customHtml: "" };
  } catch {
    return { useCustom: false, customSubject: "", customHtml: "" };
  }
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权操作");

  const { account_id, to, template_type } = await request.json();
  if (!account_id || !to) return errorResponse(ResultCode.BAD_REQUEST, "缺少参数");

  const { rows } = await pool.query(
    `SELECT * FROM email_accounts WHERE id = $1`,
    [account_id]
  );
  if (rows.length === 0) return errorResponse(ResultCode.NOT_FOUND, "账号不存在");

  const acc = rows[0];

  // 决定邮件内容
  const type: "register" | "reset" = template_type === "reset" ? "reset" : "register";
  const title = type === "register" ? "注册验证码" : "密码重置验证码";
  const action = type === "register" ? "完成注册" : "重置密码";
  const previewCode = "AB1234";

  const tpl = await getTemplate(type);
  let subject = `【Our Story】${title} — 测试预览`;
  let html: string;

  if (tpl.useCustom && tpl.customHtml) {
    const vars = { code: previewCode, title, action, site: "Our Story" };
    html = renderTemplate(tpl.customHtml, vars);
    if (tpl.customSubject) subject = renderTemplate(tpl.customSubject, vars) + " — 测试预览";
  } else {
    html = defaultOtpHtml(previewCode, title, action);
  }

  try {
    const transport = nodemailer.createTransport({
      host: acc.host,
      port: acc.port,
      secure: acc.secure,
      auth: { user: acc.user_addr, pass: acc.password },
    });

    await transport.sendMail({
      from: acc.from_name ? `"${acc.from_name}" <${acc.user_addr}>` : acc.user_addr,
      to,
      subject,
      html,
    });

    return successResponse({ message: "测试邮件发送成功" }, "发送成功");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "发送失败";
    return errorResponse(ResultCode.UPSTREAM_ERROR, `发送失败：${message}`);
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import pool from "@/lib/db";
import { errorResponse, successResponse, ResultCode } from "@/lib/result";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "无权操作");

  const { account_id, to } = await request.json();
  if (!account_id || !to) return errorResponse(ResultCode.BAD_REQUEST, "缺少参数");

  const { rows } = await pool.query(
    `SELECT * FROM email_accounts WHERE id = $1`,
    [account_id]
  );
  if (rows.length === 0) return errorResponse(ResultCode.NOT_FOUND, "账号不存在");

  const acc = rows[0];

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
      subject: "【测试邮件】SMTP 配置验证",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #eee;border-radius:12px">
          <h2 style="color:#c0446a;margin:0 0 16px">✅ SMTP 配置验证成功</h2>
          <p style="color:#555;line-height:1.7">
            这是一封测试邮件，说明账号 <strong>${acc.name}</strong>（<code>${acc.user_addr}</code>）的 SMTP 配置正确，可以正常发送邮件。
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
          <p style="font-size:12px;color:#aaa">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
    });

    return successResponse({ message: "测试邮件发送成功" }, "发送成功");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "发送失败";
    return errorResponse(ResultCode.UPSTREAM_ERROR, `发送失败：${message}`);
  }
}

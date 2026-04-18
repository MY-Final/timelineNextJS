import { NextRequest } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse, ResultCode } from "@/lib/result";

const TEMPLATE_FILE = path.join(process.cwd(), "data", "email-templates.json");

interface TemplateDef {
  useCustom: boolean;
  customSubject: string;
  customHtml: string;
}

interface TemplateStore {
  register: TemplateDef;
  reset: TemplateDef;
}

async function readTemplates(): Promise<TemplateStore> {
  try {
    const raw = await readFile(TEMPLATE_FILE, "utf-8");
    return JSON.parse(raw) as TemplateStore;
  } catch {
    return {
      register: { useCustom: false, customSubject: "", customHtml: "" },
      reset: { useCustom: false, customSubject: "", customHtml: "" },
    };
  }
}

async function writeTemplates(data: TemplateStore): Promise<void> {
  await writeFile(TEMPLATE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/** GET /api/admin/email-templates */
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "仅超级管理员可操作");

  const templates = await readTemplates();
  return successResponse(templates);
}

/** PUT /api/admin/email-templates */
export async function PUT(request: NextRequest) {
  const auth = getAuthUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "superadmin") return errorResponse(ResultCode.FORBIDDEN, "仅超级管理员可操作");

  const body = await request.json();
  const { type, useCustom, customSubject, customHtml } = body as {
    type: "register" | "reset";
    useCustom: boolean;
    customSubject: string;
    customHtml: string;
  };

  if (!["register", "reset"].includes(type)) {
    return errorResponse(ResultCode.BAD_REQUEST, "type 参数无效");
  }

  const templates = await readTemplates();
  templates[type] = {
    useCustom: !!useCustom,
    customSubject: customSubject ?? "",
    customHtml: customHtml ?? "",
  };
  await writeTemplates(templates);

  return successResponse(templates[type], "模板已保存");
}

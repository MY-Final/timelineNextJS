import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { randomUUID } from 'crypto';
import path from 'path';

export const runtime = 'nodejs';

/** 允许的 MIME 类型 */
const ALLOWED_TYPES = new Set([
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // 视频
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // 音频
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
]);
/** 预签名 URL 有效期（秒） */
const PRESIGN_EXPIRES = 300; // 5 分钟

/**
 * POST /api/upload/presign
 * 请求体（JSON）：{ filename: string, contentType: string }
 * 返回：{ uploadUrl, key, publicUrl }
 *   - uploadUrl：直接 PUT 到 R2 的预签名地址（5 分钟有效）
 *   - key：文件在 R2 中的路径
 *   - publicUrl：上传完成后的访问地址（需配置 R2_PUBLIC_URL）
 */
export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  let body: { filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(ResultCode.BAD_REQUEST, '请求体格式错误，需要 JSON：{ filename, contentType }');
  }

  const { filename, contentType } = body;
  if (!filename || !contentType) {
    return errorResponse(ResultCode.BAD_REQUEST, 'filename 和 contentType 不能为空');
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return errorResponse(
      ResultCode.BAD_REQUEST,
      `不支持的文件类型：${contentType}，仅允许图片(jpeg/png/gif/webp)、视频(mp4/mov/webm)、音频(mp3/wav/ogg)`
    );
  }

  const ext = path.extname(filename).toLowerCase() || '.jpg';
  const today = new Date().toISOString().slice(0, 10);
  const key = `uploads/${today}/${randomUUID()}${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET(),
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGN_EXPIRES,
    });

    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
      : key;

    return successResponse({ uploadUrl, key, publicUrl }, '预签名地址生成成功');
  } catch (err) {
    console.error('[R2 Presign Error]', err);
    return errorResponse(ResultCode.UPSTREAM_ERROR, '生成上传地址失败，请检查 R2 配置');
  }
}


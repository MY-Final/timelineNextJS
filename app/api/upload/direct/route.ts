import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2';
import { getAuthUser } from '@/lib/auth';
import { ResultCode, successResponse, errorResponse } from '@/lib/result';
import { randomUUID } from 'crypto';
import path from 'path';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
]);

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (authUser instanceof NextResponse) return authUser;
  if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
    return errorResponse(ResultCode.FORBIDDEN, '权限不足');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('[Upload formData Error]', err);
    return errorResponse(ResultCode.BAD_REQUEST, '请求格式错误，需要 multipart/form-data');
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return errorResponse(ResultCode.BAD_REQUEST, '未找到 file 字段');
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(
      ResultCode.BAD_REQUEST,
      `不支持的文件类型：${file.type}`
    );
  }

  if (file.size > MAX_SIZE) {
    return errorResponse(ResultCode.BAD_REQUEST, '文件超过 50 MB 限制');
  }

  const ext = path.extname(file.name).toLowerCase() || '.bin';
  const today = new Date().toISOString().slice(0, 10);
  const key = `uploads/${today}/${randomUUID()}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET(),
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
      })
    );
  } catch (err) {
    console.error('[R2 Upload Error]', err);
    return errorResponse(ResultCode.UPSTREAM_ERROR, '上传到 R2 失败，请稍后重试');
  }

  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
    : key;

  return successResponse({ key, url: publicUrl }, '上传成功');
}

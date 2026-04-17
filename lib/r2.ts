import { S3Client } from '@aws-sdk/client-s3';

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2Client) {
    if (
      !process.env.R2_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME
    ) {
      throw new Error('缺少 Cloudflare R2 环境变量配置：R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME');
    }
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _r2Client;
}

export const R2_BUCKET = () => {
  if (!process.env.R2_BUCKET_NAME) throw new Error('缺少 R2_BUCKET_NAME 环境变量');
  return process.env.R2_BUCKET_NAME;
};

/** 公开访问域名（可选，用于拼接文件 URL）。自动补全 https:// 协议前缀。 */
function normalizePublicUrl(raw: string | undefined): string {
  if (!raw) return '';
  raw = raw.trim().replace(/\/$/, '');
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}
export const R2_PUBLIC_URL = normalizePublicUrl(process.env.R2_PUBLIC_URL);

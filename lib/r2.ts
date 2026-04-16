import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getR2() {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { R2: R2Bucket }).R2;
}

/**
 * Upload a file buffer to R2 and return the public URL.
 * Assumes the bucket has a public domain configured via Cloudflare R2 public access.
 */
export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string,
  publicDomain: string
): Promise<string> {
  const r2 = await getR2();
  await r2.put(key, body, {
    httpMetadata: { contentType },
  });
  return `${publicDomain}/${key}`;
}

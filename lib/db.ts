import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Post {
  id: number;
  date: string;
  title: string;
  description: string;
  location: string;
  tags: string[];
  hidden: number;
  deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: number;
  post_id: number;
  url: string;
  order: number;
}

export interface PostWithImages extends Post {
  images: Image[];
}

function parsePost(row: Record<string, unknown>): Post {
  return {
    ...(row as unknown as Post),
    tags: JSON.parse((row.tags as string) || "[]"),
  };
}

export async function getDB() {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}

export async function getAllPosts(includeHidden = false): Promise<PostWithImages[]> {
  const db = await getDB();
  let query = "SELECT * FROM posts WHERE deleted = 0";
  if (!includeHidden) query += " AND hidden = 0";
  query += " ORDER BY date DESC";

  const postsResult = await db.prepare(query).all();
  const posts = (postsResult.results as Record<string, unknown>[]).map(parsePost);

  if (posts.length === 0) return [];

  const ids = posts.map((p) => p.id).join(",");
  const imagesResult = await db
    .prepare(`SELECT * FROM images WHERE post_id IN (${ids}) ORDER BY "order" ASC`)
    .all();
  const images = imagesResult.results as unknown as Image[];

  const imageMap = new Map<number, Image[]>();
  for (const img of images) {
    if (!imageMap.has(img.post_id)) imageMap.set(img.post_id, []);
    imageMap.get(img.post_id)!.push(img);
  }

  return posts.map((p) => ({ ...p, images: imageMap.get(p.id) ?? [] }));
}

export async function getPostById(id: number): Promise<PostWithImages | null> {
  const db = await getDB();
  const row = await db.prepare("SELECT * FROM posts WHERE id = ? AND deleted = 0").bind(id).first();
  if (!row) return null;
  const post = parsePost(row as Record<string, unknown>);
  const imagesResult = await db
    .prepare(`SELECT * FROM images WHERE post_id = ? ORDER BY "order" ASC`)
    .bind(id)
    .all();
  return { ...post, images: imagesResult.results as unknown as Image[] };
}

export async function createPost(data: Omit<Post, "id" | "hidden" | "deleted" | "created_at" | "updated_at">) {
  const db = await getDB();
  const tags = JSON.stringify(data.tags);
  const result = await db
    .prepare(
      "INSERT INTO posts (date, title, description, location, tags) VALUES (?, ?, ?, ?, ?) RETURNING id"
    )
    .bind(data.date, data.title, data.description, data.location, tags)
    .first<{ id: number }>();
  return result!.id;
}

export async function updatePost(id: number, data: Partial<Omit<Post, "id" | "deleted" | "created_at" | "updated_at">>) {
  const db = await getDB();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.date !== undefined) { fields.push("date = ?"); values.push(data.date); }
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.location !== undefined) { fields.push("location = ?"); values.push(data.location); }
  if (data.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(data.tags)); }
  if (data.hidden !== undefined) { fields.push("hidden = ?"); values.push(data.hidden); }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function softDeletePost(id: number) {
  const db = await getDB();
  await db.prepare("UPDATE posts SET deleted = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run();
}

export async function addImage(postId: number, url: string, order = 0) {
  const db = await getDB();
  const result = await db
    .prepare("INSERT INTO images (post_id, url, \"order\") VALUES (?, ?, ?) RETURNING id")
    .bind(postId, url, order)
    .first<{ id: number }>();
  return result!.id;
}

export async function deleteImage(id: number) {
  const db = await getDB();
  await db.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
}

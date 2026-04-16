import { NextResponse } from "next/server";
import { getPostById, updatePost, softDeletePost, addImage, deleteImage } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(Number(id));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json() as {
    date?: string; title?: string; description?: string;
    location?: string; tags?: string[]; images?: string[];
  };
  const { date, title, description, location, tags, images } = body;

  try {
    await updatePost(Number(id), { date, title, description, location, tags });

    if (Array.isArray(images)) {
      const post = await getPostById(Number(id));
      if (post) {
        for (const img of post.images) {
          await deleteImage(img.id);
        }
        for (let i = 0; i < images.length; i++) {
          await addImage(Number(id), images[i], i);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  try {
    await softDeletePost(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}

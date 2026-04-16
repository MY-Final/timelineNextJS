import { NextResponse } from "next/server";
import { getPostById, updatePost } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  try {
    const post = await getPostById(Number(id));
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await updatePost(Number(id), { hidden: post.hidden ? 0 : 1 });
    return NextResponse.json({ hidden: !post.hidden });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to toggle hidden" }, { status: 500 });
  }
}

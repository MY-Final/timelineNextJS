import { NextResponse } from "next/server";
import { getAllPosts, createPost, addImage } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const posts = await getAllPosts(false);
    return NextResponse.json(posts);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { date, title, description, location = "", tags = [], images = [] } = body as {
      date: string; title: string; description: string;
      location?: string; tags?: string[]; images?: string[];
    };

    if (!date || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createPost({ date, title, description, location, tags });

    for (let i = 0; i < images.length; i++) {
      await addImage(id, images[i], i);
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

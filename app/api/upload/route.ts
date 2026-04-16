import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = await file.arrayBuffer();

    const publicDomain = process.env.R2_PUBLIC_DOMAIN ?? "";
    if (!publicDomain) {
      return NextResponse.json({ error: "R2_PUBLIC_DOMAIN not configured" }, { status: 500 });
    }

    const url = await uploadToR2(key, buffer, file.type, publicDomain);
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

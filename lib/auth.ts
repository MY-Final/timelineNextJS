import { NextResponse } from "next/server";
import { getSession } from "./session";

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

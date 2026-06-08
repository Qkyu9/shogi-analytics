import { NextResponse } from "next/server";
import { ensureSupabaseUser } from "@/lib/supabase/auth-helpers";

export async function POST() {
  try {
    const user = await ensureSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    console.error("auth/sync error:", error);
    return NextResponse.json(
      { error: "ユーザー同期に失敗しました" },
      { status: 500 }
    );
  }
}

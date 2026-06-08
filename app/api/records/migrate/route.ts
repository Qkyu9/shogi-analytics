import { NextResponse } from "next/server";
import type { GameRecordDetail } from "@/app/lib/types";
import { migrateGameRecords } from "@/lib/data/game-records";
import { ensureSupabaseUser } from "@/lib/supabase/auth-helpers";

export async function POST(request: Request) {
  try {
    const user = await ensureSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { records?: GameRecordDetail[] };
    const records = body.records ?? [];
    if (records.length === 0) {
      return NextResponse.json({ imported: 0 });
    }

    const imported = await migrateGameRecords(user.id, records);
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("POST /api/records/migrate error:", error);
    return NextResponse.json(
      { error: "記録の移行に失敗しました" },
      { status: 500 }
    );
  }
}

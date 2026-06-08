import { NextResponse } from "next/server";
import type { GameRecordDraft } from "@/app/lib/types";
import {
  insertGameRecord,
  listGameRecordSummaries,
} from "@/lib/data/game-records";
import {
  ensureSupabaseUser,
  getSupabaseUserByClerkId,
} from "@/lib/supabase/auth-helpers";

export async function GET() {
  try {
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const records = await listGameRecordSummaries(user.id);
    return NextResponse.json({ records });
  } catch (error) {
    console.error("GET /api/records error:", error);
    return NextResponse.json(
      { error: "記録一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const draft = (await request.json()) as GameRecordDraft;
    const detail = await insertGameRecord(user.id, draft);
    return NextResponse.json({ record: detail });
  } catch (error) {
    console.error("POST /api/records error:", error);
    return NextResponse.json(
      { error: "記録の保存に失敗しました" },
      { status: 500 }
    );
  }
}

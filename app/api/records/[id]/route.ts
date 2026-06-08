import { NextResponse } from "next/server";
import type { GameRecordDraft } from "@/app/lib/types";
import {
  deleteGameRecord,
  getGameRecordDetail,
  updateGameRecord,
} from "@/lib/data/game-records";
import { getSupabaseUserByClerkId } from "@/lib/supabase/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await getGameRecordDetail(user.id, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error("GET /api/records/[id] error:", error);
    return NextResponse.json(
      { error: "記録の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const draft = (await request.json()) as GameRecordDraft;
    const record = await updateGameRecord(user.id, id, draft);
    return NextResponse.json({ record });
  } catch (error) {
    console.error("PATCH /api/records/[id] error:", error);
    return NextResponse.json(
      { error: "記録の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteGameRecord(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/records/[id] error:", error);
    return NextResponse.json(
      { error: "記録の削除に失敗しました" },
      { status: 500 }
    );
  }
}

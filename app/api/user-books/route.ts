import { NextResponse } from "next/server";
import { BOOK_CATALOG } from "@/app/lib/book-catalog";
import {
  listOwnedBookIds,
  replaceOwnedBookIds,
} from "@/lib/data/user-owned-books";
import {
  ensureSupabaseUser,
  getSupabaseUserByClerkId,
} from "@/lib/supabase/auth-helpers";

const VALID_BOOK_IDS = new Set(BOOK_CATALOG.map((b) => b.id));

export async function GET() {
  try {
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const bookIds = await listOwnedBookIds(user.id);
    return NextResponse.json({ bookIds });
  } catch (error) {
    console.error("GET /api/user-books error:", error);
    return NextResponse.json(
      { error: "購入済み棋書の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await ensureSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { bookIds?: string[] };
    const raw = Array.isArray(body.bookIds) ? body.bookIds : [];
    const bookIds = raw.filter((id) => VALID_BOOK_IDS.has(id));
    const saved = await replaceOwnedBookIds(user.id, bookIds);
    return NextResponse.json({ bookIds: saved });
  } catch (error) {
    console.error("PUT /api/user-books error:", error);
    return NextResponse.json(
      { error: "購入済み棋書の保存に失敗しました" },
      { status: 500 }
    );
  }
}

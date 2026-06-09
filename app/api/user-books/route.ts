import { NextResponse } from "next/server";
import { BOOK_CATEGORY_OPTIONS, type BookCategory } from "@/app/lib/book-catalog";
import {
  listOwnedBooks,
  replaceOwnedBooks,
  type OwnedBookInput,
} from "@/lib/data/user-owned-books";
import {
  ensureSupabaseUser,
  getSupabaseUserByClerkId,
} from "@/lib/supabase/auth-helpers";

function parseBooks(body: { books?: unknown }): OwnedBookInput[] {
  if (!Array.isArray(body.books)) return [];
  const valid = new Set(BOOK_CATEGORY_OPTIONS);
  return body.books
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? "").trim();
      const category = String(row.category ?? "").trim() as BookCategory;
      if (!title || !valid.has(category)) return null;
      return {
        title,
        category,
        studyAction: String(row.studyAction ?? "").trim(),
        autoClassified: row.autoClassified !== false,
      };
    })
    .filter((book): book is OwnedBookInput => book !== null);
}

export async function GET() {
  try {
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const books = await listOwnedBooks(user.id);
    return NextResponse.json({ books });
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

    const body = (await request.json()) as { books?: unknown };
    const books = parseBooks(body);
    const saved = await replaceOwnedBooks(user.id, books);
    return NextResponse.json({ books: saved });
  } catch (error) {
    console.error("PUT /api/user-books error:", error);
    return NextResponse.json(
      { error: "購入済み棋書の保存に失敗しました" },
      { status: 500 }
    );
  }
}

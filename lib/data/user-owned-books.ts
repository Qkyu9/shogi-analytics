import type { BookCategory } from "@/app/lib/book-catalog";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OwnedBookRow = {
  id: string;
  title: string;
  category: BookCategory;
  studyAction: string;
  autoClassified: boolean;
};

type DbOwnedBook = {
  id: string;
  title: string | null;
  category: string | null;
  study_action: string | null;
  auto_classified: boolean | null;
  book_id: string | null;
};

const VALID_CATEGORIES = new Set([
  "tsumeshogi",
  "opening",
  "midgame",
  "endgame",
  "defense",
  "general",
]);

function toRow(row: DbOwnedBook): OwnedBookRow | null {
  const title = row.title?.trim();
  const category = row.category?.trim();
  if (!title || !category || !VALID_CATEGORIES.has(category)) return null;
  return {
    id: row.id,
    title,
    category: category as BookCategory,
    studyAction: row.study_action?.trim() ?? "",
    autoClassified: row.auto_classified ?? true,
  };
}

export async function listOwnedBooks(userId: string): Promise<OwnedBookRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_owned_books")
    .select("id, title, category, study_action, auto_classified, book_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? [])
    .map((row) => toRow(row as DbOwnedBook))
    .filter((row): row is OwnedBookRow => row !== null);
}

export type OwnedBookInput = {
  title: string;
  category: BookCategory;
  studyAction: string;
  autoClassified: boolean;
};

export async function replaceOwnedBooks(
  userId: string,
  books: OwnedBookInput[]
): Promise<OwnedBookRow[]> {
  const supabase = createServiceRoleClient();

  const normalized = books
    .map((book) => ({
      title: book.title.trim(),
      category: book.category,
      study_action: book.studyAction.trim(),
      auto_classified: book.autoClassified,
    }))
    .filter((book) => book.title && VALID_CATEGORIES.has(book.category));

  const uniqueByTitle = new Map<string, (typeof normalized)[number]>();
  for (const book of normalized) {
    uniqueByTitle.set(book.title, book);
  }
  const unique = [...uniqueByTitle.values()];

  const { error: deleteError } = await supabase
    .from("user_owned_books")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (unique.length === 0) return [];

  const { data, error: insertError } = await supabase
    .from("user_owned_books")
    .insert(
      unique.map((book) => ({
        user_id: userId,
        title: book.title,
        category: book.category,
        study_action: book.study_action,
        auto_classified: book.auto_classified,
        book_id: null,
      }))
    )
    .select("id, title, category, study_action, auto_classified, book_id");

  if (insertError) throw insertError;

  return (data ?? [])
    .map((row) => toRow(row as DbOwnedBook))
    .filter((row): row is OwnedBookRow => row !== null);
}

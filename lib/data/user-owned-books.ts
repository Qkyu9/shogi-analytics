import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function listOwnedBookIds(userId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_owned_books")
    .select("book_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.book_id as string);
}

export async function replaceOwnedBookIds(
  userId: string,
  bookIds: string[]
): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const uniqueIds = [...new Set(bookIds.filter(Boolean))];

  const { error: deleteError } = await supabase
    .from("user_owned_books")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (uniqueIds.length === 0) return [];

  const { error: insertError } = await supabase.from("user_owned_books").insert(
    uniqueIds.map((bookId) => ({
      user_id: userId,
      book_id: bookId,
    }))
  );

  if (insertError) throw insertError;
  return uniqueIds;
}

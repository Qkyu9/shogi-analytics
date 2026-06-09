import type { BookCategory } from "@/app/lib/book-catalog";
import type { BookClassification } from "@/app/lib/book-classifier";

export type OwnedBook = {
  id?: string;
  title: string;
  category: BookCategory;
  studyAction: string;
  autoClassified: boolean;
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "通信に失敗しました");
  }
  return data;
}

export async function getOwnedBooks(): Promise<OwnedBook[]> {
  const { books } = await apiFetch<{ books: OwnedBook[] }>("/api/user-books");
  return books;
}

export async function saveOwnedBooks(books: OwnedBook[]): Promise<OwnedBook[]> {
  const { books: saved } = await apiFetch<{ books: OwnedBook[] }>(
    "/api/user-books",
    {
      method: "PUT",
      body: JSON.stringify({ books }),
    }
  );
  return saved;
}

export async function classifyBookTitle(
  title: string
): Promise<BookClassification> {
  const { classification } = await apiFetch<{
    classification: BookClassification;
  }>("/api/classify-book", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return classification;
}

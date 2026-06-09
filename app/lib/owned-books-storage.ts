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

export async function getOwnedBookIds(): Promise<string[]> {
  const { bookIds } = await apiFetch<{ bookIds: string[] }>("/api/user-books");
  return bookIds;
}

export async function saveOwnedBookIds(bookIds: string[]): Promise<string[]> {
  const { bookIds: saved } = await apiFetch<{ bookIds: string[] }>(
    "/api/user-books",
    {
      method: "PUT",
      body: JSON.stringify({ bookIds }),
    }
  );
  return saved;
}

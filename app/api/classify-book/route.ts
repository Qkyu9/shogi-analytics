import { NextResponse } from "next/server";
import { classifyBookTitle } from "@/app/lib/book-classifier";
import { getSupabaseUserByClerkId } from "@/lib/supabase/auth-helpers";

export async function POST(request: Request) {
  try {
    const user = await getSupabaseUserByClerkId();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { title?: string };
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "書名を入力してください" },
        { status: 400 }
      );
    }

    const classification = await classifyBookTitle(title);
    return NextResponse.json({ classification });
  } catch (error) {
    console.error("POST /api/classify-book error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "棋書の判別に失敗しました",
      },
      { status: 500 }
    );
  }
}

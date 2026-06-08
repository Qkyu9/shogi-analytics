import type {
  GameRecordDetail,
  GameRecordDraft,
  GameRecordSummary,
  GamePosition,
  VenueType,
} from "@/app/lib/types";
import { VENUE_OPTIONS } from "@/app/lib/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function venueLabel(type: VenueType): string {
  return VENUE_OPTIONS.find((v) => v.value === type)?.label ?? type;
}

function isNonEmptyPosition(pos: GamePosition): boolean {
  return !!(
    pos.sceneDescription.trim() ||
    pos.defeatCause.trim() ||
    pos.correctMove.trim() ||
    pos.lesson.trim()
  );
}

function normalizePositions(positions: GamePosition[]) {
  return positions
    .filter(isNonEmptyPosition)
    .map((p, index) => ({
      sort_order: index,
      scene_description: p.sceneDescription.trim(),
      defeat_cause: p.defeatCause.trim(),
      correct_move: p.correctMove.trim(),
      lesson: p.lesson.trim(),
    }));
}

type DbRecord = {
  id: string;
  played_at: string;
  venue_type: VenueType;
  result: GameRecordDetail["result"];
  my_strategy: string;
  opponent_strategy: string;
  tags: string[];
  kifu_text: string | null;
  game_positions: Array<{
    sort_order: number;
    scene_description: string;
    defeat_cause: string;
    correct_move: string;
    lesson: string;
  }>;
};

function toDetail(row: DbRecord): GameRecordDetail {
  const positions = [...(row.game_positions ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      sceneDescription: p.scene_description,
      defeatCause: p.defeat_cause,
      correctMove: p.correct_move,
      lesson: p.lesson,
      sortOrder: p.sort_order,
    }));

  return {
    id: row.id,
    playedAt: row.played_at,
    venueType: row.venue_type,
    venueLabel: venueLabel(row.venue_type),
    result: row.result,
    myStrategy: row.my_strategy,
    opponentStrategy: row.opponent_strategy,
    tags: row.tags ?? [],
    positionCount: positions.length,
    positions,
    kifuText: row.kifu_text ?? undefined,
  };
}

const recordSelect = `
  id,
  played_at,
  venue_type,
  result,
  my_strategy,
  opponent_strategy,
  tags,
  kifu_text,
  game_positions (
    sort_order,
    scene_description,
    defeat_cause,
    correct_move,
    lesson
  )
`;

export async function listGameRecordSummaries(
  userId: string
): Promise<GameRecordSummary[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("game_records")
    .select(
      "id, played_at, venue_type, result, my_strategy, opponent_strategy, tags, game_positions(sort_order)"
    )
    .eq("user_id", userId)
    .order("played_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    playedAt: row.played_at,
    venueType: row.venue_type as VenueType,
    venueLabel: venueLabel(row.venue_type as VenueType),
    result: row.result as GameRecordDetail["result"],
    myStrategy: row.my_strategy,
    opponentStrategy: row.opponent_strategy,
    tags: row.tags ?? [],
    positionCount: row.game_positions?.length ?? 0,
  }));
}

export async function getGameRecordDetail(
  userId: string,
  recordId: string
): Promise<GameRecordDetail | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("game_records")
    .select(recordSelect)
    .eq("user_id", userId)
    .eq("id", recordId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toDetail(data as DbRecord);
}

export async function insertGameRecord(
  userId: string,
  draft: GameRecordDraft
): Promise<GameRecordDetail> {
  const supabase = createServiceRoleClient();
  const positions = normalizePositions(draft.positions);

  const { data: record, error: recordError } = await supabase
    .from("game_records")
    .insert({
      user_id: userId,
      played_at: draft.playedAt,
      venue_type: draft.venueType,
      result: draft.result,
      my_strategy: draft.myStrategy.trim(),
      opponent_strategy: draft.opponentStrategy.trim(),
      tags: draft.tags,
      kifu_text: draft.kifuText?.trim() || null,
    })
    .select("id")
    .single();

  if (recordError || !record) {
    throw recordError ?? new Error("記録の保存に失敗しました");
  }

  if (positions.length > 0) {
    const { error: posError } = await supabase.from("game_positions").insert(
      positions.map((p) => ({
        game_record_id: record.id,
        ...p,
      }))
    );
    if (posError) {
      await supabase.from("game_records").delete().eq("id", record.id);
      throw posError;
    }
  }

  const detail = await getGameRecordDetail(userId, record.id);
  if (!detail) throw new Error("保存した記録の取得に失敗しました");
  return detail;
}

function recordFingerprint(
  record: Pick<
    GameRecordDetail,
    "playedAt" | "venueType" | "result" | "myStrategy" | "opponentStrategy"
  >
): string {
  const played = new Date(record.playedAt);
  const jstKey = played.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return [
    jstKey,
    record.venueType,
    record.result,
    record.myStrategy.trim(),
    record.opponentStrategy.trim(),
  ].join("|");
}

export async function deleteGameRecord(
  userId: string,
  recordId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { error, count } = await supabase
    .from("game_records")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("id", recordId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function migrateGameRecords(
  userId: string,
  records: GameRecordDetail[]
): Promise<number> {
  const existing = await listGameRecordSummaries(userId);
  const existingKeys = new Set<string>();

  for (const summary of existing) {
    existingKeys.add(
      recordFingerprint({
        playedAt: summary.playedAt,
        venueType: summary.venueType,
        result: summary.result,
        myStrategy: summary.myStrategy,
        opponentStrategy: summary.opponentStrategy,
      })
    );
  }

  let imported = 0;
  for (const record of records) {
    const key = recordFingerprint(record);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    const draft: GameRecordDraft = {
      playedAt: record.playedAt,
      venueType: record.venueType,
      result: record.result,
      myStrategy: record.myStrategy,
      opponentStrategy: record.opponentStrategy,
      positions: record.positions.map(
        ({ sceneDescription, defeatCause, correctMove, lesson }) => ({
          sceneDescription,
          defeatCause,
          correctMove,
          lesson,
        })
      ),
      tags: record.tags,
      kifuText: record.kifuText,
    };
    await insertGameRecord(userId, draft);
    imported += 1;
  }
  return imported;
}

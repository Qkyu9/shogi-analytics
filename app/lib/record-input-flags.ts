import type { GamePosition, KishinInsight } from "@/app/lib/types";

type DbPositionRow = {
  scene_description?: string | null;
  defeat_cause?: string | null;
  correct_move?: string | null;
  lesson?: string | null;
};

export function hasVoiceInputData(
  sourceInputText?: string | null,
  positions?: DbPositionRow[] | GamePosition[]
): boolean {
  if (sourceInputText?.trim()) return true;
  if (!positions?.length) return false;
  return positions.some((p) => {
    const scene =
      "sceneDescription" in p ? p.sceneDescription : p.scene_description;
    const defeat = "defeatCause" in p ? p.defeatCause : p.defeat_cause;
    const correct = "correctMove" in p ? p.correctMove : p.correct_move;
    const lesson = "lesson" in p ? p.lesson : p.lesson;
    return !!(
      scene?.trim() ||
      defeat?.trim() ||
      correct?.trim() ||
      lesson?.trim()
    );
  });
}

export function hasKifuInputData(
  kifuText?: string | null,
  kishinInsight?: KishinInsight | null
): boolean {
  return !!(kifuText?.trim() || kishinInsight);
}

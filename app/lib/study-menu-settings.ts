export type StudyMenuDataSource = "kishin" | "verbal";

const STORAGE_KEY = "shogi-analytics-study-menu-source";

export const STUDY_MENU_SOURCE_LABELS: Record<StudyMenuDataSource, string> = {
  kishin: "棋神からの示唆",
  verbal: "口頭要約",
};

export const DEFAULT_STUDY_MENU_SOURCE: StudyMenuDataSource = "kishin";

export function getStudyMenuDataSource(): StudyMenuDataSource {
  if (typeof window === "undefined") return DEFAULT_STUDY_MENU_SOURCE;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "verbal" || raw === "kishin") return raw;
  return DEFAULT_STUDY_MENU_SOURCE;
}

export function setStudyMenuDataSource(source: StudyMenuDataSource): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, source);
}

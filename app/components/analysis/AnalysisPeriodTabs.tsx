import type { AnalysisPeriod } from "@/app/lib/record-stats";
import { cn } from "@/app/lib/utils";

const PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: "all", label: "全対局" },
  { value: "month", label: "直近1か月" },
];

export function AnalysisPeriodTabs({
  period,
  onChange,
  recordCount,
}: {
  period: AnalysisPeriod;
  onChange: (period: AnalysisPeriod) => void;
  recordCount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
        role="tablist"
        aria-label="分析の期間"
      >
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={period === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              period === option.value
                ? "bg-[var(--color-primary)] text-[var(--color-surface)]"
                : "text-[var(--color-text-sub)]"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--color-text-sub)]">
        対象: {recordCount} 件
      </p>
    </div>
  );
}

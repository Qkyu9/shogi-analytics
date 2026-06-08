import type { StudyAllocation } from "@/app/lib/types";

export function StudyMenuCard({
  allocations,
  dailyStudyMinutes,
}: {
  allocations: StudyAllocation[];
  dailyStudyMinutes: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-sub)]">
        1日{dailyStudyMinutes}分を前提とした配分
      </p>
      {allocations.map((item) => (
        <article
          key={item.item}
          className="rounded-xl bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{item.item}</h3>
            <span className="text-base font-medium text-[var(--color-primary)]">
              {item.percentage}%
            </span>
          </div>
          {item.dailyCount != null && (
            <p className="mt-1 text-sm text-[var(--color-text-sub)]">
              1日 {item.dailyCount} 問
            </p>
          )}
          <p className="mt-3 pt-3 text-xs leading-relaxed text-[var(--color-text-sub)]">
            {item.reason}
          </p>
        </article>
      ))}
    </div>
  );
}

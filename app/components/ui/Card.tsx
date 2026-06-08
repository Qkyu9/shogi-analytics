import { cn } from "@/app/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--color-surface)] p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

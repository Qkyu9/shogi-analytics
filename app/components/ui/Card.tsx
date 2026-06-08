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
        "rounded-lg border border-[var(--color-border)] bg-white p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

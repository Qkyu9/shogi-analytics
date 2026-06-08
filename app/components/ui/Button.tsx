import { cn } from "@/app/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50",
        fullWidth && "w-full",
        variant === "primary" &&
          "bg-[var(--color-primary)] text-[var(--color-surface)] hover:bg-[var(--color-primary-hover)]",
        variant === "secondary" &&
          "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]",
        variant === "danger" &&
          "bg-[var(--color-danger)]/90 text-white hover:bg-[var(--color-danger)]",
        variant === "ghost" &&
          "text-[var(--color-primary)] hover:bg-[var(--color-surface)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

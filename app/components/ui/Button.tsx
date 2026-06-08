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
        "inline-flex min-h-12 items-center justify-center rounded-lg px-4 text-base font-semibold transition-colors disabled:opacity-50",
        fullWidth && "w-full",
        variant === "primary" &&
          "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
        variant === "secondary" &&
          "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-sub)]",
        variant === "danger" && "bg-[var(--color-danger)] text-white",
        variant === "ghost" && "text-[var(--color-primary)] hover:bg-[var(--color-bg-sub)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

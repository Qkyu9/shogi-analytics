import Image from "next/image";
import { cn } from "@/app/lib/utils";

const SHOGI_BOARD = "/images/shogi-board.jpg";

type NavPhotoIconProps = {
  variant: "home" | "records" | "record" | "analysis" | "study";
  active?: boolean;
};

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-6 w-6", active ? "text-[var(--color-primary)]" : "text-stone-600")}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 3.2 3 11v9.8h6.5v-6h5V20.8H21V11L12 3.2z" />
    </svg>
  );
}

function RecordsIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-6 w-6", active ? "text-[var(--color-primary)]" : "text-stone-600")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

export function NavPhotoIcon({ variant, active }: NavPhotoIconProps) {
  if (variant === "home") return <HomeIcon active={active} />;
  if (variant === "records") return <RecordsIcon active={active} />;

  if (variant === "record") {
    return (
      <span className="relative -mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-800 via-stone-800 to-slate-950 shadow-lg ring-2 ring-white">
        <MicIcon />
      </span>
    );
  }

  const objectPosition = variant === "analysis" ? "65% 40%" : "40% 55%";
  const overlay =
    variant === "analysis"
      ? "bg-gradient-to-br from-slate-950/50 to-amber-900/30"
      : "bg-gradient-to-br from-amber-950/50 to-slate-950/40";

  return (
    <span
      className={cn(
        "relative block h-7 w-7 overflow-hidden rounded-md ring-1",
        active ? "ring-[var(--color-primary)]" : "ring-stone-300"
      )}
    >
      <Image
        src={SHOGI_BOARD}
        alt=""
        fill
        sizes="28px"
        className="object-cover"
        style={{ objectPosition }}
        aria-hidden
      />
      <span className={cn("absolute inset-0", overlay)} aria-hidden />
    </span>
  );
}

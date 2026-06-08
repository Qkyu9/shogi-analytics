import { cn } from "@/app/lib/utils";

type NavPhotoIconProps = {
  variant: "home" | "records" | "record" | "analysis" | "study";
  active?: boolean;
};

const iconClass = (active?: boolean) =>
  cn(
    "h-5 w-5",
    active ? "text-[var(--color-primary)]" : "text-[var(--color-text-sub)]"
  );

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(active)}
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
      className={iconClass(active)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function AnalysisIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(active)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 20V12" />
      <path d="M10 20V6" />
      <path d="M15 20v-8" />
      <path d="M20 20V9" />
      <path d="M4 20h17" />
    </svg>
  );
}

function StudyIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(active)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 6.5c-2.2 0-4.2.6-6 1.4v11.2c1.8-.7 3.8-1.2 6-1.2s4.2.5 6 1.2V7.9c-1.8-.8-3.8-1.4-6-1.4z" />
      <path d="M12 6.5v11.9" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-[var(--color-surface)]"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

export function NavPhotoIcon({ variant, active }: NavPhotoIconProps) {
  if (variant === "home") return <HomeIcon active={active} />;
  if (variant === "records") return <RecordsIcon active={active} />;
  if (variant === "analysis") return <AnalysisIcon active={active} />;
  if (variant === "study") return <StudyIcon active={active} />;

  return (
    <span className="relative -mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-md">
      <MicIcon />
    </span>
  );
}

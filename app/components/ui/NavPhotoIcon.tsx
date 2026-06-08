import Image from "next/image";
import { cn } from "@/app/lib/utils";

const FEATURE_IMAGES = {
  analysis: "/images/icon-analysis.png",
  study: "/images/icon-study.png",
} as const;

type NavPhotoIconProps = {
  variant: "home" | "records" | "record" | "analysis" | "study";
  active?: boolean;
};

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-5 w-5",
        active ? "text-[var(--color-primary)]" : "text-[var(--color-text-sub)]"
      )}
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
      className={cn(
        "h-5 w-5",
        active ? "text-[var(--color-primary)]" : "text-[var(--color-text-sub)]"
      )}
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
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--color-bg)]" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

function FeatureNavIcon({
  variant,
  active,
}: {
  variant: keyof typeof FEATURE_IMAGES;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block h-6 w-6 overflow-hidden rounded-md",
        active && "ring-1 ring-[var(--color-primary)]"
      )}
    >
      <Image
        src={FEATURE_IMAGES[variant]}
        alt=""
        fill
        sizes="24px"
        className="object-cover"
        aria-hidden
      />
    </span>
  );
}

export function NavPhotoIcon({ variant, active }: NavPhotoIconProps) {
  if (variant === "home") return <HomeIcon active={active} />;
  if (variant === "records") return <RecordsIcon active={active} />;

  if (variant === "record") {
    return (
      <span className="relative -mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-md">
        <MicIcon />
      </span>
    );
  }

  return <FeatureNavIcon variant={variant} active={active} />;
}

import Image from "next/image";
import { cn } from "@/app/lib/utils";

const SHOGI_BOARD = "/images/shogi-board.jpg";

type FeaturePhotoCardProps = {
  title: string;
  subtitle?: string;
  variant?: "analysis" | "study" | "default";
  className?: string;
};

const VARIANT_STYLES = {
  analysis: {
    overlay: "from-slate-950/75 via-slate-900/55 to-amber-950/40",
    objectPosition: "object-[65%_40%]",
  },
  study: {
    overlay: "from-amber-950/70 via-stone-900/50 to-slate-950/45",
    objectPosition: "object-[40%_55%]",
  },
  default: {
    overlay: "from-slate-950/70 via-slate-900/45 to-transparent",
    objectPosition: "object-center",
  },
};

export function FeaturePhotoCard({
  title,
  subtitle,
  variant = "default",
  className,
}: FeaturePhotoCardProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-stone-800/20 shadow-md",
        className
      )}
    >
      <Image
        src={SHOGI_BOARD}
        alt=""
        fill
        sizes="(max-width: 512px) 50vw, 200px"
        className={cn("object-cover", style.objectPosition)}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          style.overlay
        )}
        aria-hidden
      />
      <div className="relative flex min-h-[88px] flex-col justify-end p-3">
        <p className="text-sm font-semibold text-white drop-shadow-sm">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-[10px] text-white/80">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

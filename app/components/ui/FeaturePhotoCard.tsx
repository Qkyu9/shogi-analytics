import Image from "next/image";
import { cn } from "@/app/lib/utils";

const FEATURE_IMAGES = {
  analysis: "/images/icon-analysis.png",
  study: "/images/icon-study.png",
} as const;

type FeaturePhotoCardProps = {
  title: string;
  variant: keyof typeof FEATURE_IMAGES;
  className?: string;
};

export function FeaturePhotoCard({
  title,
  variant,
  className,
}: FeaturePhotoCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[var(--color-surface)]",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={FEATURE_IMAGES[variant]}
          alt=""
          fill
          sizes="(max-width: 512px) 50vw, 200px"
          className="object-cover"
          aria-hidden
        />
      </div>
      <p className="px-3 py-2.5 text-sm font-medium text-[var(--color-text)]">
        {title}
      </p>
    </div>
  );
}

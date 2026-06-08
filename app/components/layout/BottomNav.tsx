"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavPhotoIcon } from "@/app/components/ui/NavPhotoIcon";
import { cn } from "@/app/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: "home" | "records" | "record" | "analysis" | "study";
  highlight?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/records", label: "記録", icon: "records" },
  { href: "/records/new", label: "記録する", icon: "record", highlight: true },
  { href: "/analysis", label: "分析", icon: "analysis" },
  { href: "/study-menu", label: "学習", icon: "study" },
];

export function BottomNav() {
  const pathname = usePathname();

  const hidden =
    pathname.startsWith("/records/new") ||
    pathname.endsWith("/edit") ||
    pathname.startsWith("/sign-in");

  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-bg-sub)] pb-[env(safe-area-inset-bottom)]"
      aria-label="メインナビゲーション"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px]",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-sub)]"
                )}
              >
                <NavPhotoIcon variant={item.icon} active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

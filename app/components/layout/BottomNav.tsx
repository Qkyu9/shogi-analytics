"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  highlight?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/records", label: "記録", icon: "📋" },
  { href: "/records/new", label: "記録する", icon: "🎤", highlight: true },
  { href: "/analysis", label: "分析", icon: "📊" },
  { href: "/study-menu", label: "学習", icon: "📚" },
];

export function BottomNav() {
  const pathname = usePathname();

  const hidden =
    pathname.startsWith("/records/new") ||
    pathname.startsWith("/sign-in");

  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-white pb-[env(safe-area-inset-bottom)]"
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
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs",
                  active
                    ? "text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-text-sub)]",
                  item.highlight && !active && "text-[var(--color-primary)]"
                )}
              >
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

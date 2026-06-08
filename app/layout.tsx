import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthBootstrap } from "@/app/components/auth/AuthBootstrap";
import { BottomNav } from "@/app/components/layout/BottomNav";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "将棋 Analytics",
  description: "対局振り返りと弱点分析・学習メニュー提案",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/icon-192.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "将棋 Analytics",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f6f1ea",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body className="min-h-dvh bg-[var(--color-bg)]">
          <AuthBootstrap />
          <div className="mx-auto min-h-dvh max-w-lg pb-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)]">
            {children}
          </div>
          <BottomNav />
        </body>
      </html>
    </ClerkProvider>
  );
}

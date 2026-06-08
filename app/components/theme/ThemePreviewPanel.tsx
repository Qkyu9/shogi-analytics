import Image from "next/image";
import type { ThemePreset } from "@/app/lib/theme-presets";

export function ThemePreviewPanel({ preset }: { preset: ThemePreset }) {
  const style = preset.vars as React.CSSProperties;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-stone-300 shadow-sm"
      style={style}
    >
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: preset.vars["--color-border"] }}
      >
        <p className="text-xs font-semibold" style={{ color: preset.vars["--color-text"] }}>
          {preset.name}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: preset.vars["--color-text-sub"] }}>
          {preset.mood}
        </p>
      </div>

      <div
        className="flex flex-col gap-3 p-3"
        style={{ background: preset.vars["--color-bg"] }}
      >
        <div
          className="flex min-h-9 items-center justify-between px-1 text-xs"
          style={{ color: preset.vars["--color-text"] }}
        >
          <span className="font-medium">将棋 Analytics</span>
          <span style={{ color: preset.vars["--color-text-sub"] }}>設定</span>
        </div>

        <button
          type="button"
          className="min-h-10 w-full rounded-lg text-sm font-medium"
          style={{
            background: preset.vars["--color-primary"],
            color: preset.vars["--color-bg"],
          }}
        >
          対局を記録する
        </button>

        <div
          className="rounded-xl p-3"
          style={{ background: preset.vars["--color-surface"] }}
        >
          <p className="text-[10px]" style={{ color: preset.vars["--color-text-sub"] }}>
            いまの弱点
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: preset.vars["--color-text"] }}>
            寄せの崩し
          </p>
          <p className="text-[10px]" style={{ color: preset.vars["--color-text-sub"] }}>
            3回（42%）
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { src: "/images/icon-analysis.png", label: "弱点分析" },
              { src: "/images/icon-study.png", label: "学習メニュー" },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className="overflow-hidden rounded-xl"
              style={{ background: preset.vars["--color-surface"] }}
            >
              <div className="relative aspect-[4/3] w-full">
                <Image src={item.src} alt="" fill className="object-cover" sizes="160px" />
              </div>
              <p
                className="px-2 py-1.5 text-[10px] font-medium"
                style={{ color: preset.vars["--color-text"] }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: preset.vars["--color-surface"] }}
        >
          <div className="flex justify-between text-[10px]">
            <span style={{ color: preset.vars["--color-text-sub"] }}>2026/06/08</span>
            <span style={{ color: preset.vars["--color-text"] }}>負け</span>
          </div>
          <p className="mt-1 text-[10px]" style={{ color: preset.vars["--color-text"] }}>
            右玉 vs 雁木
          </p>
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px]"
            style={{
              background: preset.vars["--color-tag-bg"],
              color: preset.vars["--color-tag-text"],
            }}
          >
            寄せの崩し
          </span>
        </div>

        <div
          className="flex justify-around border-t pt-2 text-[9px]"
          style={{
            borderColor: preset.vars["--color-border"],
            background: preset.vars["--color-bg-sub"],
            color: preset.vars["--color-text-sub"],
          }}
        >
          <span style={{ color: preset.vars["--color-primary"] }}>ホーム</span>
          <span>記録</span>
          <span style={{ color: preset.vars["--color-primary"] }}>記録する</span>
          <span>分析</span>
          <span>学習</span>
        </div>
      </div>

      <p
        className="border-t px-4 py-3 text-xs leading-relaxed"
        style={{
          borderColor: preset.vars["--color-border"],
          background: preset.vars["--color-surface"],
          color: preset.vars["--color-text-sub"],
        }}
      >
        {preset.description}
      </p>
    </div>
  );
}

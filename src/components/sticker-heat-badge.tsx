import type { HeatLevel } from "@/lib/types";
import { getHeatEmoji, getHeatLabel } from "@/lib/group-intelligence";

type StickerHeatBadgeProps = {
  level: HeatLevel;
  demand?: number;
  compact?: boolean;
};

const styles: Record<
  Exclude<HeatLevel, "common">,
  { bg: string; text: string; ring: string }
> = {
  wanted: {
    bg: "bg-[#eef6ff]",
    text: "text-[#0067c0]",
    ring: "ring-[#0067c0]/30",
  },
  hot: {
    bg: "bg-[#fff4e6]",
    text: "text-[#c45c00]",
    ring: "ring-[#ff8c00]/40",
  },
  golden: {
    bg: "bg-gradient-to-r from-[#fff8e6] to-[#ffefd0]",
    text: "text-[#9a6700]",
    ring: "ring-[#d4a017]/50",
  },
};

export function StickerHeatBadge({
  level,
  demand,
  compact,
}: StickerHeatBadgeProps) {
  if (level === "common") return null;

  const s = styles[level];
  const label = getHeatLabel(level);
  const emoji = getHeatEmoji(level);

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${s.bg} ${s.text} ${s.ring} ${level === "golden" ? "animate-golden-pulse" : ""}`}
      title={demand ? `${demand} pessoas no grupo precisam` : label}
    >
      <span aria-hidden>{emoji}</span>
      {!compact ? <span>{label}</span> : null}
      {demand && demand >= 3 ? (
        <span className="opacity-80">×{demand}</span>
      ) : null}
    </span>
  );
}

type StickerChipProps = {
  code: string;
  level?: HeatLevel;
  demand?: number;
  variant?: "give" | "receive" | "neutral";
};

export function StickerChip({
  code,
  level = "common",
  demand,
  variant = "neutral",
}: StickerChipProps) {
  const base =
    variant === "give"
      ? "border-[#ecdfc0] bg-[#fffbf5]"
      : variant === "receive"
        ? "border-[#cfe9cf] bg-[#f5fbf5]"
        : "border-[#e6e6e6] bg-[#fafafa]";

  const golden =
    level === "golden"
      ? "border-[#d4a017] bg-gradient-to-br from-[#fffbeb] to-[#fff3cc] shadow-[0_0_12px_rgba(212,160,23,0.25)]"
      : level === "hot"
        ? "border-[#ffb366] bg-[#fff8f0]"
        : "";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold text-[#1b1b1b] ${golden || base}`}
    >
      {code}
      <StickerHeatBadge level={level} demand={demand} compact />
    </span>
  );
}

type StickerChipListProps = {
  codes: string[];
  marketLevels?: Map<string, { level: HeatLevel; demand: number }>;
  variant?: "give" | "receive" | "neutral";
  emptyLabel?: string;
};

export function StickerChipList({
  codes,
  marketLevels,
  variant = "neutral",
  emptyLabel = "—",
}: StickerChipListProps) {
  if (codes.length === 0) {
    return <span className="text-sm text-[#5f5f5f]">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((code) => {
        const info = marketLevels?.get(code);
        return (
          <StickerChip
            key={code}
            code={code}
            level={info?.level ?? "common"}
            demand={info?.demand}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

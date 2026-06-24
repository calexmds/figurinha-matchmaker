"use client";

import { cn } from "@/lib/cn";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: SheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(
          "fluent-chrome animate-sheet-up max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-line/80 p-5 shadow-xl sm:rounded-2xl sm:border",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="sheet-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-semibold text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Fechar
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ChevronIcon({
  expanded,
  className,
}: {
  expanded?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
      className={cn(
        "shrink-0 text-ink-muted transition-transform",
        expanded && "rotate-90",
        className,
      )}
    >
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={className}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { CopaBadge } from "@/components/copa-badge";

const titles: Record<string, string> = {
  "/home": "Início",
  "/trocas": "Trocas",
  "/grupo": "Grupo",
  "/onboarding": "Figurinhas",
  "/onboarding/welcome": "Começar",
};

type AppHeaderProps = {
  pathname?: string;
  showAdminLink?: boolean;
};

export function AppHeader({
  pathname = "/home",
  showAdminLink = false,
}: AppHeaderProps) {
  const title =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ??
    APP_NAME;

  return (
    <header className="fluent-chrome sticky top-0 z-20 border-b border-line/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-[var(--header-height)] max-w-lg items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <CopaBadge size={40} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Copa 2026
            </p>
            <h1 className="font-display text-base font-bold text-ink">{title}</h1>
          </div>
        </div>
        {showAdminLink ? (
          <Link
            href="/admin"
            className="shrink-0 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition active:bg-mica focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Admin
          </Link>
        ) : null}
      </div>
    </header>
  );
}

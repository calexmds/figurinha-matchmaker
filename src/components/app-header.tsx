import { APP_NAME } from "@/lib/constants";

const titles: Record<string, string> = {
  "/home": "Início",
  "/trocas": "Trocas",
  "/grupo": "Grupo",
  "/onboarding": "Figurinhas",
};

type AppHeaderProps = {
  pathname?: string;
};

export function AppHeader({ pathname = "/home" }: AppHeaderProps) {
  const title =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ??
    APP_NAME;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur-lg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Copa 2026
          </p>
          <h1 className="text-base font-bold text-white">{title}</h1>
        </div>
        <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold text-emerald-300">
          FM
        </div>
      </div>
    </header>
  );
}

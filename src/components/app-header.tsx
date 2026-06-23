import { APP_NAME } from "@/lib/constants";
import { CopaBadge } from "@/components/copa-badge";

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
    <header className="sticky top-0 z-20 border-b border-[#e6e6e6] bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <CopaBadge size={40} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
              Copa 2026
            </p>
            <h1 className="text-base font-bold text-[#1b1b1b]">{title}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNavPending } from "@/components/nav-pending";

const tabs = [
  {
    href: "/home",
    label: "Início",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    href: "/trocas",
    label: "Trocas",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </svg>
    ),
  },
  {
    href: "/grupo",
    label: "Grupo",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5Z" />
      </svg>
    ),
  },
  {
    href: "/onboarding",
    label: "Figurinhas",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
] as const;

export function BottomNav({ tradesBadgeCount = 0 }: { tradesBadgeCount?: number }) {
  const pathname = usePathname();
  const { isPending, navigate } = useNavPending();

  const badgeLabel =
    tradesBadgeCount > 9 ? "9+" : String(tradesBadgeCount);

  useEffect(() => {
    if (isPending) {
      document.documentElement.style.scrollBehavior = "auto";
    }
  }, [isPending]);

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#e6e6e6] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] transition-opacity ${isPending ? "opacity-95" : ""}`}
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const showBadge = tab.href === "/trocas" && tradesBadgeCount > 0;

          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => {
                if (!active) navigate(tab.href);
              }}
              disabled={isPending && !active}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 transition ${
                active
                  ? "text-[#0067c0]"
                  : "text-[#8a8a8a] active:text-[#5f5f5f] disabled:opacity-60"
              }`}
            >
              <span className="relative">
                {tab.icon(active)}
                {showBadge ? (
                  <span
                    className="absolute -right-2 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c42b1c] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                    aria-hidden
                  >
                    {badgeLabel}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-semibold tracking-wide">
                {tab.label}
                {showBadge ? (
                  <span className="sr-only">
                    {" "}
                    — {tradesBadgeCount}{" "}
                    {tradesBadgeCount === 1
                      ? "ação pendente"
                      : "ações pendentes"}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  NavPendingProvider,
  NavProgressBar,
  usePrefetchAppRoutes,
} from "@/components/nav-pending";

function AppShellInner({
  children,
  tradesBadgeCount = 0,
}: {
  children: React.ReactNode;
  tradesBadgeCount?: number;
}) {
  const pathname = usePathname();
  usePrefetchAppRoutes();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f3f3f3]">
      <header className="relative sticky top-0 z-20">
        <AppHeader pathname={pathname} />
        <NavProgressBar />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-28">
        {children}
      </main>
      <BottomNav tradesBadgeCount={tradesBadgeCount} />
    </div>
  );
}

export function AppShell({
  children,
  tradesBadgeCount = 0,
}: {
  children: React.ReactNode;
  tradesBadgeCount?: number;
}) {
  return (
    <NavPendingProvider>
      <AppShellInner tradesBadgeCount={tradesBadgeCount}>
        {children}
      </AppShellInner>
    </NavPendingProvider>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950">
      <AppHeader pathname={pathname} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

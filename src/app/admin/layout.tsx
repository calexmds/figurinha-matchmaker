import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Admin · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-dvh bg-mica">
      <header className="fluent-chrome sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
              Admin interno
            </p>
            <h1 className="font-display text-lg font-bold text-ink">
              Figurinha Matchmaker
            </h1>
          </div>
          <div className="flex items-center gap-3 text-right">
            <p className="hidden text-xs text-ink-soft sm:block">{user.email}</p>
            <Link
              href="/home"
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition active:bg-mica"
            >
              Voltar ao app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

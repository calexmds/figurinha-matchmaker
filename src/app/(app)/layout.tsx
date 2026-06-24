import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getTradesAttentionCount } from "@/lib/trades";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  const tradesBadgeCount = await getTradesAttentionCount(supabase, user.id);

  return (
    <AppShell tradesBadgeCount={tradesBadgeCount}>{children}</AppShell>
  );
}

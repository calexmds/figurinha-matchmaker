import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { StatCard } from "@/components/stat-card";
import {
  WhatsAppShareButton,
  buildProfileMessage,
} from "@/components/whatsapp-share";
import {
  getActiveGroup,
  getDuplicateAndMissingCodes,
  getUserCollectionStats,
} from "@/lib/data";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();
  const { stats } = await getUserCollectionStats(supabase, user.id);
  const group = await getActiveGroup(
    supabase,
    user.id,
    profile?.active_group_id ?? null,
  );
  const { duplicates, missing } = await getDuplicateAndMissingCodes(
    supabase,
    user.id,
  );

  const availableInGroup =
    group && stats.owned > 0
      ? await countMissingAvailableInGroup(supabase, group.id, user.id, missing)
      : 0;

  return (
    <div className="space-y-6">
      <InstallPrompt />

      <div>
        <p className="text-sm text-slate-400">Olá, {profile?.name ?? "colecionador"}</p>
        <h2 className="mt-1 text-2xl font-bold text-white">
          Álbum {stats.percent}% completo
        </h2>
        {group ? (
          <p className="mt-2 text-sm text-slate-300">
            Grupo ativo: <strong className="text-white">{group.name}</strong>
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-200">
            Você ainda não entrou em um grupo.{" "}
            <Link href="/grupo" className="underline">
              Crie ou entre agora
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Possui" value={stats.owned} accent="green" />
        <StatCard label="Faltam" value={stats.missing} accent="blue" />
        <StatCard label="Repetidas" value={stats.duplicates} accent="yellow" />
        <StatCard label="Completo" value={`${stats.percent}%`} accent="white" />
      </div>

      {group && missing.length > 0 ? (
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <p className="text-sm font-semibold text-emerald-200">
            No seu grupo
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {availableInGroup} figurinhas que faltam estão com alguém do grupo
          </p>
          <Link
            href="/trocas"
            className="mt-4 inline-flex rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Ver sugestões de troca
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Atualizar figurinhas
        </Link>
        {stats.duplicates > 0 || missing.length > 0 ? (
          <WhatsAppShareButton
            message={buildProfileMessage(
              [...new Set(duplicates.map((c) => c))],
              missing.slice(0, 20),
            )}
            className="flex-1"
          />
        ) : null}
      </div>
    </div>
  );
}

async function countMissingAvailableInGroup(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
  missing: string[],
) {
  if (missing.length === 0) return 0;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", userId);

  if (!members?.length) return 0;

  const memberIds = members.map((m) => m.user_id);
  const { data: stickers } = await supabase
    .from("user_stickers")
    .select("quantity, stickers(code)")
    .in("user_id", memberIds)
    .gt("quantity", 1);

  const duplicateCodes = new Set<string>();
  for (const row of stickers ?? []) {
    const sticker = row.stickers as { code: string } | { code: string }[] | null;
    const code = Array.isArray(sticker) ? sticker[0]?.code : sticker?.code;
    if (code) duplicateCodes.add(code);
  }

  return missing.filter((code) => duplicateCodes.has(code)).length;
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { StatCard } from "@/components/stat-card";
import {
  WhatsAppShareButton,
  buildProfileMessage,
} from "@/components/whatsapp-share";
import {
  countNeedsAvailableInGroup,
  getActiveGroup,
  getUserTradeSummary,
} from "@/lib/data";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();
  const { duplicates, needs, stats } = await getUserTradeSummary(
    supabase,
    user.id,
  );
  const group = await getActiveGroup(
    supabase,
    user.id,
    profile?.active_group_id ?? null,
  );

  const availableInGroup =
    group && needs.length > 0
      ? await countNeedsAvailableInGroup(
          supabase,
          group.id,
          user.id,
          needs,
        )
      : 0;

  const hasLists = stats.duplicateCount > 0 || stats.needCount > 0;

  return (
    <div className="space-y-6">
      <InstallPrompt />

      <div>
        <p className="text-sm text-slate-400">
          Olá, {profile?.name ?? "colecionador"}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">
          {hasLists ? "Pronto para trocar" : "Cadastre suas listas"}
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
        <StatCard
          label="Repetidas"
          value={stats.duplicateCount}
          accent="yellow"
        />
        <StatCard label="Preciso" value={stats.needCount} accent="blue" />
        <StatCard
          label="Tipos repetidos"
          value={stats.duplicateTypes}
          accent="green"
        />
        <StatCard
          label="No grupo p/ você"
          value={availableInGroup}
          accent="white"
        />
      </div>

      {!hasLists ? (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
          <p className="text-sm text-slate-200">
            Comece colando suas repetidas e o que precisa — leva poucos minutos.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Cadastrar agora
          </Link>
        </div>
      ) : null}

      {group && needs.length > 0 && availableInGroup > 0 ? (
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <p className="text-sm font-semibold text-emerald-200">No seu grupo</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {availableInGroup} das que você precisa estão com alguém do grupo
          </p>
          <Link
            href="/trocas"
            className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Ver sugestões de troca
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
        >
          Atualizar listas
        </Link>
        {hasLists ? (
          <WhatsAppShareButton
            message={buildProfileMessage(
              duplicates.map((d) => d.code),
              needs.slice(0, 30),
            )}
            className="w-full"
          />
        ) : null}
      </div>
    </div>
  );
}

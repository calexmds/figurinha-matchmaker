import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { StatCard } from "@/components/stat-card";
import { GroupIntelligenceHero } from "@/components/group-intelligence-hero";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildProfileMessage } from "@/lib/whatsapp";
import {
  countNeedsAvailableInGroup,
  getActiveGroup,
  getGroupIntelligence,
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

  const intelligence =
    group ? await getGroupIntelligence(supabase, group.id, user.id) : null;

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
  const goldenCount =
    intelligence?.powerStickers.filter((s) => s.level === "golden").length ?? 0;

  return (
    <div className="space-y-6">
      <InstallPrompt />

      <div>
        <p className="text-sm text-[#5f5f5f]">
          Olá, {profile?.name ?? "colecionador"}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#1b1b1b]">
          {goldenCount > 0
            ? "Você tem figurinhas de ouro!"
            : hasLists
              ? "Pronto para trocar"
              : "Cadastre suas listas"}
        </h2>
        {group ? (
          <p className="mt-2 text-sm text-[#5f5f5f]">
            Grupo ativo:{" "}
            <strong className="text-[#1b1b1b]">{group.name}</strong>
            {intelligence && intelligence.market.memberCount > 1 ? (
              <>
                {" "}
                · {intelligence.market.memberCount} colecionadores no radar
              </>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#9a6700]">
            Você ainda não entrou em um grupo.{" "}
            <Link href="/grupo" className="font-semibold underline">
              Crie ou entre agora
            </Link>
          </p>
        )}
      </div>

      {group && intelligence ? (
        <GroupIntelligenceHero
          groupName={group.name}
          memberCount={intelligence.market.memberCount}
          powerStickers={intelligence.powerStickers}
          chaseStickers={intelligence.chaseStickers}
        />
      ) : null}

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
        {goldenCount > 0 ? (
          <StatCard label="Ouro do grupo" value={goldenCount} accent="yellow" />
        ) : null}
        {intelligence && intelligence.hotCodes.length > 0 ? (
          <StatCard
            label="Quentes no grupo"
            value={intelligence.hotCodes.length}
            accent="yellow"
          />
        ) : null}
      </div>

      {!hasLists ? (
        <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-5">
          <p className="text-sm text-[#1b1b1b]">
            Comece marcando suas repetidas e o que precisa — leva poucos minutos.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
          >
            Cadastrar agora
          </Link>
        </div>
      ) : null}

      {group && needs.length > 0 && availableInGroup > 0 ? (
        <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-5">
          <p className="text-sm font-semibold text-[#0f7b0f]">No seu grupo</p>
          <p className="mt-2 text-2xl font-bold text-[#1b1b1b]">
            {availableInGroup} das que você precisa estão com alguém do grupo
          </p>
          <Link
            href="/trocas"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0f7b0f] px-4 py-3 text-sm font-semibold text-white active:bg-[#0c640c]"
          >
            Ver sugestões de troca
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] active:bg-[#f0f0f0]"
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

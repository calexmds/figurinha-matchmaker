import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import {
  getActiveGroup,
  getGroupIntelligence,
  getUserDuplicates,
  getUserNeeds,
} from "@/lib/data";
import { getUserReservations } from "@/lib/trades";
import type { HeatLevel } from "@/lib/types";

export default async function OnboardingPage() {
  const { supabase, user, profile } = await requireUser();

  const needsTableCheck = await supabase.from("user_needs").select("id").limit(1);
  const needsTableMissing = !!needsTableCheck.error;

  const group = await getActiveGroup(
    supabase,
    user.id,
    profile?.active_group_id ?? null,
  );

  const [duplicates, needs, reservations, intelligence] = await Promise.all([
    getUserDuplicates(supabase, user.id),
    needsTableMissing ? Promise.resolve([]) : getUserNeeds(supabase, user.id),
    getUserReservations(supabase, user.id),
    group
      ? getGroupIntelligence(supabase, group.id, user.id)
      : Promise.resolve(null),
  ]);

  const sections = buildGabaritoSections();
  const initialDuplicates: Record<string, number> = {};
  for (const item of duplicates) {
    initialDuplicates[item.code] = item.quantity;
  }

  const initialHeatLevels: Record<string, HeatLevel> = {};
  if (intelligence) {
    for (const s of intelligence.powerStickers) {
      initialHeatLevels[s.code] = s.level;
    }
    for (const s of intelligence.chaseStickers) {
      if (!initialHeatLevels[s.code]) {
        initialHeatLevels[s.code] = s.level;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1b1b1b]">Minhas figurinhas</h2>
        <p className="mt-1 text-sm text-[#5f5f5f]">
          Marque o que você tem repetido e o que falta. Tudo salva sozinho.
          {intelligence?.powerStickers.some((s) => s.level === "golden") ? (
            <>
              {" "}
              <span className="font-semibold text-[#9a6700]">
                👑 Suas figurinhas de ouro aparecem com coroa no gabarito.
              </span>
            </>
          ) : null}
        </p>
      </div>

      {needsTableMissing ? (
        <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-4 text-sm text-[#9a6700]">
          A lista <strong>Preciso</strong> não pode ser salva ainda: falta criar a
          tabela <code className="text-xs">user_needs</code> no Supabase. Rode o
          arquivo <code className="text-xs">supabase/migrations/002_user_needs.sql</code>{" "}
          no SQL Editor.
        </div>
      ) : null}

      <Gabarito
        sections={sections}
        initialDuplicates={initialDuplicates}
        initialNeeds={needs}
        initialReservedGive={[...reservations.give.keys()]}
        initialReservedReceive={[...reservations.receive]}
        initialHeatLevels={initialHeatLevels}
      />
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import { getUserDuplicates, getUserNeeds } from "@/lib/data";
import { getUserReservations } from "@/lib/trades";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const needsTableCheck = await supabase
    .from("user_needs")
    .select("id")
    .limit(1);
  const needsTableMissing = !!needsTableCheck.error;

  const [duplicates, needs, reservations] = await Promise.all([
    getUserDuplicates(supabase, user.id),
    needsTableMissing ? Promise.resolve([]) : getUserNeeds(supabase, user.id),
    getUserReservations(supabase, user.id),
  ]);

  const sections = buildGabaritoSections();
  const initialDuplicates: Record<string, number> = {};
  for (const item of duplicates) {
    initialDuplicates[item.code] = item.quantity;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1b1b1b]">Minhas figurinhas</h2>
        <p className="mt-1 text-sm text-[#5f5f5f]">
          Marque o que você tem repetido e o que falta. Tudo salva sozinho.
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
      />
    </div>
  );
}

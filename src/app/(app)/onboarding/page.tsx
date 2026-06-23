import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import { getUserCollection } from "@/lib/data";
import { getUserReservations } from "@/lib/trades";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const [{ owned }, reservations] = await Promise.all([
    getUserCollection(supabase, user.id),
    getUserReservations(supabase, user.id),
  ]);

  const sections = buildGabaritoSections();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1b1b1b]">Minhas figurinhas</h2>
        <p className="mt-1 text-sm text-[#5f5f5f]">
          Marque tudo que você tem na aba <strong>Tenho</strong>. Repetidas e
          Preciso são calculados automaticamente.
        </p>
      </div>

      <Gabarito
        sections={sections}
        initialOwned={owned}
        initialReservedGive={[...reservations.give.keys()]}
        initialReservedReceive={[...reservations.receive]}
      />
    </div>
  );
}

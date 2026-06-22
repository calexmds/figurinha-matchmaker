import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import { getUserDuplicates, getUserNeeds } from "@/lib/data";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const [duplicates, needs] = await Promise.all([
    getUserDuplicates(supabase, user.id),
    getUserNeeds(supabase, user.id),
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

      <Gabarito
        sections={sections}
        initialDuplicates={initialDuplicates}
        initialNeeds={needs}
      />
    </div>
  );
}

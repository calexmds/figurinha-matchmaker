import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { CollectionModeSwitcher } from "@/components/collection-mode-switcher";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import { getUserCollection } from "@/lib/data";
import { getUserReservations } from "@/lib/trades";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode_set?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user, profile } = await requireUser();

  const entryMode = profile?.collection_entry_mode ?? "unset";
  if (entryMode === "unset") {
    redirect("/onboarding/welcome");
  }

  const [{ owned, entryMode: resolvedMode }, reservations] = await Promise.all([
    getUserCollection(supabase, user.id),
    getUserReservations(supabase, user.id),
  ]);

  const sections = buildGabaritoSections();
  const sparse = resolvedMode === "sparse";

  return (
    <div className="space-y-4">
      {query.mode_set ? (
        <p className="rounded-md border border-[#cfe9cf] bg-[#eef7ee] px-4 py-3 text-sm text-[#0f7b0f]">
          Modo configurado! Comece a marcar suas figurinhas abaixo.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1b1b1b]">Minhas figurinhas</h2>
          <p className="mt-1 text-sm text-[#5f5f5f]">
            {sparse ? (
              <>
                Modo rápido: marque o que <strong>falta</strong> em Preciso e o
                que está <strong>repetido</strong>. O resto já conta como no
                álbum.
              </>
            ) : (
              <>
                Marque tudo que você tem na aba <strong>Tenho</strong>.
                Repetidas e Preciso são calculados automaticamente.
              </>
            )}
          </p>
        </div>
        <CollectionModeSwitcher currentMode={resolvedMode} />
      </div>

      <Gabarito
        sections={sections}
        initialOwned={owned}
        entryMode={resolvedMode}
        initialReservedGive={[...reservations.give.keys()]}
        initialReservedGiveCounts={Object.fromEntries(reservations.give)}
        initialReservedReceive={[...reservations.receive]}
      />
    </div>
  );
}

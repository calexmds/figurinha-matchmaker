import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Gabarito } from "@/components/gabarito";
import { CollectionModeSwitcher } from "@/components/collection-mode-switcher";
import { CollectionModeGuide } from "@/components/collection-mode-guide";
import { Callout } from "@/components/ui/callout";
import { buildGabaritoSections } from "@/lib/stickers/catalog";
import {
  countOwnedTypes,
  deriveNeeds,
  isSparseMode,
} from "@/lib/stickers/collection";
import { TOTAL_STICKERS } from "@/lib/constants";
import { getUserCollection } from "@/lib/data";
import { getUserReservations } from "@/lib/trades";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode_set?: string; error?: string; tab?: string }>;
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
  const sparse = isSparseMode(resolvedMode);
  const needCount = deriveNeeds(owned).length;
  const markedCount = sparse
    ? TOTAL_STICKERS - needCount
    : countOwnedTypes(owned);
  const repetidasTypes = Object.values(owned).filter((q) => q > 1).length;

  const modeJustSet =
    query.mode_set === "sparse" ||
    query.mode_set === "have" ||
    query.mode_set === "1";

  const initialTab =
    query.tab === "repetidas"
      ? ("repetidas" as const)
      : query.tab === "preciso"
        ? ("preciso" as const)
        : query.tab === "tenho"
          ? ("tenho" as const)
          : undefined;

  return (
    <div className="space-y-4">
      {query.error ? (
        <Callout variant="error" className="p-4">
          {decodeURIComponent(query.error)}
        </Callout>
      ) : null}

      {modeJustSet ? (
        <Callout variant="success" className="p-4">
          {query.mode_set === "sparse" || (sparse && query.mode_set === "1") ? (
            <>
              Modo rápido ativado! Comece pela aba{" "}
              <strong className="text-ink">Preciso</strong> — marque só o que
              falta. Use a busca se souber o código ou seleção.
            </>
          ) : query.mode_set === "have" ? (
            <>
              Modo Tenho ativado! Marque cada figurinha que você possui na aba{" "}
              <strong className="text-ink">Tenho</strong>.
            </>
          ) : (
            <>Modo configurado! Continue marcando suas figurinhas abaixo.</>
          )}
        </Callout>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CollectionModeGuide
          mode={resolvedMode}
          needCount={needCount}
          repetidasTypes={repetidasTypes}
          ownedTypes={markedCount}
        />
        <CollectionModeSwitcher
          currentMode={resolvedMode}
          markedCount={markedCount}
          needCount={needCount}
          repetidasTypes={repetidasTypes}
        />
      </div>

      <Gabarito
        sections={sections}
        initialOwned={owned}
        entryMode={resolvedMode}
        initialTab={initialTab}
        initialReservedGive={[...reservations.give.keys()]}
        initialReservedGiveCounts={Object.fromEntries(reservations.give)}
        initialReservedReceive={[...reservations.receive]}
      />
    </div>
  );
}

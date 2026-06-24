import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CollectionModeWelcome } from "@/components/collection-mode-welcome";

export default async function OnboardingWelcomePage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("collection_entry_mode")
    .eq("id", user.id)
    .maybeSingle();

  const mode = profile?.collection_entry_mode;
  if (mode === "have" || mode === "sparse") {
    redirect("/onboarding");
  }

  return (
    <div className="py-4">
      <CollectionModeWelcome />
    </div>
  );
}

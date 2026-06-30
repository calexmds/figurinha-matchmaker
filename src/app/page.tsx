import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { CopaHero } from "@/components/ui/copa-hero";
import {
  LANDING_HEADLINE_SHORT,
  LANDING_TRUST_SHORT,
  PRIMARY_CTA_CREATE_GROUP_SHORT,
} from "@/lib/marketing-copy";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  const createGroupHref = `/api/auth/google?next=${encodeURIComponent("/grupo")}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <CopaHero
        size="landing"
        eyebrow="Copa do Mundo 2026"
        title={LANDING_HEADLINE_SHORT}
        action={
          <ButtonLink
            href={createGroupHref}
            variant="onBrand"
            fullWidth
            className="min-h-12 text-base font-bold"
          >
            {PRIMARY_CTA_CREATE_GROUP_SHORT}
          </ButtonLink>
        }
      />

      <p className="mt-4 text-center text-sm text-ink-soft">
        {LANDING_TRUST_SHORT}
      </p>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link
          href="/login?next=/grupo"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Já tem convite?
        </Link>
      </p>
    </main>
  );
}

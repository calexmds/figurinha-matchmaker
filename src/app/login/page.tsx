import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { InAppBrowserBanner } from "@/components/in-app-browser-banner";
import { CopaBadge } from "@/components/copa-badge";
import { Callout } from "@/components/ui/callout";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath =
    params.next?.startsWith("/") ? params.next : "/home";

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <InAppBrowserBanner />

      <div className="fluent-card p-8">
        <div className="mb-4 flex items-center gap-3">
          <CopaBadge size={48} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Copa 2026
            </p>
            <h1 className="font-display text-2xl font-bold text-ink">{APP_NAME}</h1>
          </div>
        </div>

        {params.error ? (
          <Callout variant="error" className="mb-4 p-4">
            Não foi possível entrar. Tente novamente com Google.
          </Callout>
        ) : null}

        <AuthPanel nextPath={nextPath} />
      </div>
    </main>
  );
}

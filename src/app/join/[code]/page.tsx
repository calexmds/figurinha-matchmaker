import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { InAppBrowserBanner } from "@/components/in-app-browser-banner";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_NAME } from "@/lib/constants";
import { normalizeInviteCode } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";
import { lookupGroupByInvite } from "@/lib/group-join";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; login?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const inviteCode = normalizeInviteCode(code);
  const supabase = await createClient();

  const groupData = await lookupGroupByInvite(supabase, inviteCode);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/join/${inviteCode}`;

  if (!groupData) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <InAppBrowserBanner />
        <EmptyState
          icon="group"
          title="Convite inválido"
          description={`O código ${inviteCode} não foi encontrado.`}
        />
      </main>
    );
  }

  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupData.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      redirect("/home");
    }

    redirect(`/api/join/${inviteCode}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <InAppBrowserBanner
        url={`https://www.figurinhamatchmaker.com.br/join/${inviteCode}`}
      />

      <div className="fluent-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Convite
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold text-ink">
          {groupData.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Você foi convidado para trocar figurinhas no {APP_NAME}. Entre e
          marque o que você tem no gabarito.
        </p>

        {query.error ? (
          <Callout variant="error" className="mt-4 p-4">
            {decodeURIComponent(query.error)}
          </Callout>
        ) : null}

        <div className="mt-8">
          <AuthPanel nextPath={nextPath} groupName={groupData.name} compact />
        </div>
      </div>
    </main>
  );
}

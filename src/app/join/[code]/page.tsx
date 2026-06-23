import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { InAppBrowserBanner } from "@/components/in-app-browser-banner";
import { APP_NAME } from "@/lib/constants";
import { normalizeInviteCode } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";

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

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/join/${inviteCode}`;

  if (!group) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <InAppBrowserBanner />
        <div className="fluent-card p-8 text-center">
          <h1 className="text-2xl font-bold text-[#1b1b1b]">Convite inválido</h1>
          <p className="mt-3 text-sm text-[#5f5f5f]">
            O código <strong>{inviteCode}</strong> não foi encontrado.
          </p>
        </div>
      </main>
    );
  }

  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      redirect("/home");
    }

    // Já logado: entra no grupo automaticamente (1 passo só)
    redirect(`/api/join/${inviteCode}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <InAppBrowserBanner
        url={`https://www.figurinhamatchmaker.com.br/join/${inviteCode}`}
      />

      <div className="fluent-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
          Convite
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#1b1b1b]">{group.name}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
          Você foi convidado para trocar figurinhas no {APP_NAME}. Entre e
          marque repetidas e o que falta no gabarito.
        </p>

        {query.error ? (
          <p className="mt-4 rounded-md border border-[#f3c9c5] bg-[#fdf0ef] px-4 py-3 text-sm text-[#c42b1c]">
            {decodeURIComponent(query.error)}
          </p>
        ) : null}

        <div className="mt-8">
          <AuthPanel nextPath={nextPath} groupName={group.name} compact />
        </div>
      </div>
    </main>
  );
}

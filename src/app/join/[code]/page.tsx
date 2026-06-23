import Link from "next/link";
import { joinGroupByCode } from "@/app/actions";
import { APP_NAME } from "@/lib/constants";
import { normalizeInviteCode } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";
import { JoinGroupButton } from "@/components/join-group-button";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
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

  if (!group) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="fluent-card p-8 text-center">
          <h1 className="text-2xl font-bold text-[#1b1b1b]">Convite inválido</h1>
          <p className="mt-3 text-sm text-[#5f5f5f]">
            O código <strong>{inviteCode}</strong> não foi encontrado.
          </p>
        </div>
      </main>
    );
  }

  async function joinAction() {
    "use server";
    await joinGroupByCode(inviteCode);
  }

  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
          <div className="fluent-card p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
              Convite
            </p>
            <h1 className="mt-3 text-2xl font-bold text-[#1b1b1b]">
              {group.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
              Você já faz parte deste grupo.
            </p>
            <Link
              href="/home"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
            >
              Ir para o app
            </Link>
          </div>
        </main>
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="fluent-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
          Convite
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#1b1b1b]">{group.name}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
          Você foi convidado para trocar figurinhas no {APP_NAME}. Entre e
          registre suas repetidas para ver sugestões de troca com o grupo.
        </p>

        {user ? (
          <form action={joinAction} className="mt-8">
            <JoinGroupButton />
          </form>
        ) : (
          <div className="mt-8">
            <JoinGroupButton loginHref={`/login?next=/join/${inviteCode}`} />
          </div>
        )}
      </div>
    </main>
  );
}

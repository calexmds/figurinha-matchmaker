import { redirect } from "next/navigation";
import { createGroup, setActiveGroup, signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildInviteMessage } from "@/lib/whatsapp";
import { APP_URL } from "@/lib/constants";
import { getActiveGroup } from "@/lib/data";

export default async function GroupPage() {
  const { supabase, user, profile } = await requireUser();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, invite_code, owner_id)")
    .eq("user_id", user.id);

  const groups = (memberships ?? [])
    .map((m) => {
      const g = m.groups as
        | { id: string; name: string; invite_code: string; owner_id: string }
        | { id: string; name: string; invite_code: string; owner_id: string }[]
        | null;
      return Array.isArray(g) ? g[0] : g;
    })
    .filter(Boolean);

  const activeGroup = await getActiveGroup(
    supabase,
    user.id,
    profile?.active_group_id ?? null,
  );

  const memberRows = activeGroup
    ? await supabase
        .from("group_members")
        .select("user_id, joined_at, profiles(name, avatar_url)")
        .eq("group_id", activeGroup.id)
    : { data: [] };

  async function createGroupAction(formData: FormData) {
    "use server";
    const result = await createGroup(formData);
    if (result?.error) {
      redirect(`/grupo?error=${encodeURIComponent(result.error)}`);
    }
  }

  async function activateGroup(formData: FormData) {
    "use server";
    const groupId = String(formData.get("groupId") ?? "");
    await setActiveGroup(groupId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1b1b1b]">Grupo de troca</h1>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Convide amigos e família. O match só cruza figurinhas dentro do grupo.
        </p>
      </div>

      <form action={createGroupAction} className="fluent-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-[#1b1b1b]">Criar novo grupo</h2>
        <input
          name="name"
          placeholder="Ex: Família Silva, Escola ABC"
          className="w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm text-[#1b1b1b] placeholder:text-[#9a9a9a] focus:border-[#0067c0] focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#005aa8]"
        >
          Criar grupo
        </button>
      </form>

      {groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1b1b1b]">Seus grupos</h2>
          {groups.map((group) =>
            group ? (
              <form
                key={group.id}
                action={activateGroup}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  activeGroup?.id === group.id
                    ? "border-[#0067c0] bg-[#eaf3fb]"
                    : "border-[#e6e6e6] bg-white"
                }`}
              >
                <div>
                  <p className="font-semibold text-[#1b1b1b]">{group.name}</p>
                  <p className="text-xs text-[#8a8a8a]">{group.invite_code}</p>
                </div>
                <input type="hidden" name="groupId" value={group.id} />
                <button
                  type="submit"
                  className={`rounded-md px-3 py-2 text-xs font-semibold ${
                    activeGroup?.id === group.id
                      ? "bg-[#0067c0] text-white"
                      : "border border-[#d0d0d0] text-[#1b1b1b]"
                  }`}
                >
                  {activeGroup?.id === group.id ? "Ativo" : "Ativar"}
                </button>
              </form>
            ) : null,
          )}
        </section>
      ) : null}

      {activeGroup ? (
        <section className="fluent-card space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#1b1b1b]">
              {activeGroup.name}
            </h2>
            <p className="mt-1 text-sm text-[#5f5f5f]">
              Código:{" "}
              <code className="font-semibold text-[#0067c0]">
                {activeGroup.invite_code}
              </code>
            </p>
            <p className="mt-1 break-all text-xs text-[#8a8a8a]">
              {APP_URL}/join/{activeGroup.invite_code}
            </p>
          </div>

          <WhatsAppShareButton
            message={buildInviteMessage(activeGroup.name, activeGroup.invite_code)}
            className="w-full"
          />

          <div>
            <h3 className="text-sm font-semibold text-[#1b1b1b]">Membros</h3>
            <ul className="mt-3 space-y-2">
              {(memberRows.data ?? []).map((member) => {
                const p = member.profiles as
                  | { name: string | null; avatar_url: string | null }
                  | { name: string | null; avatar_url: string | null }[]
                  | null;
                const prof = Array.isArray(p) ? p[0] : p;
                return (
                  <li
                    key={member.user_id}
                    className="rounded-md border border-[#eee] bg-[#fafafa] px-3 py-2 text-sm text-[#1b1b1b]"
                  >
                    {prof?.name ?? "Colecionador"}
                    {member.user_id === user.id ? " (você)" : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <form action={signOut} className="pt-2">
        <button
          type="submit"
          className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-medium text-[#5f5f5f] active:bg-[#f0f0f0]"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}

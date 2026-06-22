import { redirect } from "next/navigation";
import { createGroup, setActiveGroup } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import {
  WhatsAppShareButton,
  buildInviteMessage,
} from "@/components/whatsapp-share";
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
        <h1 className="text-2xl font-bold text-white">Grupo de troca</h1>
        <p className="mt-2 text-sm text-slate-300">
          Convide amigos e família. O match só cruza figurinhas dentro do grupo.
        </p>
      </div>

      <form
        action={createGroupAction}
        className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5"
      >
        <h2 className="text-lg font-semibold text-white">Criar novo grupo</h2>
        <input
          name="name"
          placeholder="Ex: Família Silva, Escola ABC"
          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Criar grupo
        </button>
      </form>

      {groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Seus grupos</h2>
          {groups.map((group) =>
            group ? (
              <form
                key={group.id}
                action={activateGroup}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  activeGroup?.id === group.id
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div>
                  <p className="font-semibold text-white">{group.name}</p>
                  <p className="text-xs text-slate-400">{group.invite_code}</p>
                </div>
                <input type="hidden" name="groupId" value={group.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white"
                >
                  {activeGroup?.id === group.id ? "Ativo" : "Ativar"}
                </button>
              </form>
            ) : null,
          )}
        </section>
      ) : null}

      {activeGroup ? (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{activeGroup.name}</h2>
            <p className="mt-1 text-sm text-slate-300">
              Código: <code className="text-emerald-300">{activeGroup.invite_code}</code>
            </p>
            <p className="mt-1 break-all text-xs text-slate-400">
              {APP_URL}/join/{activeGroup.invite_code}
            </p>
          </div>

          <WhatsAppShareButton
            message={buildInviteMessage(activeGroup.name, activeGroup.invite_code)}
            className="w-full"
          />

          <div>
            <h3 className="text-sm font-semibold text-slate-200">Membros</h3>
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
                    className="rounded-xl bg-slate-950/60 px-3 py-2 text-sm text-white"
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
    </div>
  );
}

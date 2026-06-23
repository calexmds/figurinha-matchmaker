import { redirect } from "next/navigation";
import { createGroup, signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { GroupCard } from "@/components/group-card";
import { getUserGroupsWithMembers } from "@/lib/groups";

export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const groups = await getUserGroupsWithMembers(supabase, user.id);

  async function createGroupAction(formData: FormData) {
    "use server";
    const result = await createGroup(formData);
    if (result?.error) {
      redirect(`/grupo?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1b1b1b]">Grupo de troca</h1>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Crie grupos para família, amigos ou colegas. Todas as trocas aparecem
          juntas na aba Trocas — sem precisar ativar um grupo por vez.
        </p>
      </div>

      {query.error ? (
        <p className="rounded-md border border-[#f3c9c5] bg-[#fdf0ef] px-4 py-3 text-sm text-[#c42b1c]">
          {decodeURIComponent(query.error)}
        </p>
      ) : null}

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
          <p className="text-sm text-[#5f5f5f]">
            Toque no grupo para ver participantes e convite. Grupos novos já
            entram nas sugestões de troca automaticamente.
          </p>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={user.id}
            />
          ))}
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

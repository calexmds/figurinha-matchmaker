import { redirect } from "next/navigation";
import { createGroup, joinGroupWithCode, signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { GroupCard } from "@/components/group-card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { getUserGroupsWithMembers } from "@/lib/groups";
import { buildGroupProgress } from "@/lib/group-progress";
import { getCachedGroupTradeData } from "@/lib/group-trade-data";

export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const groups = await getUserGroupsWithMembers(supabase, user.id);

  const groupsWithProgress = await Promise.all(
    groups.map(async (group) => {
      const tradeData = await getCachedGroupTradeData(
        supabase,
        group.id,
        user.id,
      );
      return {
        group,
        progress: buildGroupProgress(group.members, tradeData, user.id),
      };
    }),
  );

  async function createGroupAction(formData: FormData) {
    "use server";
    const result = await createGroup(formData);
    if (result?.error) {
      redirect(`/grupo?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-ink-soft">
        Crie grupos para família, amigos ou colegas. Todas as trocas aparecem
        juntas na aba Trocas — sem precisar ativar um grupo por vez.
      </p>

      {query.error ? (
        <Callout variant="error">{decodeURIComponent(query.error)}</Callout>
      ) : null}

      <form action={createGroupAction} className="fluent-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-ink">Criar novo grupo</h2>
        <Input
          name="name"
          placeholder="Ex: Família Silva, Escola ABC"
          required
        />
        <Button type="submit" fullWidth>
          Criar grupo
        </Button>
      </form>

      <form action={joinGroupWithCode} className="fluent-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-ink">Entrar com código</h2>
        <p className="text-sm text-ink-soft">
          Cole o código do convite (ex.: COPA-AB12) recebido no WhatsApp.
        </p>
        <Input
          name="inviteCode"
          placeholder="COPA-XXXX"
          className="uppercase placeholder:normal-case"
          required
        />
        <Button type="submit" variant="outline" fullWidth>
          Entrar no grupo
        </Button>
      </form>

      {groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Seus grupos</h2>
          <p className="text-sm text-ink-soft">
            Toque no grupo para ver participantes e convite. Grupos novos já
            entram nas sugestões de troca automaticamente.
          </p>
          {groupsWithProgress.map(({ group, progress }) => (
            <GroupCard
              key={group.id}
              group={group}
              progress={progress}
              currentUserId={user.id}
            />
          ))}
        </section>
      ) : null}

      <form action={signOut} className="pt-2">
        <Button type="submit" variant="ghost" fullWidth>
          Sair da conta
        </Button>
      </form>
    </div>
  );
}

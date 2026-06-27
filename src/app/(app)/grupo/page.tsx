import { redirect } from "next/navigation";
import { createGroup, joinGroupWithCode, signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { GroupCard } from "@/components/group-card";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { getUserGroupsWithMembers } from "@/lib/groups";
import { buildGroupProgress } from "@/lib/group-progress";
import { getCachedGroupTradeData } from "@/lib/group-trade-data";
import { normalizeInviteCode } from "@/lib/invite";
import {
  GROUP_CREATED_BODY,
  GROUP_CREATED_TITLE,
  PRIMARY_CTA_CREATE_GROUP,
  WHATSAPP_SHARE_LABEL,
} from "@/lib/marketing-copy";
import { buildInviteMessage } from "@/lib/whatsapp";

export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const groups = await getUserGroupsWithMembers(supabase, user.id);

  const createdCode = query.created
    ? normalizeInviteCode(query.created)
    : null;
  const createdGroup = createdCode
    ? groups.find((g) => g.inviteCode === createdCode)
    : null;

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
      {createdGroup ? (
        <Callout variant="success" title={GROUP_CREATED_TITLE}>
          <p>{GROUP_CREATED_BODY}</p>
          <div className="mt-4 flex flex-col gap-2">
            <WhatsAppShareButton
              message={buildInviteMessage(
                createdGroup.name,
                createdGroup.inviteCode,
              )}
              label={WHATSAPP_SHARE_LABEL}
              className="w-full"
            />
            <ButtonLink href="/onboarding" variant="outline" fullWidth>
              Cadastrar minhas figurinhas
            </ButtonLink>
          </div>
        </Callout>
      ) : null}

      <p className="text-sm leading-6 text-ink-soft">
        O app oficial do seu grupo de troca. Crie para família, escola, trabalho,
        bairro ou papelaria — cada pessoa marca o álbum e o match acontece
        automaticamente.
      </p>

      {query.error ? (
        <Callout variant="error">{decodeURIComponent(query.error)}</Callout>
      ) : null}

      <form action={createGroupAction} className="fluent-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-ink">Novo grupo de troca</h2>
        <Input
          name="name"
          placeholder="Ex: Família Silva, Escola ABC, Papelaria do Zé"
          required
        />
        <Button type="submit" fullWidth className="min-h-12">
          {PRIMARY_CTA_CREATE_GROUP}
        </Button>
      </form>

      <form action={joinGroupWithCode} className="fluent-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-ink">Entrar com convite</h2>
        <p className="text-sm text-ink-soft">
          Recebeu link ou código no WhatsApp? Cole aqui.
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
            Toque no grupo para convidar mais gente ou ver quem já cadastrou.
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

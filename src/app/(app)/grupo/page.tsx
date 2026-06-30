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
  GROUP_CREATED_BODY_SHORT,
  GROUP_CREATED_TITLE_SHORT,
  HOME_CTA_MARK_ALBUM,
  PRIMARY_CTA_CREATE_GROUP_SHORT,
  WHATSAPP_SHARE_LABEL_SHORT,
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

  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-6">
      {createdGroup ? (
        <Callout variant="success" title={GROUP_CREATED_TITLE_SHORT}>
          <p>{GROUP_CREATED_BODY_SHORT}</p>
          <div className="mt-4 flex flex-col gap-2">
            <WhatsAppShareButton
              message={buildInviteMessage(
                createdGroup.name,
                createdGroup.inviteCode,
              )}
              label={WHATSAPP_SHARE_LABEL_SHORT}
              className="w-full"
            />
            <ButtonLink href="/onboarding" variant="outline" fullWidth>
              {HOME_CTA_MARK_ALBUM}
            </ButtonLink>
          </div>
        </Callout>
      ) : null}

      {query.error ? (
        <Callout variant="error">{decodeURIComponent(query.error)}</Callout>
      ) : null}

      {hasGroups ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Seus grupos</h2>
          {groupsWithProgress.map(({ group, progress }) => (
            <GroupCard
              key={group.id}
              group={group}
              progress={progress}
              currentUserId={user.id}
            />
          ))}
        </section>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Crie o grupo da família, escola ou bairro.
          </p>

          <form action={createGroupAction} className="fluent-card space-y-4 p-5">
            <Input
              name="name"
              placeholder="Ex: Família Silva, Escola ABC"
              required
            />
            <Button type="submit" fullWidth className="min-h-12">
              {PRIMARY_CTA_CREATE_GROUP_SHORT}
            </Button>
          </form>

          <details className="fluent-card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-accent">
              Já tem convite?
            </summary>
            <form action={joinGroupWithCode} className="mt-4 space-y-3">
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
          </details>
        </>
      )}

      {hasGroups ? (
        <details className="fluent-card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
            Criar ou entrar em outro grupo
          </summary>
          <div className="mt-4 space-y-4">
            <form action={createGroupAction} className="space-y-3">
              <Input
                name="name"
                placeholder="Nome do novo grupo"
                required
              />
              <Button type="submit" variant="outline" fullWidth>
                Criar grupo
              </Button>
            </form>
            <form action={joinGroupWithCode} className="space-y-3">
              <Input
                name="inviteCode"
                placeholder="COPA-XXXX"
                className="uppercase placeholder:normal-case"
                required
              />
              <Button type="submit" variant="ghost" fullWidth>
                Entrar com código
              </Button>
            </form>
          </div>
        </details>
      ) : null}

      <form action={signOut} className="pt-2">
        <Button type="submit" variant="ghost" fullWidth>
          Sair da conta
        </Button>
      </form>
    </div>
  );
}

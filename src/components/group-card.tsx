"use client";

import { useState } from "react";
import {
  deleteGroup,
  removeGroupMember,
  updateGroupName,
} from "@/app/actions";
import type { UserGroupDetail } from "@/lib/groups";
import type { GroupProgress } from "@/lib/group-progress";
import { formatRegistrationSummary } from "@/lib/group-progress";
import { APP_URL } from "@/lib/constants";
import {
  WhatsAppShareButton,
  CopyInviteButton,
} from "@/components/whatsapp-share";
import { buildInviteMessage, buildNudgeMessage } from "@/lib/whatsapp";
import { Button, ButtonLink, getButtonClassName } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { ChevronIcon } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

type GroupCardProps = {
  group: UserGroupDetail;
  progress: GroupProgress;
  currentUserId: string;
};

export function GroupCard({ group, progress, currentUserId }: GroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const registrationPercent =
    progress.memberCount > 0
      ? Math.round((progress.registeredCount / progress.memberCount) * 100)
      : 0;
  const needsMoreMembers = progress.memberCount < 2;
  const hasPendingRegistration =
    progress.pendingMembers.length > 0 && progress.memberCount >= 2;
  const registrationSummary = formatRegistrationSummary(group.name, progress);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("groupId", group.id);
    fd.set("name", editName);
    const result = await updateGroupName(fd);
    setBusy(false);
    if (result?.error) {
      setEditError(result.error);
      return;
    }
    setEditing(false);
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Excluir o grupo "${group.name}"? Todos os membros e trocas pendentes serão removidos.`,
    );
    if (!ok) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("groupId", group.id);
    await deleteGroup(fd);
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    const isSelf = memberId === currentUserId;
    const msg = isSelf
      ? `Sair do grupo "${group.name}"?`
      : `Remover ${memberName} do grupo?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("groupId", group.id);
    fd.set("memberId", memberId);
    await removeGroupMember(fd);
  }

  return (
    <article className="fluent-card overflow-hidden">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-expanded={expanded}
        >
          <ChevronIcon expanded={expanded} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={handleSaveName} className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-w-0 flex-1 px-2 py-1 text-sm"
                  required
                  disabled={busy}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className={getButtonClassName("primary", {
                    className: "shrink-0 px-2 py-1 text-xs",
                  })}
                  onClick={(e) => e.stopPropagation()}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={getButtonClassName("secondary", {
                    className: "shrink-0 px-2 py-1 text-xs",
                  })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(false);
                    setEditName(group.name);
                    setEditError(null);
                  }}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <p className="truncate font-semibold text-ink">{group.name}</p>
                <p className="text-xs text-ink-muted">
                  {group.inviteCode} · {group.memberCount}{" "}
                  {group.memberCount === 1 ? "membro" : "membros"}
                </p>
                {!editing && progress.memberCount > 0 ? (
                  <p className="mt-1 text-xs font-medium text-accent">
                    {registrationSummary}
                    {progress.collectiveOwnedCount > 0 ? (
                      <>
                        {" "}
                        · álbum {progress.collectivePercent}% coberto pelo grupo
                      </>
                    ) : null}
                  </p>
                ) : null}
              </>
            )}
            {editError ? (
              <p className="mt-1 text-xs text-error">{editError}</p>
            ) : null}
          </div>
        </button>

        {!editing ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {group.isOwner ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                  className="min-h-8 px-2.5 py-1.5 text-xs"
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={handleDelete}
                  className="min-h-8 px-2.5 py-1.5 text-xs"
                >
                  Excluir
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => handleRemoveMember(currentUserId, "você")}
                className="min-h-8 px-2.5 py-1.5 text-xs"
              >
                Sair
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {!editing && progress.memberCount > 0 ? (
        <div className="px-4 pb-3">
          <div className="h-2 overflow-hidden rounded-full bg-mica">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${registrationPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-4 border-t border-line bg-mica/50 px-4 py-4">
          {needsMoreMembers ? (
            <Callout variant="warning" title="Convide mais alguém" className="p-4">
              <p className="text-xs">
                Trocas só funcionam com 2 ou mais pessoas no grupo.
              </p>
            </Callout>
          ) : null}

          {hasPendingRegistration ? (
            <Callout variant="success" className="p-4">
              <p className="font-semibold">
                {progress.registeredCount} de {progress.memberCount} já
                cadastraram figurinhas
              </p>
              {progress.collectiveOwnedCount > 0 ? (
                <p className="mt-1 text-xs">
                  Juntos vocês cobrem {progress.collectiveOwnedCount} de 980
                  figurinhas ({progress.collectivePercent}% do álbum).
                </p>
              ) : null}
            </Callout>
          ) : progress.memberCount >= 2 ? (
            <Callout variant="success" className="p-4">
              <p className="font-semibold">
                Todos cadastraram — prontos para trocar!
              </p>
              {progress.collectiveOwnedCount > 0 ? (
                <p className="mt-1 text-xs">
                  Álbum do grupo: {progress.collectiveOwnedCount}/980 (
                  {progress.collectivePercent}%).
                </p>
              ) : null}
            </Callout>
          ) : null}

          <div>
            <p className="text-xs text-ink-soft">
              Link de convite:{" "}
              <span className="break-all font-mono text-accent">
                {APP_URL}/join/{group.inviteCode}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <WhatsAppShareButton
                message={buildInviteMessage(group.name, group.inviteCode)}
                label={
                  needsMoreMembers
                    ? "Convidar no WhatsApp"
                    : "Convidar de novo no WhatsApp"
                }
                className="w-full"
              />
              <CopyInviteButton
                text={buildInviteMessage(group.name, group.inviteCode)}
                className="w-full"
              />
            </div>
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              No iPhone, se o WhatsApp abrir vazio, use{" "}
              <strong>Copiar convite</strong> e cole na conversa.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              Participantes
              {group.isOwner ? (
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  (você gerencia)
                </span>
              ) : null}
            </h3>
            <ul className="mt-3 space-y-2">
              {progress.members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isOwnerMember = member.userId === group.ownerId;
                const gm = group.members.find((m) => m.userId === member.userId);
                return (
                  <li
                    key={member.userId}
                    className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-ink">
                          {member.name}
                          {isSelf ? " (você)" : ""}
                          {isOwnerMember ? (
                            <span className="ml-1 text-xs text-accent">
                              · criador
                            </span>
                          ) : null}
                        </span>
                        <p
                          className={cn(
                            "mt-0.5 text-xs font-semibold",
                            member.hasRegistered
                              ? "text-win-green"
                              : "text-win-amber",
                          )}
                        >
                          {member.hasRegistered
                            ? `Cadastrou${member.ownedCount > 0 ? ` · ${member.ownedCount} figurinhas` : ""}`
                            : "Pendente — ainda não marcou figurinhas"}
                        </p>
                      </div>
                      {group.isOwner && !isSelf ? (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={busy}
                          onClick={() =>
                            handleRemoveMember(member.userId, member.name)
                          }
                          className="min-h-8 shrink-0 px-2 py-1 text-xs"
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                    {!member.hasRegistered ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        {isSelf ? (
                          <ButtonLink
                            href="/onboarding"
                            className="min-h-9 flex-1 px-3 py-2 text-xs"
                          >
                            Cadastrar minhas figurinhas
                          </ButtonLink>
                        ) : (
                          <WhatsAppShareButton
                            message={buildNudgeMessage(
                              group.name,
                              group.inviteCode,
                              gm?.name ?? member.name,
                            )}
                            label={`Lembrar ${member.name.split(" ")[0]}`}
                            className="min-h-9 flex-1 px-3 py-2 text-xs"
                          />
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </article>
  );
}

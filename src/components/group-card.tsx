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
    <article className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-white">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span
            className={`shrink-0 text-[#8a8a8a] transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={handleSaveName} className="flex gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-[#d0d0d0] px-2 py-1 text-sm"
                  required
                  disabled={busy}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="shrink-0 rounded-md bg-[#0067c0] px-2 py-1 text-xs font-semibold text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded-md border border-[#d0d0d0] px-2 py-1 text-xs"
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
                <p className="truncate font-semibold text-[#1b1b1b]">{group.name}</p>
                <p className="text-xs text-[#8a8a8a]">
                  {group.inviteCode} · {group.memberCount}{" "}
                  {group.memberCount === 1 ? "membro" : "membros"}
                </p>
                {!editing && progress.memberCount > 0 ? (
                  <p className="mt-1 text-xs font-medium text-[#0067c0]">
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
              <p className="mt-1 text-xs text-[#c42b1c]">{editError}</p>
            ) : null}
          </div>
        </button>

        {!editing ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {group.isOwner ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                  className="rounded-md border border-[#d0d0d0] px-2.5 py-1.5 text-xs font-semibold text-[#1b1b1b] active:bg-[#f5f5f5]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="rounded-md border border-[#f3c9c5] px-2.5 py-1.5 text-xs font-semibold text-[#c42b1c] active:bg-[#fdf0ef]"
                >
                  Excluir
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRemoveMember(currentUserId, "você")}
                className="rounded-md border border-[#d0d0d0] px-2.5 py-1.5 text-xs font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
              >
                Sair
              </button>
            )}
          </div>
        ) : null}
      </div>

      {!editing && progress.memberCount > 0 ? (
        <div className="px-4 pb-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#eee]">
            <div
              className="h-full rounded-full bg-[#0067c0] transition-all"
              style={{ width: `${registrationPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-4 border-t border-[#eee] bg-[#fafafa] px-4 py-4">
          {needsMoreMembers ? (
            <div className="rounded-lg border border-[#ecdfc0] bg-[#fffbf0] p-4">
              <p className="text-sm font-semibold text-[#9a6700]">
                Convide mais alguém
              </p>
              <p className="mt-1 text-xs leading-5 text-[#5f5f5f]">
                Trocas só funcionam com 2 ou mais pessoas no grupo.
              </p>
            </div>
          ) : null}

          {hasPendingRegistration ? (
            <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-4">
              <p className="text-sm font-semibold text-[#0f7b0f]">
                {progress.registeredCount} de {progress.memberCount} já
                cadastraram figurinhas
              </p>
              {progress.collectiveOwnedCount > 0 ? (
                <p className="mt-1 text-xs text-[#5f5f5f]">
                  Juntos vocês cobrem {progress.collectiveOwnedCount} de 980
                  figurinhas ({progress.collectivePercent}% do álbum).
                </p>
              ) : null}
            </div>
          ) : progress.memberCount >= 2 ? (
            <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-4">
              <p className="text-sm font-semibold text-[#0f7b0f]">
                Todos cadastraram — prontos para trocar!
              </p>
              {progress.collectiveOwnedCount > 0 ? (
                <p className="mt-1 text-xs text-[#5f5f5f]">
                  Álbum do grupo: {progress.collectiveOwnedCount}/980 (
                  {progress.collectivePercent}%).
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-xs text-[#5f5f5f]">
              Link de convite:{" "}
              <span className="break-all font-mono text-[#0067c0]">
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
            <p className="mt-2 text-[11px] leading-4 text-[#8a8a8a]">
              No iPhone, se o WhatsApp abrir vazio, use{" "}
              <strong>Copiar convite</strong> e cole na conversa.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1b1b1b]">
              Participantes
              {group.isOwner ? (
                <span className="ml-2 text-xs font-normal text-[#8a8a8a]">
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
                    className="rounded-md border border-[#eee] bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[#1b1b1b]">
                          {member.name}
                          {isSelf ? " (você)" : ""}
                          {isOwnerMember ? (
                            <span className="ml-1 text-xs text-[#0067c0]">
                              · criador
                            </span>
                          ) : null}
                        </span>
                        <p
                          className={`mt-0.5 text-xs font-semibold ${
                            member.hasRegistered
                              ? "text-[#0f7b0f]"
                              : "text-[#9a6700]"
                          }`}
                        >
                          {member.hasRegistered
                            ? `✓ Cadastrou${member.ownedCount > 0 ? ` · ${member.ownedCount} figurinhas` : ""}`
                            : "Pendente — ainda não marcou figurinhas"}
                        </p>
                      </div>
                      {group.isOwner && !isSelf ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleRemoveMember(member.userId, member.name)
                          }
                          className="shrink-0 rounded-md border border-[#f3c9c5] px-2 py-1 text-xs font-semibold text-[#c42b1c]"
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>
                    {!member.hasRegistered ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        {isSelf ? (
                          <a
                            href="/onboarding"
                            className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-[#0067c0] px-3 py-2 text-xs font-semibold text-white active:bg-[#005aa8]"
                          >
                            Cadastrar minhas figurinhas
                          </a>
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

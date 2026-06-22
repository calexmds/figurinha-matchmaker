"use client";

import { APP_URL } from "@/lib/constants";

type WhatsAppShareProps = {
  message: string;
  label?: string;
  className?: string;
};

export function WhatsAppShareButton({
  message,
  label = "Compartilhar no WhatsApp",
  className = "",
}: WhatsAppShareProps) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] ${className}`}
    >
      {label}
    </a>
  );
}

export function buildInviteMessage(groupName: string, inviteCode: string) {
  return `🏆 Grupo de troca Copa 2026 — ${groupName}

Entra aqui para cruzar repetidas e ver sugestões de troca (só nosso grupo):

👉 ${APP_URL}/join/${inviteCode}

Entra com Google e marca suas repetidas tocando no gabarito. Leva 2 minutos.`;
}

export function buildTradeMessage(
  partnerName: string,
  receive: string[],
  give: string[],
) {
  const receiveText =
    receive.length > 0 ? receive.slice(0, 15).join(", ") : "—";
  const giveText = give.length > 0 ? give.slice(0, 15).join(", ") : "—";

  return `Oi ${partnerName}! Vi no Figurinha Matchmaker que combina troca:

Eu te dou: ${giveText}
Você me dá: ${receiveText}

Topa trocar? 🔄
${APP_URL}/trocas`;
}

export function buildProfileMessage(
  duplicates: string[],
  missing: string[],
) {
  const dupText =
    duplicates.length > 0 ? duplicates.slice(0, 20).join(", ") : "nenhuma ainda";
  const missText =
    missing.length > 0 ? missing.slice(0, 20).join(", ") : "nenhuma ainda";

  return `🏆 Minhas figurinhas — Copa 2026

Tenho repetidas:
${dupText}

Preciso:
${missText}

Veja no app: ${APP_URL}/trocas`;
}

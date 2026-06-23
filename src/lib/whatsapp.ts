import { APP_URL } from "@/lib/constants";

export function buildInviteMessage(groupName: string, inviteCode: string) {
  return `🏆 Grupo de troca Copa 2026 — ${groupName}

Entra aqui para cruzar repetidas e ver sugestões de troca (só nosso grupo):

👉 ${APP_URL}/join/${inviteCode}

1) Toque no link acima
2) Entre com Google ou e-mail (link mágico, sem senha)
3) Marque repetidas e o que falta no gabarito — leva ~2 min

Se o botão não abrir no WhatsApp, toque nos ⋮ e escolha "Abrir no Chrome".`;
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

(O app mostra se alguma figurinha está 🔥 quente ou 👑 ouro no grupo — vale negociar!)

Topa trocar? 🔄
${APP_URL}/trocas`;
}

export function buildProfileMessage(duplicates: string[], missing: string[]) {
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

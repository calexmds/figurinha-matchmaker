import { StatCard } from "@/components/stat-card";
import { Callout } from "@/components/ui/callout";
import { getAdminDashboard } from "@/lib/admin-data";
import { cn } from "@/lib/cn";

const dt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const TRADE_STATUS: Record<string, { label: string; className: string }> = {
  proposed: { label: "Proposta", className: "bg-[#eef6ff] text-accent" },
  active: { label: "Ativa", className: "bg-[#fff4e6] text-hot" },
  completed: { label: "Concluída", className: "bg-[#eef7ee] text-win-green" },
  cancelled: { label: "Cancelada", className: "bg-mica text-ink-muted" },
};

const MODE_LABEL: Record<string, string> = {
  unset: "—",
  have: "Tenho",
  sparse: "Rápido",
};

export default async function AdminPage() {
  let dashboard;
  let configError: string | null = null;

  try {
    dashboard = await getAdminDashboard();
  } catch (err) {
    configError =
      err instanceof Error ? err.message : "Erro ao carregar painel admin.";
  }

  if (configError || !dashboard) {
    return (
      <Callout variant="error" title="Painel indisponível">
        {configError ?? "Erro desconhecido."}
        <p className="mt-2 text-xs text-ink-soft">
          Configure <code className="text-ink">ADMIN_EMAIL</code> e{" "}
          <code className="text-ink">SUPABASE_SERVICE_ROLE_KEY</code> no .env
          local e na Vercel.
        </p>
      </Callout>
    );
  }

  const { summary, signupsByDay, users, recentTrades } = dashboard;
  const maxSignup = Math.max(1, ...signupsByDay.map((d) => d.count));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl font-bold text-ink">Resumo</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Métricas agregadas — dados visíveis só para admin.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Usuários" value={summary.totalUsers} accent="blue" />
          <StatCard
            label="Ativos (7d)"
            value={summary.activeUsers7d}
            accent="green"
          />
          <StatCard
            label="Com coleção"
            value={summary.usersWithCollection}
            accent="yellow"
          />
          <StatCard label="Grupos" value={summary.totalGroups} accent="white" />
          <StatCard
            label="Membros"
            value={summary.totalMemberships}
            accent="white"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Trocas concluídas"
            value={summary.tradesCompleted}
            accent="green"
          />
          <StatCard
            label="Trocas ativas"
            value={summary.tradesActive}
            accent="yellow"
          />
          <StatCard
            label="Propostas"
            value={summary.tradesProposed}
            accent="blue"
          />
          <StatCard
            label="Anúncios"
            value={summary.totalListings}
            accent="white"
          />
        </div>
      </section>

      <section className="fluent-card p-5">
        <h3 className="font-display text-base font-bold text-ink">
          Cadastros — últimos 14 dias
        </h3>
        <div className="mt-4 flex items-end gap-1.5 overflow-x-auto pb-1">
          {signupsByDay.map((day) => (
            <div
              key={day.date}
              className="flex min-w-[2rem] flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-bold text-ink">
                {day.count > 0 ? day.count : ""}
              </span>
              <div
                className="w-full min-h-[4px] rounded-t bg-accent/80 transition-all"
                style={{
                  height: `${Math.max(4, (day.count / maxSignup) * 72)}px`,
                  opacity: day.count > 0 ? 1 : 0.15,
                }}
                title={`${day.date}: ${day.count}`}
              />
              <span className="text-[9px] text-ink-muted">
                {dayFmt.format(new Date(`${day.date}T12:00:00`))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-ink">
          Usuários recentes
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Até 250 perfis mais recentes.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-mica text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Cadastro</th>
                <th className="px-4 py-3 font-semibold">Modo</th>
                <th className="px-4 py-3 font-semibold">Coleção</th>
                <th className="px-4 py-3 font-semibold">Grupos</th>
                <th className="px-4 py-3 font-semibold">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {dt.format(new Date(u.createdAt))}
                  </td>
                  <td className="px-4 py-3">{MODE_LABEL[u.entryMode] ?? u.entryMode}</td>
                  <td className="px-4 py-3">
                    {u.hasCollection ? (
                      <span className="text-win-green">Sim</span>
                    ) : (
                      <span className="text-ink-muted">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.groupCount}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {u.lastActivityAt
                      ? dt.format(new Date(u.lastActivityAt))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-ink">
          Trocas recentes
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Últimas 40 combinações registradas.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-mica text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Grupo</th>
                <th className="px-4 py-3 font-semibold">Proponente</th>
                <th className="px-4 py-3 font-semibold">Parceiro</th>
                <th className="px-4 py-3 font-semibold">Criada</th>
                <th className="px-4 py-3 font-semibold">Concluída</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                    Nenhuma troca registrada ainda.
                  </td>
                </tr>
              ) : (
                recentTrades.map((t) => {
                  const status = TRADE_STATUS[t.status] ?? {
                    label: t.status,
                    className: "bg-mica text-ink",
                  };
                  return (
                    <tr key={t.id} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{t.groupName}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{t.userName}</p>
                        <p className="text-xs text-ink-muted">{t.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{t.partnerName}</p>
                        <p className="text-xs text-ink-muted">{t.partnerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {dt.format(new Date(t.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {t.completedAt
                          ? dt.format(new Date(t.completedAt))
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

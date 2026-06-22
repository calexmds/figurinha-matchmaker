type StatCardProps = {
  label: string;
  value: string | number;
  accent?: "green" | "yellow" | "blue" | "white";
};

const accents = {
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  yellow: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  blue: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  white: "border-white/10 bg-white/5 text-white",
};

export function StatCard({ label, value, accent = "white" }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${accents[accent]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  accent?: "green" | "yellow" | "blue" | "white";
};

const accents = {
  green: "text-[#0f7b0f]",
  yellow: "text-[#9a6700]",
  blue: "text-[#0067c0]",
  white: "text-[#1b1b1b]",
};

export function StatCard({ label, value, accent = "white" }: StatCardProps) {
  return (
    <div className="fluent-card p-4">
      <p className="text-xs uppercase tracking-wide text-[#5f5f5f]">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accents[accent]}`}>{value}</p>
    </div>
  );
}

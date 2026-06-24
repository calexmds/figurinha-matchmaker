type StatCardProps = {
  label: string;
  value: string | number;
  accent?: "green" | "yellow" | "blue" | "white";
};

const accents = {
  green: "text-win-green",
  yellow: "text-win-amber",
  blue: "text-accent",
  white: "text-ink",
};

export function StatCard({ label, value, accent = "white" }: StatCardProps) {
  return (
    <div className="fluent-card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`font-display mt-2 text-2xl font-bold ${accents[accent]}`}>
        {value}
      </p>
    </div>
  );
}

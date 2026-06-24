import { cn } from "@/lib/cn";

export type CopaHeroVariant = "brand" | "golden";

type CopaHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  variant?: CopaHeroVariant;
  size?: "compact" | "landing";
  action?: React.ReactNode;
  className?: string;
};

const gradients: Record<CopaHeroVariant, string> = {
  brand: "from-accent via-[#005aa8] to-win-green",
  golden: "from-[#9a6700] via-golden to-[#ff8c00]",
};

export function CopaHero({
  eyebrow,
  title,
  subtitle,
  variant = "brand",
  size = "compact",
  action,
  className,
}: CopaHeroProps) {
  const isLanding = size === "landing";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg",
        gradients[variant],
        isLanding ? "p-8" : "p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-black/10 blur-xl"
        aria-hidden
      />

      <div className="relative">
        {eyebrow ? (
          <p
            className={cn(
              "font-semibold uppercase tracking-[0.2em] text-white/80",
              isLanding ? "text-sm tracking-[0.25em]" : "text-[10px]",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-display font-black leading-tight text-white",
            isLanding ? "mt-2 text-3xl sm:text-4xl" : "mt-1 text-xl",
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <div
            className={cn(
              "leading-6 text-white/90",
              isLanding ? "mt-4 text-base" : "mt-2 text-sm",
            )}
          >
            {subtitle}
          </div>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </section>
  );
}

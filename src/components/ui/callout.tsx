import { cn } from "@/lib/cn";

export type CalloutVariant = "warning" | "success" | "error" | "info";

const variantClasses: Record<CalloutVariant, string> = {
  warning: "border-[#ecdfc0] bg-[#fffbf0] text-win-amber",
  success: "border-[#cfe9cf] bg-[#eef7ee] text-win-green",
  error: "border-[#f3c9c5] bg-[#fdf0ef] text-error",
  info: "border-[#c5ddf5] bg-[#f7fbff] text-accent",
};

type CalloutProps = {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Callout({
  variant = "info",
  title,
  children,
  className,
}: CalloutProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 text-sm leading-6",
        variantClasses[variant],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-2 text-ink-soft" : undefined}>{children}</div>
    </div>
  );
}

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export function getInputClassName(className?: string) {
  return cn(
    "w-full rounded-xl border border-border-soft bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-muted",
    "focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    className,
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={getInputClassName(className)} {...props} />;
});

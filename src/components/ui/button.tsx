import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
} from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "success"
  | "ghost"
  | "danger"
  | "onBrand";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white active:bg-accent-press",
  secondary:
    "border border-border-soft bg-card text-ink-soft active:bg-mica",
  outline:
    "border border-accent bg-card text-accent active:bg-[#eaf3fb]",
  success: "bg-win-green text-white active:bg-[#0c640c]",
  ghost:
    "border border-line bg-card text-ink active:bg-mica",
  danger: "border border-[#f3c9c5] bg-[#fdf0ef] text-error active:bg-[#fce8e6]",
  onBrand:
    "bg-white text-accent shadow-sm active:bg-white/90",
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

export function getButtonClassName(
  variant: ButtonVariant = "primary",
  options?: { fullWidth?: boolean; className?: string },
) {
  return cn(
    baseClasses,
    variantClasses[variant],
    options?.fullWidth && "w-full",
    options?.className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", fullWidth, className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={getButtonClassName(variant, { fullWidth, className })}
        {...props}
      />
    );
  },
);

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function ButtonLink({
  variant = "primary",
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={getButtonClassName(variant, { fullWidth, className })}
      {...props}
    />
  );
}

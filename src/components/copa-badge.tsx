import Image from "next/image";

type CopaBadgeProps = {
  size?: number;
  className?: string;
};

export function CopaBadge({ size = 36, className = "" }: CopaBadgeProps) {
  return (
    <Image
      src="/wc26-badge.svg"
      alt="Copa do Mundo 2026"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

"use client";

type WhatsAppShareProps = {
  message: string;
  label?: string;
  className?: string;
};

export function WhatsAppShareButton({
  message,
  label = "Compartilhar no WhatsApp",
  className = "",
}: WhatsAppShareProps) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] ${className}`}
    >
      {label}
    </a>
  );
}

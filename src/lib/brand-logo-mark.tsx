type BrandLogoMarkProps = {
  size?: number;
};

/** Marca visual compartilhada: figurinha + bola + 26 (Copa sede USA/CAN/MEX). */
export function BrandLogoMark({ size = 120 }: BrandLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="host" x1="8%" y1="8%" x2="92%" y2="92%">
          <stop offset="0%" stopColor="#0067c0" />
          <stop offset="50%" stopColor="#0f7b0f" />
          <stop offset="100%" stopColor="#c8102e" />
        </linearGradient>
        <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef6ff" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="56" fill="url(#host)" opacity="0.14" />
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#host)"
        strokeWidth="3.5"
        fill="none"
      />

      <g transform="translate(60 56) rotate(-7) translate(-42 -34)">
        <rect
          x="0"
          y="0"
          width="84"
          height="68"
          rx="7"
          fill="url(#card)"
          stroke="url(#host)"
          strokeWidth="2.5"
        />
        <rect
          x="6"
          y="6"
          width="72"
          height="56"
          rx="4"
          fill="none"
          stroke="#0067c0"
          strokeWidth="1"
          opacity="0.35"
        />

        <circle
          cx="42"
          cy="30"
          r="19"
          fill="#ffffff"
          stroke="#1b1b1b"
          strokeWidth="1.4"
        />
        <polygon
          points="42,16 50.2,22.5 47.2,32.5 36.8,32.5 33.8,22.5"
          fill="#1b1b1b"
        />
        <path
          d="M42 16 L50.2 22.5 L54 14"
          stroke="#1b1b1b"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M50.2 22.5 L47.2 32.5 L56 36"
          stroke="#1b1b1b"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M47.2 32.5 L36.8 32.5 L34 42"
          stroke="#1b1b1b"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M36.8 32.5 L33.8 22.5 L26 26"
          stroke="#1b1b1b"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M33.8 22.5 L42 16 L34 14"
          stroke="#1b1b1b"
          strokeWidth="1.4"
          fill="none"
        />

        <path
          d="M18 52 C28 46 38 50 42 52 C46 54 56 50 66 52"
          stroke="#0f7b0f"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </g>

      <circle
        cx="88"
        cy="86"
        r="17"
        fill="#0067c0"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      <g
        stroke="#c8102e"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      >
        <path d="M20 78 L26 72 M26 72 L26 84" />
        <path d="M100 42 L94 48 M94 48 L94 36" />
      </g>
    </svg>
  );
}

type BrandLogoIconProps = {
  size?: number;
};

/** Versão para favicon/PWA — ImageResponse não suporta &lt;text&gt; no SVG. */
export function BrandLogoIcon({ size = 120 }: BrandLogoIconProps) {
  const badgeSize = (34 / 120) * size;
  const badgeLeft = (71 / 120) * size;
  const badgeTop = (69 / 120) * size;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
      }}
    >
      <BrandLogoMark size={size} />
      <div
        style={{
          position: "absolute",
          left: badgeLeft,
          top: badgeTop,
          width: badgeSize,
          height: badgeSize,
          borderRadius: "50%",
          background: "#0067c0",
          border: `${Math.max(2, (2.5 / 120) * size)}px solid #ffffff`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: (15 / 120) * size,
          fontWeight: 800,
          fontFamily: "Segoe UI, system-ui, sans-serif",
          lineHeight: 1,
        }}
      >
        26
      </div>
    </div>
  );
}

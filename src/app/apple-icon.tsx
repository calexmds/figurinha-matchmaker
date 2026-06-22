import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 32,
            background: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ecfdf5",
            fontSize: 56,
            fontWeight: 800,
          }}
        >
          FM
        </div>
      </div>
    ),
    { ...size },
  );
}

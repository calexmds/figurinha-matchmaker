import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f3f3",
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 88,
            background: "#0067c0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 140,
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

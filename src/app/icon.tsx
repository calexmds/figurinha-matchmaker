import { ImageResponse } from "next/og";
import { BrandLogoIcon } from "@/lib/brand-logo-mark";

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
          background: "linear-gradient(145deg, #eef6ff 0%, #f3f3f3 55%, #eef8ee 100%)",
        }}
      >
        <BrandLogoIcon size={420} />
      </div>
    ),
    { ...size },
  );
}

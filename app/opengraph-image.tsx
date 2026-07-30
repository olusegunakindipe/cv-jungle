import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CVJungle — truthful CV and LinkedIn optimization for ATS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background: "linear-gradient(135deg, #f3f7f4 0%, #d8ebe0 42%, #1a2e24 100%)",
        color: "#1a2e24",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        CV<span style={{ color: "#2d6a4f" }}>Jungle</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 860 }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "#f3f7f4",
          }}
        >
          Cut through the job-search jungle
        </div>
        <div style={{ fontSize: 26, color: "#b7d4c4", lineHeight: 1.35 }}>
          Truthful ATS rewrites · LinkedIn headline and About · no invented skills
        </div>
      </div>
    </div>,
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Typografické "G" na tmavém pozadí s neonovým obrysem — stejná vizuální
// identita jako zbytek webu (viz Header.tsx logo), žádný externí obrázek.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "14px",
          background: "linear-gradient(180deg, #0a0014 0%, #1a0330 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #ff2e9a",
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "#ff2e9a",
            display: "flex",
          }}
        >
          G
        </div>
      </div>
    ),
    { ...size }
  );
}

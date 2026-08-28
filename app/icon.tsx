import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Typografické "G" na krémovém papírovém pozadí s tenkým černým
// orámováním — stejná novinová/plakátová identita jako zbytek webu
// (viz Header.tsx logo, app/styles/gembl-newspaper.css). Žádný
// gradient, žádný externí obrázek.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f3ede2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "3px solid #111111",
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "#b32218",
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

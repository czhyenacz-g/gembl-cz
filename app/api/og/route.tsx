import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "GEMBL.cz";
  const sub = searchParams.get("sub") || "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f3ede2",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#111111",
            textAlign: "center",
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: "6px solid #111111",
            display: "flex",
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#b32218",
              textAlign: "center",
              display: "flex",
            }}
          >
            {sub}
          </div>
        )}
        <div
          style={{
            fontSize: 32,
            color: "#6c665d",
            textAlign: "center",
            marginTop: 48,
            display: "flex",
          }}
        >
          gembl.cz
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

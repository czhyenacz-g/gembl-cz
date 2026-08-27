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
          background: "linear-gradient(135deg, #0a0014 0%, #1a0330 60%, #0a0014 100%)",
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
            color: "#ffffff",
            textAlign: "center",
            marginBottom: 32,
            display: "flex",
            textShadow: "0 0 40px rgba(255, 46, 154, 0.6)",
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 40,
              color: "#22e5ff",
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
            color: "#ffcc33",
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

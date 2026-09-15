import type { CSSProperties } from "react";
import type { SkinRect } from "./types.ts";

/** Převede designovou zónu (px vůči background canvasu) na absolutní CSS pozici uvnitř škálovaného stage wrapperu. */
export function rectStyle(rect: SkinRect): CSSProperties {
  return { position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

import { classicSkin } from "./classic.ts";
import type { CasinoSkin } from "./types.ts";

export type { CasinoSkin, SkinRect, ClassicMenuItem } from "./types.ts";

// Registry pro budoucí skiny (vegas/win95/christmas, viz zadání "skin-ready
// architektura") — zatím jediný klíč. Žádný switcher UI, jen tenhle objekt,
// aby přidání dalšího skinu později znamenalo "přidej klíč sem", ne refactor.
export const CASINO_SKINS: Record<string, CasinoSkin> = {
  classic: classicSkin,
};

export const ACTIVE_SKIN_ID = "classic";

export function getActiveSkin(): CasinoSkin {
  return CASINO_SKINS[ACTIVE_SKIN_ID];
}

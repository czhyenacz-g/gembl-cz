// Datový model stíracích losů — 3 symboly na jednom losu.

export type ScratchSymbol = "cherry" | "seven" | "bell" | "star" | "clover" | "diamond";

/**
 * State machine hry — přesně těchto 5 fází, žádná chaotická sada
 * booleanů (viz zadání). Každá fáze jasně určuje, co lze dělat:
 * - `idle`: jen tlačítko KOUPIT LOS
 * - `purchasing`: nic (čeká se na server)
 * - `scratching`: jen stírání (pointer po canvasu)
 * - `revealing`: nic (fade-out stírací vrstvy, žádná interakce)
 * - `result`: jen tlačítko KOUPIT DALŠÍ LOS
 */
export type ScratchTicketPhase = "idle" | "purchasing" | "scratching" | "revealing" | "result";

/** `matchType` řídí, ze kterého configu (viz messages.ts) se vybírá hláška po odkrytí. */
export type ScratchMatchType = "pair" | "none";

export type ScratchResult = {
  symbols: readonly [ScratchSymbol, ScratchSymbol, ScratchSymbol];
  matchType: ScratchMatchType;
};

// Datový model hry Skořápky — 3 pozice vedle sebe (0 = levá, 1 =
// prostřední, 2 = pravá), kelímky se fyzicky nepřehazují (viz zadání),
// jen se mění, co je vidět/zvýrazněné/klikatelné podle fáze.

export type CupIndex = 0 | 1 | 2;

/**
 * State machine hry — přesně těchto 6 fází, žádná chaotická sada
 * booleanů (viz zadání). Každá fáze jasně určuje, co lze kliknout:
 * - `idle`: jen tlačítko HRÁT
 * - `covering`/`shuffling`/`revealing`: nic (kelímky i HRÁT jsou disabled)
 * - `choosing`: přesně jeden kelímek, dokud není vybraný
 * - `result`: jen tlačítko HRÁT ZNOVU
 */
export type ShellGamePhase = "idle" | "covering" | "shuffling" | "choosing" | "revealing" | "result";

/** Jeden krok shuffling animace — které kelímky mají být zrovna zvýrazněné (viz zadání "L", "R", "M", "L+M", ...). */
export type ShuffleStep = { cups: readonly CupIndex[] };

import { NextResponse } from "next/server";
import { reportGameStatsDelta } from "../../../lib/casino/global-stats";

const MAX_GAME_LENGTH = 50;
// Hrubý horní strop na jeden dávkový report — víc než tohle v jednom
// batchi je buď chyba na klientovi, nebo pokus o zneužití, ne reálná hra.
const MAX_REASONABLE_DELTA = 100_000;

function toNonNegInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), MAX_REASONABLE_DELTA);
}

// Klient posílá jen AGREGOVANOU dávku (batch po 10 spinech nebo při
// odchodu ze stránky/resetu) — ne jeden request na spin, viz SlotMachine.tsx.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { game, spins, wagered, won, resets } = (body ?? {}) as Record<string, unknown>;

  if (typeof game !== "string" || game.length === 0 || game.length > MAX_GAME_LENGTH) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await reportGameStatsDelta({
    game,
    spins: toNonNegInt(spins),
    wagered: toNonNegInt(wagered),
    won: toNonNegInt(won),
    resets: toNonNegInt(resets),
  });

  return NextResponse.json({ ok: true });
}

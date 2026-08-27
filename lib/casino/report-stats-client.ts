export type GameStatsDeltaPayload = {
  game: string;
  spins: number;
  wagered: number;
  won: number;
  resets: number;
};

// Klientský report jedné dávky na /api/game-stats. Preferuje
// navigator.sendBeacon (garantovaně odešle i v okamžiku, kdy se
// stránka právě zavírá — na to je keepalive fetch nespolehlivý), s
// fallbackem na fetch({keepalive:true}) pro prostředí bez beacon API.
// Vždy fail-open — report nikdy nesmí ovlivnit hru.
export function reportGameStatsDeltaClient(delta: GameStatsDeltaPayload): void {
  try {
    const body = JSON.stringify(delta);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/game-stats", blob)) return;
    }

    fetch("/api/game-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fail-open
  }
}

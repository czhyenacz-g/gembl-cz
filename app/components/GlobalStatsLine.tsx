import { getGlobalStats } from "../../lib/casino/global-stats";

// "Hráči na Gembl.cz už společně prohráli X G." — server component,
// fail-open (getGlobalStats sama nikdy nevyhodí). Dokud nejsou žádná
// data (čerstvý deploy, nebo výpadek UCA), radši nic nezobrazí, než
// aby ukazovala matoucí "0 G".
export default async function GlobalStatsLine({ game }: { game?: string } = {}) {
  const stats = await getGlobalStats(game).catch(() => null);
  if (!stats || stats.totalSpins === 0) return null;

  return (
    <p className="text-sm text-gray-500">
      Hráči na Gembl.cz už společně prohráli{" "}
      <span className="font-semibold text-neon-gold">{stats.totalLost.toLocaleString("cs-CZ")} G</span>.
    </p>
  );
}

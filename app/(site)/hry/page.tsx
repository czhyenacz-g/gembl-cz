import type { Metadata } from "next";
import GameCard from "./GameCard";

const TITLE = "Hry";
const DESCRIPTION = "Přehled her na GEMBL.cz. Automaty jsou aktivní, další jsou zatím jen v přípravě.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/hry" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

const GAMES: Array<React.ComponentProps<typeof GameCard>> = [
  {
    emoji: "🎰",
    title: "Automaty",
    description: "Klasický jednoruký bandita. Tři válce, žádná výhra.",
    status: "active",
    href: "/automaty",
  },
  { emoji: "🎡", title: "Ruleta", description: "Červená, černá, nula. Brzy.", status: "soon" },
  { emoji: "🎫", title: "Stírací los", description: "Seškrábeš tři symboly. Výsledek stejný jako u automatů.", status: "soon" },
  { emoji: "🪙", title: "Krypto guru", description: "Investuj virtuální kredity do virtuálního ničeho.", status: "soon" },
  { emoji: "🏛️", title: "Státní rozpočet", description: "Nejrealističtější hra na GEMBL.cz. Brzy.", status: "soon" },
];

export default function HryPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Hry</h1>
        <p className="mt-3 text-gembl-muted">{DESCRIPTION}</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <GameCard key={game.title} {...game} />
        ))}
      </div>
    </div>
  );
}

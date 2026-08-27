import type { Metadata } from "next";
import { SPIN_COST, STARTING_CREDITS } from "../config/site";

const TITLE = "Jak to funguje";
const DESCRIPTION = "Virtuální kredity, žádné skutečné peníze, výhra vždy 0 G. Jasně a bez malého písma.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/jak-to-funguje" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

export default function JakToFungujePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-gray-300">
      <h1 className="font-serif text-3xl font-extrabold text-white sm:text-4xl">Jak to funguje</h1>
      <p className="mt-4 text-lg text-gray-400">
        GEMBL.cz vypadá jako online kasino, ale chová se úplně jinak — a to je celý smysl.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-neon-cyan">Virtuální kredity, ne peníze</h2>
        <p className="mt-3">
          Na startu dostaneš {STARTING_CREDITS.toLocaleString("cs-CZ")} G — virtuálních kreditů, které nemají žádnou
          reálnou hodnotu. Nedají se koupit, nedají se vybrat, nedají se poslat nikomu jinému. Slouží jen k tomu, abys
          mohl hrát.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Jeden spin, jedna jistota</h2>
        <p className="mt-3">
          Každé roztočení automatu stojí {SPIN_COST} G. Bez ohledu na to, co padne na válcích — i kdyby to byly tři
          stejné symboly — výhra je vždy přesně 0 G. Žádná výjimka, žádný skrytý jackpot, žádné malé písmo.
        </p>
        <p className="mt-3">RTP (Return to Player) je 0 %. Transparentněji už to fakt nejde.</p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Proč to vůbec existuje?</h2>
        <p className="mt-3">
          GEMBL.cz je satira na to, jak online kasina a hazardní hry vypadají a jak se chovají — jen bez toho
          nejdůležitějšího triku. Tady víš předem, jak to dopadne, a přesně to se stane.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Achievementy</h2>
        <p className="mt-3">
          Za hraní (ne za vyhrávání — to tu neexistuje) odemykáš drobné achievementy jako „První prohra&ldquo; nebo
          „Profesionální smolař&ldquo;. Jsou to jen odznaky, nic za ně nezískáš — stejně jako za všechno ostatní tady.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Tvůj postup</h2>
        <p className="mt-3">
          Zůstatek a statistiky se ukládají jen v tvém prohlížeči (localStorage) — žádný účet, žádné přihlašování.
          Po refreshi stránky o nic nepřijdeš. Kdykoliv můžeš kariéru vynulovat tlačítkem „RESETOVAT KARIÉRU&ldquo; na
          stránce Automaty a začít zase od {STARTING_CREDITS.toLocaleString("cs-CZ")} G.
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { BET_STEP, DISCLAIMER, MAX_BET, MIN_BET, STARTING_CREDITS } from "../../config/site";

const TITLE = "Jak to funguje";
const DESCRIPTION = "Virtuální kredity, které lze dokoupit, ale ne vybrat. Výhra vždy 0 G. Jasně a bez malého písma.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/jak-to-funguje" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// Stránka jede ve stejném "samostatném" režimu jako herní scény (viz
// STANDALONE_ROUTES v app/components/SiteChrome.tsx) — žádné běžné
// menu/patička, jen vlastní šipka zpět jako u her. `min-h-screen` si proto
// řeší sama (jako ShellGame.tsx/ScratchCard.tsx/SlotMachine.tsx).
//
// Obsah /o-projektu (stránka se zrušila) je odsud dolů připojený jako
// další sekce — texty jsou beze změny, jen se přesunuly sem.
export default function JakToFungujePage() {
  return (
    <div className="min-h-screen bg-gembl-paper px-4 py-6 text-gembl-ink sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/casino"
          aria-label="Zpět do kasina"
          className="gembl-tag inline-flex items-center gap-1 transition hover:bg-gembl-paper-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
        >
          ← ZPĚT
        </Link>

        <h1 className="gembl-masthead mt-6 inline-block text-3xl font-black sm:text-4xl">Jak to funguje</h1>
        <p className="mt-4 text-lg text-gembl-muted">
          GEMBL.cz vypadá jako online kasino, ale chová se úplně jinak — a to je celý smysl.
        </p>

        <section className="mt-10">
          <h2 className="gembl-section-heading inline-block text-xl">Virtuální kredity, ne peníze</h2>
          <p className="mt-3">
            Na startu dostaneš {STARTING_CREDITS.toLocaleString("cs-CZ")} G — virtuálních kreditů, které nemají žádnou
            reálnou hodnotu. Když dojdou, dají se dokoupit v korunách (1 Kč = 1 G) přes Stripe, ale nikdy se nedají
            vybrat zpátky, směnit za peníze/věcné ceny ani poslat nikomu jinému. Slouží jen k tomu, abys mohl hrát.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Jeden spin, jedna jistota</h2>
          <p className="mt-3">
            Sázku si před každým spinem nastavíš tlačítky −/+ v rozsahu {MIN_BET}–{MAX_BET} G po {BET_STEP} G. Bez
            ohledu na to, co padne na válcích — i kdyby to byly tři stejné symboly — výhra je vždy přesně 0 G. Žádná
            výjimka, žádný skrytý jackpot, žádné malé písmo.
          </p>
          <p className="mt-3">RTP (Return to Player) je 0 %. Transparentněji už to fakt nejde.</p>
        </section>

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Proč to vůbec existuje?</h2>
          <p className="mt-3">
            GEMBL.cz je satira na to, jak online kasina a hazardní hry vypadají a jak se chovají — jen bez toho
            nejdůležitějšího triku. Tady víš předem, jak to dopadne, a přesně to se stane.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Achievementy</h2>
          <p className="mt-3">
            Za hraní (ne za vyhrávání — to tu neexistuje) odemykáš drobné achievementy jako „První prohra&ldquo; nebo
            „Profesionální smolař&ldquo;. Jsou to jen odznaky, nic za ně nezískáš — stejně jako za všechno ostatní tady.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Tvůj postup</h2>
          <p className="mt-3">
            Bez přihlášení se statistiky ukládají jen v tvém prohlížeči (localStorage) — po refreshi stránky o nic
            nepřijdeš, kdykoliv můžeš kariéru vynulovat tlačítkem „RESETOVAT KARIÉRU&ldquo; na{" "}
            <Link href="/reset" className="text-gembl-red underline underline-offset-2 transition hover:text-gembl-ink">
              stránce RESET
            </Link>{" "}
            a začít zase od {STARTING_CREDITS.toLocaleString("cs-CZ")} G. Přihlášení (jen email, žádné heslo) ti navíc
            jednou připíše bonus až 800 G a dá ti zůstatek dostupný napříč zařízeními — a jen přihlášený účet si může G
            i dokoupit.
          </p>
        </section>

        {/* --- Obsah bývalé stránky /o-projektu (sem přesunutý beze změny) --- */}

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Co je GEMBL.cz</h2>
          <p className="mt-3">
            GEMBL.cz je satirický zábavní projekt stylizovaný jako online kasino. Vypadá jako moderní herní platforma,
            ale funguje podle jednoho jediného, otevřeně přiznaného pravidla: vyhrát se nedá. Nikdy, u žádné hry, za
            žádných okolností.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="gembl-section-heading inline-block text-xl">Proč to existuje</h2>
          <p className="mt-3">
            Online kasina a hazardní hry běžně stylizují nulovou (nebo téměř nulovou) šanci na výhru do zážitku plného
            nadějí, blikajících efektů a &bdquo;skoro jsi vyhrál&ldquo; momentů. GEMBL.cz dělá to samé — jen bez
            přetvářky. Žádné skryté podmínky, žádné malé písmo, žádná falešná naděje. Jen upřímná, přiznaná nemožnost
            výhry a trocha humoru k tomu.
          </p>
        </section>

        <section className="mt-8 border-2 border-gembl-red bg-gembl-paper-dark p-5">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-gembl-red">Důležité upozornění</h2>
          <p className="mt-3 text-sm text-gembl-ink">{DISCLAIMER}</p>
          <p className="mt-2 text-sm text-gembl-muted">
            G si lze dokoupit za reálné peníze přes Stripe, ale nikdy nejdou vybrat, převést na jiného hráče ani
            směnit zpátky za peníze nebo věcné ceny. Výhra se tím nemění — pořád je vždy přesně 0 G.
          </p>
        </section>
      </div>
    </div>
  );
}

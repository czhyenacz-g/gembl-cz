import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import ContentPage from "../../components/stage/ContentPage";
import { BET_STEP, DISCLAIMER, MAX_BET, MIN_BET, STARTING_CREDITS } from "../../config/site";

const TITLE = "Jak to funguje";
const DESCRIPTION = "Virtuální kredity, které lze dokoupit, ale ne vybrat. Výhra vždy 0 G. Jasně a bez malého písma.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/jak-to-funguje" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// Obsah je záměrně jeden komponent, který se vykresluje do obou větví
// ContentPage (desktop artwork stage / mobile fallback) — stejné texty,
// jen jiný obal. Všechny claimy jsou převzaté ze současných textů projektu
// (nic nového se nedomýšlí) a disclaimer zůstává.
export default function JakToFungujePage() {
  return (
    <ContentPage
      title="Jak to funguje"
      subtitle="Vypadá jako online kasino, ale chová se úplně jinak — a to je celý smysl."
      legacyBack
    >
      <div className="space-y-5">
        <Section title="Co jsou G">
          <p>
            G jsou virtuální kredity, které nemají žádnou reálnou hodnotu. Na startu dostaneš{" "}
            <strong>{STARTING_CREDITS.toLocaleString("cs-CZ")} G</strong>. Slouží jen ke hraní — nedají se vybrat zpět,
            směnit za peníze ani věcné ceny a nejdou poslat jinému hráči.
          </p>
        </Section>

        <Section title="Jak funguje hraní">
          <p>
            Sázku si před každým spinem nastavíš tlačítky −/+ v rozsahu {MIN_BET}–{MAX_BET} G po {BET_STEP} G. Odečte
            se vždy přesně zvolená sázka, ať padne cokoliv.
          </p>
        </Section>

        <Section title="Výhra není možná">
          <p>
            Bez ohledu na to, co padne na válcích — i kdyby to byly tři stejné symboly — výhra je vždy přesně 0 G.
            Žádná výjimka, žádný skrytý jackpot, žádné malé písmo.
          </p>
        </Section>

        <Section title="Co znamená 0 % RTP">
          <p>
            RTP (Return to Player) je 0 %. Znamená to, že se ti dlouhodobě nevrátí nic — přesně to, co tu stojí
            napsané. Transparentněji už to fakt nejde.
          </p>
        </Section>

        <Section title="Jak funguje dobití">
          <p>
            Když G dojdou, dají se dokoupit v korunách (1 Kč = 1 G) přes Stripe. Nikdy se ale nedají vybrat zpátky ani
            směnit za věcné ceny a dokoupit si je může jen přihlášený účet.
          </p>
        </Section>

        <Section title="Jak funguje přihlášení">
          <p>
            Přihlášení je jen e-mailem (magic link), žádné heslo. Jednou ti připíše uvítací bonus až 800 G a zůstatek
            pak máš dostupný napříč zařízeními.
          </p>
        </Section>

        <Section title="Achievementy">
          <p>
            Za hraní (ne za vyhrávání — to tu neexistuje) odemykáš drobné achievementy jako „První prohra&ldquo; nebo
            „Profesionální smolař&ldquo;. Jsou to jen odznaky, nic za ně nezískáš — stejně jako za všechno ostatní tady.
          </p>
        </Section>

        <Section title="Reset kariéry">
          <p>
            Statistiky i achievementy můžeš kdykoliv vynulovat tlačítkem „RESETOVAT KARIÉRU&ldquo; na{" "}
            <Link href="/reset" className="font-semibold text-gembl-red underline underline-offset-2 hover:text-gembl-ink">
              stránce RESET
            </Link>{" "}
            a začít zase od {STARTING_CREDITS.toLocaleString("cs-CZ")} G.
          </p>
        </Section>

        <Section title="Proč to existuje">
          <p>
            GEMBL.cz je satirický zábavní projekt stylizovaný jako online kasino. Vypadá jako moderní herní platforma,
            ale funguje podle jednoho otevřeně přiznaného pravidla: vyhrát se nedá. Nikdy, u žádné hry, za žádných
            okolností.
          </p>
          <p className="mt-3">
            Online kasina a hazardní hry běžně stylizují nulovou (nebo téměř nulovou) šanci na výhru do zážitku plného
            nadějí, blikajících efektů a &bdquo;skoro jsi vyhrál&ldquo; momentů. GEMBL.cz dělá to samé — jen bez
            přetvářky. Žádné skryté podmínky, žádné malé písmo, žádná falešná naděje.
          </p>
        </Section>

        <Section title="Důležité upozornění" accent>
          <p className="text-gembl-ink">{DISCLAIMER}</p>
          <p className="mt-2 text-gembl-muted">
            G si lze dokoupit za reálné peníze přes Stripe, ale nikdy nejdou vybrat, převést na jiného hráče ani
            směnit zpátky za peníze nebo věcné ceny. Výhra se tím nemění — pořád je vždy přesně 0 G.
          </p>
        </Section>
      </div>
    </ContentPage>
  );
}

function Section({ title, accent = false, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <section className={accent ? "border border-gembl-red bg-gembl-paper-dark p-3" : undefined}>
      <h2 className={`gembl-section-heading inline-block text-lg ${accent ? "text-gembl-red" : ""}`}>{title}</h2>
      <div className="mt-2 text-base leading-relaxed">{children}</div>
    </section>
  );
}

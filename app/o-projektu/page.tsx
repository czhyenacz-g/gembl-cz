import type { Metadata } from "next";
import { DISCLAIMER } from "../config/site";

const TITLE = "O projektu";
const DESCRIPTION = "Co je GEMBL.cz, proč vznikl a proč to není skutečné hazardní hraní.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/o-projektu" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

export default function OProjektuPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-gembl-ink">
      <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">O projektu</h1>

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
          Nepoužívají se žádné skutečné peníze, neexistuje platební brána, nákup kreditů ani výběr výhry. Vše, co
          vidíš, jsou virtuální kredity bez jakékoliv reálné hodnoty.
        </p>
      </section>
    </div>
  );
}

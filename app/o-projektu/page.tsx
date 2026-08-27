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
    <div className="mx-auto max-w-2xl px-4 py-16 text-gray-300">
      <h1 className="font-serif text-3xl font-extrabold text-white sm:text-4xl">O projektu</h1>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Co je GEMBL.cz</h2>
        <p className="mt-3">
          GEMBL.cz je satirický zábavní projekt stylizovaný jako online kasino. Vypadá jako moderní herní platforma,
          ale funguje podle jednoho jediného, otevřeně přiznaného pravidla: vyhrát se nedá. Nikdy, u žádné hry, za
          žádných okolností.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-neon-cyan">Proč to existuje</h2>
        <p className="mt-3">
          Online kasina a hazardní hry běžně stylizují nulovou (nebo téměř nulovou) šanci na výhru do zážitku plného
          nadějí, blikajících efektů a &bdquo;skoro jsi vyhrál&ldquo; momentů. GEMBL.cz dělá to samé — jen bez
          přetvářky. Žádné skryté podmínky, žádné malé písmo, žádná falešná naděje. Jen upřímná, přiznaná nemožnost
          výhry a trocha humoru k tomu.
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-neon-pink/30 bg-neon-pink/5 p-5">
        <h2 className="font-serif text-lg text-neon-pink">Důležité upozornění</h2>
        <p className="mt-3 text-sm text-gray-300">{DISCLAIMER}</p>
        <p className="mt-2 text-sm text-gray-400">
          Nepoužívají se žádné skutečné peníze, neexistuje platební brána, nákup kreditů ani výběr výhry. Vše, co
          vidíš, jsou virtuální kredity bez jakékoliv reálné hodnoty.
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";

const TITLE = "Žebříčky";
const DESCRIPTION = "Žebříčky hráčů na GEMBL.cz — zatím v přípravě.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/zebricky" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// Placeholder stránka — route musí existovat, aby menu položka mohla být
// aktivní a klikací hned (viz zadání "menu položka má být aktivní a
// klikací, i když route zatím jen placeholder"). Reálný obsah (žebříček
// podle prohry/protočeného apod.) přijde později.
export default function ZebrickyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gembl-ink">
      <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Žebříčky</h1>
      <p className="mt-4 text-lg text-gembl-muted">Připravujeme přehled nejvytrvalejších smolařů. Zatím sleduj svou vlastní kariéru na Automatech.</p>
    </div>
  );
}

import type { Metadata } from "next";

const TITLE = "Online losy";
const DESCRIPTION = "Stírací losy na GEMBL.cz — zatím v přípravě.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/losy" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// Placeholder stránka — route musí existovat, aby menu položka mohla být
// aktivní a klikací hned (viz zadání "menu položka má být aktivní a
// klikací, i když route zatím jen placeholder"). Reálná hra přijde později.
export default function LosyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gembl-ink">
      <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Online losy</h1>
      <p className="mt-4 text-lg text-gembl-muted">Stírací losy se připravují. Zatím zkus Automaty nebo Skořápky.</p>
    </div>
  );
}

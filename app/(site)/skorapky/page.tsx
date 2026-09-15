import type { Metadata } from "next";
import ShellGame from "./ShellGame.tsx";

const TITLE = "Skořápky";
const DESCRIPTION = "Tři kelímky, jedna kulička, nulová šance. Sázka 10 G, výhra je vždy 0 G.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/skorapky" },
  openGraph: {
    images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}&sub=${encodeURIComponent("Výhra je vždy 0 G")}`, width: 1200, height: 630 }],
  },
};

export default function SkorapkyPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Skořápky</h1>
        <p className="mt-3 text-gembl-muted">Sleduj kuličku. Vyber kelímek. Prohraj poctivě.</p>
      </div>

      <div className="mt-8">
        <ShellGame />
      </div>
    </div>
  );
}

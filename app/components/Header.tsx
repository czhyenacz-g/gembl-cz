import Link from "next/link";
import { NAV_LINKS, SITE_NAME } from "../config/site";
import BalanceBadge from "./BalanceBadge";

// Jednoduchý responzivní header — jen 4 nav položky, takže na rozdíl od
// větších projektů nepotřebuje hamburger/mobilní panel (viz zadání
// "žádný zbytečně komplikovaný state management"). Na malé šířce se nav
// prostě zalomí (flex-wrap), logo a zůstatek zůstávají vždy v první řadě.
// Vizuál: novinová hlavička — plné papírové pozadí (žádný glass/blur),
// silná spodní linka.
export default function Header() {
  return (
    <header className="border-b-[3px] border-gembl-ink bg-gembl-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
        <Link href="/casino" className="flex items-baseline gap-0.5" aria-label={SITE_NAME}>
          <span className="font-serif text-2xl font-black uppercase tracking-tight text-gembl-ink">GEMBL</span>
          <span className="font-serif text-sm font-bold uppercase text-gembl-red">.cz</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="uppercase tracking-wide text-gembl-ink transition hover:text-gembl-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <BalanceBadge />
      </div>
    </header>
  );
}

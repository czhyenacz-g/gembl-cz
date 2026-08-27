import Link from "next/link";
import { NAV_LINKS, SITE_NAME } from "../config/site";
import BalanceBadge from "./BalanceBadge";

// Jednoduchý responzivní header — jen 4 nav položky, takže na rozdíl od
// větších projektů nepotřebuje hamburger/mobilní panel (viz zadání
// "žádný zbytečně komplikovaný state management"). Na malé šířce se nav
// prostě zalomí (flex-wrap), logo a zůstatek zůstávají vždy v první řadě.
export default function Header() {
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
        <Link href="/" className="flex items-baseline gap-0.5" aria-label={SITE_NAME}>
          <span className="font-serif text-2xl font-extrabold tracking-tight text-neon-pink text-glow-pink">GEMBL</span>
          <span className="text-sm font-medium text-neon-cyan">.cz</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-300 transition hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60"
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

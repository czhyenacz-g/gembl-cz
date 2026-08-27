import Link from "next/link";
import { DISCLAIMER, NAV_LINKS, SITE_NAME } from "../config/site";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/40">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-400">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif font-semibold text-white">{SITE_NAME}</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-neon-cyan">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-4 max-w-2xl text-xs text-gray-500">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}

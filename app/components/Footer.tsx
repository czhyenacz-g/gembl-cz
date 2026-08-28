import Link from "next/link";
import { DISCLAIMER, NAV_LINKS, SITE_NAME } from "../config/site";

export default function Footer() {
  return (
    <footer className="mt-16 border-t-[3px] border-gembl-ink bg-gembl-paper-dark">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gembl-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif font-bold uppercase text-gembl-ink">{SITE_NAME}</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 uppercase tracking-wide">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-gembl-red">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <hr className="gembl-rule my-4" />
        <p className="max-w-2xl text-xs text-gembl-muted">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}

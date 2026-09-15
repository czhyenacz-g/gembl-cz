"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ClassicMenuItem, SkinRect } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";

// Menu text je HTML (ne vypálený do background obrázku), ať jde měnit a
// lokalizovat — artwork dává 6 připravených řádků, aktuální menu má jen 5
// položek (viz classic.ts komentář u menu.items), "Achievementy" má
// vlastní zónu v pravém sloupci (viz StatsOverlay), ne řádek tady.
//
// Aktivní položka se počítá z AKTUÁLNÍHO pathname (usePathname), ne ze
// statického flagu v datech skinu (viz zadání "aktivní položku určuj
// podle pathname") — detail podstránka (např. /profil/neco) nechá
// aktivní rodičovskou položku (viz isActiveHref, prefix match).
//
// `pathname === "/casino"` je speciální případ: stage sama žije jen na
// /casino (viz app/(site)/casino/page.tsx), které je koncepčně vstupní
// brána k Automatům — hra samotná je až na /automaty (viz SlotTeaser.tsx)
// — bez tyhle výjimky by při pohledu na stage nebyla aktivní žádná
// položka, protože žádný href doslova neodpovídá "/casino".
function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return pathname === "/casino" && href === "/automaty";
}

export default function MenuOverlay({ items, rows }: { items: ClassicMenuItem[]; rows: SkinRect[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item, index) => {
        const rect = rows[index];
        if (!rect) return null;
        const active = item.href !== null && isActiveHref(pathname, item.href);
        return <MenuRow key={item.label} item={item} rect={rect} active={active} />;
      })}
    </>
  );
}

function MenuRow({ item, rect, active }: { item: ClassicMenuItem; rect: SkinRect; active: boolean }) {
  const baseClass =
    "flex h-full w-full items-center justify-center px-2 font-serif text-sm font-bold uppercase tracking-wide transition";

  if (active) {
    return (
      <div style={rectStyle(rect)} className={`${baseClass} text-gembl-paper`} aria-current="page">
        {item.label}
      </div>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        style={rectStyle(rect)}
        className={`${baseClass} text-gembl-ink hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red focus-visible:ring-offset-0`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <span
      style={rectStyle(rect)}
      aria-disabled="true"
      className={`${baseClass} cursor-not-allowed gap-1.5 text-gembl-muted`}
    >
      {item.label}
      <span className="text-[0.6rem] normal-case tracking-normal text-gembl-muted/70">(brzy)</span>
    </span>
  );
}

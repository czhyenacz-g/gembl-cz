import Link from "next/link";
import type { ClassicMenuItem, SkinRect } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";

// Menu text je HTML (ne vypálený do background obrázku), ať jde měnit a
// lokalizovat — artwork dává jen 6 připravených řádků (1 aktivní + 5),
// takže "Achievementy" má vlastní zónu v pravém sloupci (viz StatsOverlay),
// ne řádek tady (viz classic.ts komentář u menu.items).
export default function MenuOverlay({ items, rows }: { items: ClassicMenuItem[]; rows: SkinRect[] }) {
  return (
    <>
      {items.map((item, index) => {
        const rect = rows[index];
        if (!rect) return null;
        return <MenuRow key={item.label} item={item} rect={rect} />;
      })}
    </>
  );
}

function MenuRow({ item, rect }: { item: ClassicMenuItem; rect: SkinRect }) {
  const baseClass =
    "flex h-full w-full items-center justify-center px-2 font-serif text-sm font-bold uppercase tracking-wide transition";

  if (item.active) {
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

import Link from "next/link";
import ArtworkPlaceholder from "../../components/ArtworkPlaceholder";

// Levé menu — sada sekcí kasina. Vždycky jen /automaty a /jak-to-funguje
// mají dnes reálnou route; zbytek je připravený placement pro budoucí
// stránky (viz zadání "nevytvářej kvůli tomu novou stránku"). Položka
// bez `href` se vykreslí jako neklikací (disabled), ne jako mrtvý "#"
// odkaz. `active: true` je tady napevno u "Automaty", protože /casino
// je koncepčně vstupní hala hry, ne samostatná sekce menu.
const MENU_ITEMS = [
  { label: "Automaty", href: "/automaty", icon: "A", active: true },
  { label: "Ruleta", href: null, icon: "R", active: false },
  { label: "Losy", href: null, icon: "L", active: false },
  { label: "Žebříčky", href: null, icon: "Ž", active: false },
  { label: "Profil", href: null, icon: "P", active: false },
  { label: "Achievementy", href: null, icon: "A", active: false },
  { label: "Jak funguje", href: "/jak-to-funguje", icon: "?", active: false },
] as const;

export default function LeftSidebar() {
  return (
    <div className="gembl-sidebar">
      <h2 className="gembl-section-heading text-sm text-gembl-ink">Menu</h2>

      <nav className="mt-4 border border-gembl-ink" aria-label="Sekce kasina">
        {MENU_ITEMS.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`gembl-nav-item ${item.active ? "gembl-nav-item--active" : ""}`}
            >
              <span className="gembl-icon-glyph" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ) : (
            <span key={item.label} className="gembl-nav-item gembl-nav-item--disabled" aria-disabled="true">
              <span className="gembl-icon-glyph" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              <span className="gembl-tag ml-auto text-[0.6rem]">Brzy</span>
            </span>
          )
        )}
      </nav>

      <div className="gembl-panel mt-8">
        <p className="gembl-panel-title text-center">Vítej v kasinu, kde vždycky prohraješ.</p>
        <div className="gembl-panel-body">
          <ArtworkPlaceholder label="Ilustrace maskota" aspectRatio="3 / 4" />
          <Link href="/o-projektu" className="gembl-cta gembl-cta--secondary mt-4 w-full">
            Více info
          </Link>
        </div>
      </div>
    </div>
  );
}

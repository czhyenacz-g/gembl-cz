import Link from "next/link";

export type GameCardProps = {
  emoji: string;
  title: string;
  description: string;
  status: "active" | "soon";
  href?: string;
};

// Aktivní hra je klikací karta (Link), "brzy" placeholder je jen
// vizuální karta bez gameplay — žádný href, žádný onClick (viz zadání
// "nevytvářej jejich gameplay, pouze karty").
export default function GameCard({ emoji, title, description, status, href }: GameCardProps) {
  const content = (
    <div
      className={`h-full border-2 p-6 transition ${
        status === "active"
          ? "border-gembl-ink bg-gembl-paper-dark shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          : "border-gembl-line/40 bg-gembl-paper opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        {status === "soon" && <span className="gembl-tag text-gembl-muted">Brzy</span>}
        {status === "active" && <span className="gembl-tag gembl-tag--accent">Aktivní</span>}
      </div>
      <h2 className="mt-3 font-serif text-lg font-bold text-gembl-ink">{title}</h2>
      <p className="mt-1 text-sm text-gembl-muted">{description}</p>
    </div>
  );

  if (status === "active" && href) {
    return (
      <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink">
        {content}
      </Link>
    );
  }

  return content;
}

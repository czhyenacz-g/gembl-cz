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
      className={`h-full rounded-xl border p-6 transition ${
        status === "active"
          ? "border-neon-pink/50 bg-white/5 hover:-translate-y-1 hover:border-neon-pink hover:shadow-glow-pink"
          : "border-white/10 bg-white/[0.02] opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        {status === "soon" && (
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
            Brzy
          </span>
        )}
        {status === "active" && (
          <span className="rounded-full border border-neon-pink/50 bg-neon-pink/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neon-pink">
            Aktivní
          </span>
        )}
      </div>
      <h2 className="mt-3 font-serif text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );

  if (status === "active" && href) {
    return (
      <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan">
        {content}
      </Link>
    );
  }

  return content;
}

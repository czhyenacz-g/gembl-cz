// Jediná znovupoužitelná placeholder komponenta pro chybějící
// ilustrace/artwork (slot machine, maskot, avatar, achievement ikony,
// ...) — viz .gembl-artwork-placeholder v gembl-newspaper.css. Cíl:
// vypadat jako záměrná stylizovaná součást plakátového designu, ne
// jako rozbitý obrázek nebo šedý moderní skeleton (viz zadání).
export default function ArtworkPlaceholder({
  label,
  aspectRatio = "4 / 3",
  className = "",
}: {
  label: string;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div className={`gembl-artwork-placeholder ${className}`} style={{ aspectRatio }} role="img" aria-label={label}>
      <span className="gembl-artwork-placeholder-label">[ {label} ]</span>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { isExternalHref } from "../../../lib/promotions/match-route";
import { trackPromotionEventClient } from "../../../lib/promotions/track-promotion-event-client";
import type { Promotion } from "../../../lib/promotions/types";

// Jediný typ reklamního bloku pro MVP (viz zadání "pro první MVP
// upřednostni horizontální bannery") — responzivní, poměr stran
// zachovaný přes Image, klikací celý banner. Interní odkaz (isExternalHref
// === false, typicky vlastní kampaň bez affiliate_key) dostane normální
// Next.js Link, žádný target="_blank"/rel="sponsored" — ten patří jen
// skutečným externím/affiliate odkazům. Bez aktivní promotion (`null`)
// se nevykresluje vůbec nic — žádná rezervovaná prázdná plocha, žádný
// rozbitý layout (viz zadání).
export default function HorizontalBanner({ promotion, className = "" }: { promotion: Promotion | null; className?: string }) {
  useEffect(() => {
    if (!promotion) return;
    trackPromotionEventClient(promotion.id, "impression");
    // Jen při skutečné změně zobrazené promotion, ne při každém re-renderu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion?.id]);

  if (!promotion || !promotion.imageUrl) return null;

  function handleClick() {
    trackPromotionEventClient(promotion!.id, "click");
  }

  const content = (
    <div className="relative aspect-[4/1] w-full overflow-hidden rounded-lg">
      <Image src={promotion.imageUrl} alt={promotion.title} fill sizes="100vw" className="object-cover" />
    </div>
  );

  const wrapperClassName = `group block overflow-hidden rounded-lg border border-neon-cyan/20 bg-white/5 p-1.5 transition hover:border-neon-cyan/60 hover:shadow-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan ${className}`;

  if (!promotion.href) {
    return (
      <div className={wrapperClassName} aria-label={promotion.title}>
        {content}
      </div>
    );
  }

  if (isExternalHref(promotion.href)) {
    return (
      <a
        href={promotion.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={promotion.title}
        onClick={handleClick}
        className={wrapperClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={promotion.href} aria-label={promotion.title} onClick={handleClick} className={wrapperClassName}>
      {content}
    </Link>
  );
}

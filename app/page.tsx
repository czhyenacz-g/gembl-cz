import type { Metadata } from "next";
import Image from "next/image";
import { getAssetById } from "../lib/assets/get-assets";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "./config/site";

// Titulní obrázek je celý naschvál včetně textu (nadpis, tagline,
// "PŘIPRAVUJEME") — proto tahle stránka kromě něj nic dalšího nerenderuje:
// žádný header/menu/účet/reklamy/patička, viz zadání "text už je součástí
// obrázku". Konkrétní ID admin ručně nahrál přes UCA pro tenhle účel.
const COMING_SOON_ASSET_ID = 159;

export async function generateMetadata(): Promise<Metadata> {
  const asset = await getAssetById(COMING_SOON_ASSET_ID).catch(() => null);

  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: asset?.imageUrl
        ? [{ url: asset.imageUrl, width: 1536, height: 1024 }]
        : [{ url: `/api/og?title=${encodeURIComponent(SITE_NAME)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Home() {
  const asset = await getAssetById(COMING_SOON_ASSET_ID).catch(() => null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gembl-paper px-4 py-8">
      {asset?.imageUrl ? (
        <div className="relative aspect-[3/2] w-full max-w-5xl">
          <Image
            src={asset.imageUrl}
            alt={asset.title || SITE_NAME}
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>
      ) : (
        <p className="font-serif text-2xl font-black text-gembl-ink">{SITE_NAME} — připravujeme.</p>
      )}
    </div>
  );
}

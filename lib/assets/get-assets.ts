import "server-only";
import { getRecord, getRecords } from "../uca/records.ts";
import type { UcaRecord } from "../uca/types.ts";
import type { Asset } from "./types.ts";

// Assety jsou obyčejné UCA records v collection "assets" (nahrané ručně
// přes UCA admin, viz universalContentApi CLAUDE.md/report) — žádný
// vlastní endpoint, jen mapování na pohodlný typ nad existujícím
// generic records API.
const COLLECTION = "assets";
// Statická, adminem spravovaná grafika se nemění za běhu — bezpečné
// cachovat déle než dynamický obsah (stejné okno jako u HowToFish.cz
// referenční implementace getAssetById).
const ASSET_REVALIDATE_SECONDS = 300;

function mapRecordToAsset(record: UcaRecord): Asset | null {
  const data = record.data;
  const title = typeof data.title === "string" ? data.title : null;
  if (!title) return null;

  const media = record.media[record.media.length - 1];
  const tags = Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string") : [];

  return {
    id: `${record.id}`,
    title,
    note: typeof data.note === "string" && data.note ? data.note : undefined,
    tags,
    imageUrl: media?.public_url,
    createdAt: record.created_at,
  };
}

/** Všechny schválené assety, nejnovější první (UCA `latest()` řazení). */
export async function getAssets(): Promise<Asset[]> {
  const records = await getRecords(COLLECTION, { status: "approved" }).catch(() => []);
  return records.map(mapRecordToAsset).filter((a): a is Asset => a !== null);
}

/**
 * Poslední nahraný asset — žádný speciální "/latest" endpoint, jen
 * první prvek výchozího (nejnovější-první) seznamu. Přesně tohle je
 * odpověď na "najdi poslední asset pro tenhle projekt".
 */
export async function getLatestAsset(): Promise<Asset | null> {
  const assets = await getAssets();
  return assets[0] ?? null;
}

/** Assety obsahující daný tag (client/server-side filtr nad malým výsledkem, žádné UCA rozšíření potřeba). */
export async function getAssetsByTag(tag: string): Promise<Asset[]> {
  const assets = await getAssets();
  const normalized = tag.trim().toLowerCase();
  return assets.filter((asset) => asset.tags.some((t) => t.toLowerCase() === normalized));
}

/**
 * Jeden konkrétní asset podle ID (admin ho ručně vybral, ne "poslední
 * nahraný") — pro místa, kde stránka cíleně odkazuje na KONKRÉTNÍ
 * obrázek (např. coming-soon plakát na homepage). `null` když asset
 * neexistuje, nemá médium, nebo je UCA nedostupné — volající musí mít
 * bezpečný fallback, nikdy ne rozbitý/chybějící obrázek.
 */
export async function getAssetById(id: number): Promise<Asset | null> {
  const record = await getRecord(COLLECTION, id, { revalidateSeconds: ASSET_REVALIDATE_SECONDS }).catch(() => null);
  if (!record) return null;
  return mapRecordToAsset(record);
}

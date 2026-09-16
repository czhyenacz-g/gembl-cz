import "server-only";
import { Resend } from "resend";
import { MAGIC_LINK_TTL_MINUTES } from "./magic-link.ts";

/**
 * Na rozdíl od "bonusových" e-mailů jinde v ekosystému (viz hlasuju-cz
 * `sendPollCreatedEmail`) tady chyba NENÍ fail-open — poslání odkazu je
 * jediný účel tohohle volání, takže volající (API route) chybu zaloguje a
 * uživateli i tak vrátí generickou odpověď (viz zadání "neprozrazuj, zda
 * email v databázi existuje"), ale sama funkce chybu nepolyká.
 */
/**
 * `welcomePrizeG`: volitelná retro-marketingová "výhra" částka (viz
 * lib/onboarding/welcome-prize.ts) — MUSÍ to být přesně ta samá základní
 * částka, co dostal ×2 při skutečném připsání bonusu (viz
 * app/api/auth/magic-link/route.ts, který resolvne číslo JEDNOU a předá ho
 * sem i do createMagicLinkToken), ať e-mail nikdy neslibuje jiné číslo, než
 * kolik se pak reálně přihlášením odemkne (interní ×2 se v textu
 * neprozrazuje — viz zadání). Bez `welcomePrizeG` (starý/obecný login,
 * žádná pending výhra) se pošle standardní neutrální text.
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  loginUrl: string;
  welcomePrizeG?: number;
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY není nastavený.");

  const resend = new Resend(apiKey);
  const { subject, text } = buildMagicLinkEmailContent(params);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "GEMBL.cz <onboarding@resend.dev>",
    to: params.to,
    subject,
    text,
  });

  if (error) throw new Error(`Resend selhal: ${error.message}`);

  // Message ID od Resendu = doklad, že provider zprávu opravdu přijal.
  // Vrací se volajícímu, který ho zaloguje — jinak by "odesláno" nešlo
  // zpětně dohledat (přesně to chybělo při diagnostice "e-mail nepřišel").
  return { id: data?.id ?? "neznámé" };
}

export function buildMagicLinkEmailContent(params: { loginUrl: string; welcomePrizeG?: number }): { subject: string; text: string } {
  const hasPrize = typeof params.welcomePrizeG === "number" && params.welcomePrizeG > 0;

  const subject = hasPrize ? `Blahopřejeme! Vaše výhra ${params.welcomePrizeG} G čeká` : "Přihlašovací odkaz na GEMBL.cz";

  const intro = hasPrize
    ? [`Blahopřejeme, vyhráváte ${params.welcomePrizeG} G!`, "Klikněte na tlačítko níže a vyzvedněte si svou výhru."]
    : ["Klikni na odkaz níže a přihlas se na GEMBL.cz:"];

  const text = [
    ...intro,
    "",
    params.loginUrl,
    "",
    `Odkaz je platný ${MAGIC_LINK_TTL_MINUTES} minut a funguje jen jednou.`,
    "",
    "Pokud sis přihlášení nevyžádal, tenhle e-mail můžeš ignorovat.",
  ].join("\n");

  return { subject, text };
}

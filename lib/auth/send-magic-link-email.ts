import "server-only";
import { Resend } from "resend";
import { MAGIC_LINK_TTL_MINUTES } from "./magic-link";

/**
 * Na rozdíl od "bonusových" e-mailů jinde v ekosystému (viz hlasuju-cz
 * `sendPollCreatedEmail`) tady chyba NENÍ fail-open — poslání odkazu je
 * jediný účel tohohle volání, takže volající (API route) chybu zaloguje a
 * uživateli i tak vrátí generickou odpověď (viz zadání "neprozrazuj, zda
 * email v databázi existuje"), ale sama funkce chybu nepolyká.
 */
export async function sendMagicLinkEmail(params: { to: string; loginUrl: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY není nastavený.");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "GEMBL.cz <onboarding@resend.dev>",
    to: params.to,
    subject: "Přihlašovací odkaz na GEMBL.cz",
    text: [
      "Klikni na odkaz níže a přihlas se na GEMBL.cz:",
      "",
      params.loginUrl,
      "",
      `Odkaz je platný ${MAGIC_LINK_TTL_MINUTES} minut a funguje jen jednou.`,
      "",
      "Pokud sis přihlášení nevyžádal, tenhle e-mail můžeš ignorovat.",
    ].join("\n"),
  });

  if (error) throw new Error(`Resend selhal: ${error.message}`);
}

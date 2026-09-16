import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildMagicLinkEmailContent } from "../lib/auth/send-magic-link-email.ts";

const senderSource = readFileSync(fileURLToPath(new URL("../lib/auth/send-magic-link-email.ts", import.meta.url)), "utf8");
const loginModalSource = readFileSync(
  fileURLToPath(new URL("../app/components/auth/LoginModal.tsx", import.meta.url)),
  "utf8"
);

describe("sendMagicLinkEmail — chyba se nesmí spolknout a musí vrátit message ID", () => {
  test("Resend chyba se vyhodí (nezůstane tichý úspěch) a úspěch vrací id zprávy", () => {
    assert.match(senderSource, /const \{ data, error \} = await resend\.emails\.send\(\{/);
    assert.match(senderSource, /if \(error\) throw new Error\(`Resend selhal: \$\{error\.message\}`\);/);
    assert.match(senderSource, /return \{ id: data\?\.id \?\? "neznámé" \};/);
    assert.match(senderSource, /Promise<\{ id: string \}>/);
  });

  test("bez RESEND_API_KEY se taky vyhazuje chyba (žádné tiché přeskočení)", () => {
    assert.match(senderSource, /if \(!apiKey\) throw new Error\("RESEND_API_KEY není nastavený\."\);/);
  });
});

describe("LoginModal — technické selhání se nesmí tvářit jako odesláno", () => {
  test("odpověď se kontroluje (response.ok) a při chybě se zobrazí výzva zkusit znovu", () => {
    assert.match(loginModalSource, /const response = await fetch\("\/api\/auth\/magic-link", \{/);
    assert.match(loginModalSource, /if \(!response\.ok\) \{\s*setStatus\("error"\);\s*return;\s*\}/);
    assert.match(loginModalSource, /Přihlašovací email se teď nepodařilo odeslat\. Zkus to prosím znovu\./);
  });

  test("technický detail se uživateli nikdy nezobrazuje (žádná Resend/DB zpráva v UI)", () => {
    assert.doesNotMatch(loginModalSource, /Resend|resend/);
    assert.doesNotMatch(loginModalSource, /response\.status|statusText/);
  });
});

describe("buildMagicLinkEmailContent", () => {
  test("s welcomePrizeG ukazuje ZÁKLADNÍ (nezdvojenou) částku v předmětu i těle, nikde neprozrazuje interní ×2", () => {
    const { subject, text } = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/api/auth/verify?token=abc", welcomePrizeG: 200 });
    assert.match(subject, /200 G/);
    assert.match(text, /200 G/);
    assert.doesNotMatch(subject, /400/);
    assert.doesNotMatch(text, /400/);
    assert.doesNotMatch(text.toLowerCase(), /2x|2×|dvojnásob/);
  });

  test("odkaz na přihlášení je vždy v textu, i s výhrou", () => {
    const { text } = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/api/auth/verify?token=xyz", welcomePrizeG: 300 });
    assert.match(text, /https:\/\/gembl\.cz\/api\/auth\/verify\?token=xyz/);
  });

  test("bez welcomePrizeG (0, undefined) posílá neutrální text bez zmínky o výhře", () => {
    const withoutPrize = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/x" });
    assert.doesNotMatch(withoutPrize.subject, /Blahopřejeme/);
    assert.doesNotMatch(withoutPrize.text, /vyhráváte/);

    const zeroPrize = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/x", welcomePrizeG: 0 });
    assert.doesNotMatch(zeroPrize.subject, /Blahopřejeme/);
  });

  test("dvě různé částky dají viditelně jiný text (žádná zapomenutá natvrdo napsaná hodnota)", () => {
    const a = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/x", welcomePrizeG: 100 });
    const b = buildMagicLinkEmailContent({ loginUrl: "https://gembl.cz/x", welcomePrizeG: 400 });
    assert.notEqual(a.subject, b.subject);
    assert.match(b.subject, /400 G/);
  });
});

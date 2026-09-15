import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildMagicLinkEmailContent } from "../lib/auth/send-magic-link-email.ts";

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

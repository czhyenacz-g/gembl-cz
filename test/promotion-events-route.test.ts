import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Next.js Route Handler (next/server) — next/server nejde přímo
// importovat pod node --test (ERR_MODULE_NOT_FOUND), zdrojová kontrola
// jako framework-vázané testy jinde. Validace/tracking samotné je
// testované přímo v track-promotion-event.test.ts.
const source = readFileSync(fileURLToPath(new URL("../app/api/promotion-events/route.ts", import.meta.url)), "utf8");

describe("POST /api/promotion-events", () => {
  test("odmítne event mimo whitelist (impression|click)", () => {
    assert.match(source, /type !== "impression" && type !== "click"/);
    assert.match(source, /status: 400/);
  });

  test("validuje délku promotionId (žádný neomezený string do UCA)", () => {
    assert.match(source, /promotionId\.length === 0 \|\| promotionId\.length > MAX_PROMOTION_ID_LENGTH/);
  });

  test("neplatný JSON / chybějící tělo vrátí 400, ne pád", () => {
    assert.match(source, /catch \{\s*return NextResponse\.json\(\{ ok: false \}, \{ status: 400 \}\);/);
  });

  test("nikdy neimportuje UCA client/token přímo — jen trackPromotionEvent (server-only) zprostředkovaně", () => {
    assert.doesNotMatch(source, /UCA_API_TOKEN/);
    assert.doesNotMatch(source, /from "[^"]*uca\/client"/);
  });

  test("úspěšný zápis vrací ok:true", () => {
    assert.match(source, /await trackPromotionEvent\(promotionId, type\);/);
    assert.match(source, /return NextResponse\.json\(\{ ok: true \}\);/);
  });
});

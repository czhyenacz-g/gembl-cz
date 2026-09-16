import type { Metadata } from "next";
import ResetCareer from "./ResetCareer";

const TITLE = "Reset kariéry";
const DESCRIPTION = "Vynuluj svůj postup na GEMBL.cz — statistiky, achievementy i zůstatek — a začni znovu od začátku.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Stránka je volně přístupná pro lidi (odkaz vede z /jak-to-funguje), ale
  // ve vyhledávačích se nesmí objevit — noindex + nofollow, ať ji roboti
  // nezaindexují ani nepronásledují odkazy z ní (viz zadání "ať není
  // viditelná robotům"). Záměrně tu není `alternates.canonical` — canonical
  // na noindex stránce nedává smysl.
  robots: { index: false, follow: false },
};

// Reset dřív býval tlačítko dole na /automaty (součást statistik herní
// scény) — teď je z něj samostatná, klidná stránka bez herního tlaku, aby
// se omylem neklikalo během hraní. Herní logika je stejná, jen jinde
// (viz ResetCareer.tsx).
export default function ResetPage() {
  return <ResetCareer />;
}

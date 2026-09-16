import type { Metadata } from "next";
import ContentPage from "../../components/stage/ContentPage";
import ProfilPanel, { ProfilActions } from "./ProfilPanel";

const TITLE = "Profil";
const DESCRIPTION = "Tvůj profil na GEMBL.cz — zůstatek, statistiky a postup v jednom přehledu.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/profil" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// /profil jede na společném obsahovém stage (viz app/components/stage/) —
// na desktopu artwork + živý panel, pod breakpointem běžná stránka. Data
// jsou jen ta, která projekt reálně má (session + lokální postup hráče),
// žádný nový backend.
export default function ProfilPage() {
  return (
    <ContentPage
      title="Profil"
      subtitle="Zůstatek, statistiky a postup v jednom přehledu."
      actions={<ProfilActions />}
    >
      <ProfilPanel />
    </ContentPage>
  );
}

// Centrální, čistě informativní config projektu — žádné runtime feature
// flagy, žádná DB, žádný admin. Cíl: při založení nového projektu je na
// jednom místě vidět, co se z platformy (viz CLAUDE.md) reálně používá.
// Nic v `lib/`/`features/` tuhle konfiguraci samo nekontroluje — je to
// dokumentace pro lidi i pro Claude Code, ne vypínač.
export type ProjectConfig = {
  slug: string;
  name: string;
  domain: string;

  features: {
    /** Universal Content API (records/media) jako content/datová vrstva. */
    uca: boolean;
    /** Vlastní obrázky/soubory přes UCA collection "assets". */
    assets: boolean;
    /** Banner/seller promo bloky přes UCA collection "promotions". */
    promotions: boolean;
    /** Steam login — viz features/steam-auth/README.md (vyžaduje DB, není defaultně implementováno). */
    steamAuth: boolean;
    /** Twitch/YouTube/Kick live stream agregace, viz features/streams/. */
    streams: boolean;
    /** Feedback/kontaktní CTA komponenta. */
    feedback: boolean;
    /** Komunitní návrhy (frontend -> UCA record se status=pending). */
    communitySubmissions: boolean;
  };
};

export const projectConfig: ProjectConfig = {
  slug: "gembl",
  name: "GEMBL.cz",
  domain: "gembl.cz",

  features: {
    uca: false,
    assets: false,
    promotions: false,
    steamAuth: false,
    streams: false,
    feedback: false,
    communitySubmissions: false,
  },
};

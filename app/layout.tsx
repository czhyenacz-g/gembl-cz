import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOATCOUNTER_CODE } from "./config/analytics";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./config/site";

// Dramatický, vysoce kontrastní serif pro "novinový/plakátový" masthead
// nadpisy (viz app/styles/gembl-newspaper.css) — nahrazuje předchozí
// zaoblený Bree Serif, který k téhle estetice neseděl.
const playfairDisplay = Playfair_Display({
  weight: ["700", "900"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "cs_CZ",
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent(SITE_NAME)}`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${playfairDisplay.variable} ${inter.variable}`}>
      {/* `flex min-h-screen flex-col` žije v SiteChrome.tsx (přes
          (site)/layout.tsx), ne tady natvrdo — desktop /casino stage ho
          podmíněně vynechává, ať `min-h-screen` neroztáhne stránku na
          výšku obrazovky i s krátkým obsahem stage (viz zadání "zbytečně
          vysoký min-height"). `/` (coming-soon page.tsx) je mimo (site)
          skupinu a řeší si vlastní centrování sám, na tomhle nezávisí. */}
      <body className="bg-gembl-paper font-sans text-gembl-ink antialiased">
        {children}
        <Analytics />
        {GOATCOUNTER_CODE && (
          <Script
            data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
            src="//gc.zgo.at/count.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

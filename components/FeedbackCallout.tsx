"use client";

// Generická, configurable feedback/kontakt komponenta — princip převzatý
// z HowToFish.cz `FeedbackCallout`, ale BEZ HowToFish obsahu (žádná
// konkrétní doména, žádný Steam nickname, žádný pevný text) a BEZ
// auth-gating (starter defaultně nemá přihlašování, viz
// features/steam-auth/README.md). Pokud projekt auth má a chce email
// schovávat před nepřihlášenými návštěvníky, přidej tuhle logiku na
// úrovni projektu — tady by to bylo jen neotestované mrtvé odvětvení.
export type FeedbackCalloutProps = {
  email: string;
  title?: string;
  message?: string;
  ctaLabel?: string;
  className?: string;
};

export default function FeedbackCallout({
  email,
  title = "Chybí ti tu něco?",
  message = "Našel jsi chybu nebo nám něco chybí? Dej nám vědět.",
  ctaLabel = "Napsat nám",
  className = "",
}: FeedbackCalloutProps) {
  return (
    <div className={`mx-auto max-w-lg rounded-lg border border-gray-700 bg-gray-800/60 p-6 text-center ${className}`}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{message}</p>
      <a
        href={`mailto:${email}`}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-amber-500 px-5 py-2 text-sm font-medium text-gray-900 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {ctaLabel}
      </a>
    </div>
  );
}

// /off-market/arcova — sous-section ARCOVA (brief V3 CHANTIER 6).
// ARCOVA n'apparaît plus dans le header principal : il devient une
// page de sous-section accessible depuis /off-market.
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default async function OffmarketArcovaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ArcovaContent />;
}

function ArcovaContent() {
  const t = useTranslations("arcova");
  return (
    <main className="mx-auto max-w-3xl px-6 py-32 lg:px-10">
      <Link
        href="/off-market"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft transition-colors hover:text-gold"
      >
        ← Retour à Off-Market
      </Link>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        <LockIcon /> {t("eyebrow")}
      </div>
      <h1 className="t-h1">
        {t("title")}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-mid">{t("intro")}</p>

      <div className="mt-12 rounded-lg border border-line bg-bg-soft p-8">
        <h2 className="t-h3">{t("waitlist_title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">{t("waitlist_text")}</p>
        {/* Sprint UI-MAI : bouton "Demander une invitation". Bug constate
            par Julien : bg-navy + text-white etait illisible en mode
            sombre car le token --navy s'inverse (#1F221A sapin en clair
            -> #F0E6CC creme en sombre), donc le bouton devenait creme
            avec texte blanc = clair sur clair. Fix : bg-ink + text-bg
            qui sont toujours opposes (bg-ink = couleur encre du theme,
            text-bg = couleur de fond inverse) -> contraste fort dans
            les 2 modes. text-ink seul aurait ete invisible sur bg-navy
            car ink et navy partagent la meme valeur dans chaque mode. */}
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-bg transition-opacity hover:opacity-85"
        >
          {t("waitlist_cta")}
          <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        {t("legal")}
      </p>
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

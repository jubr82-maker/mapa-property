import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function MandatesPremium() {
  const t = useTranslations("mandates_premium");

  const exclusiveBullets = [
    t("exclusive_bullet_1"),
    t("exclusive_bullet_2"),
    t("exclusive_bullet_3"),
    t("exclusive_bullet_4"),
  ];

  const searchBullets = [
    t("search_bullet_1"),
    t("search_bullet_2"),
    t("search_bullet_3"),
    t("search_bullet_4"),
  ];

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8 max-w-3xl md:mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-sm text-ink-mid md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div className="grid gap-3 md:gap-6 md:grid-cols-2">
          {/* Carte Mandat Exclusif — gradient copper */}
          <article
            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #B8865A 0%, #8B6635 100%)",
            }}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />

            <span className="relative inline-flex w-fit items-center font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
              {t("exclusive_badge")}
            </span>

            <h3 className="relative font-display text-3xl font-black leading-tight text-white md:text-5xl">
              {t("exclusive_title")}
            </h3>

            <div className="relative flex items-baseline gap-3">
              <span className="font-display text-4xl font-black text-white md:text-6xl">
                {t("exclusive_rate")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/80">
                {t("rate_suffix")}
              </span>
            </div>

            <p className="relative text-sm leading-relaxed text-white/90 md:text-base">
              {t("exclusive_promise")}
            </p>

            <ul className="relative grid gap-2 text-sm text-white/90">
              {exclusiveBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-white"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/mandats/exclusif"
              className="relative mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink shadow-md transition-transform hover:scale-[1.02] md:px-6"
              style={{ color: "#8B6635" }}
            >
              {t("exclusive_cta")}
              <span aria-hidden>→</span>
            </Link>
          </article>

          {/* Carte Mandat de Recherche — gradient bleu + accents copper */}
          <article
            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border-2 p-6 text-white shadow-lg md:p-10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #3D4F63 0%, #2A3848 100%)",
              borderColor: "#B8865A",
            }}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full blur-3xl"
              style={{ backgroundColor: "rgba(184, 134, 90, 0.15)" }}
            />

            <span
              className="relative inline-flex w-fit items-center font-mono text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: "#B8865A" }}
            >
              {t("search_badge")}
            </span>

            <h3 className="relative font-display text-3xl font-black leading-tight text-white md:text-5xl">
              {t("search_title")}
            </h3>

            <p className="relative text-sm leading-relaxed text-white/90 md:text-base">
              {t("search_promise")}
            </p>

            <ul className="relative grid gap-2 text-sm text-white/90">
              {searchBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1 inline-block size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "#B8865A" }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/mandats/recherche"
              className="relative mt-2 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-md transition-all hover:bg-gold hover:text-ink md:px-6"
              style={{ backgroundColor: "#B8865A" }}
            >
              {t("search_cta")}
              <span aria-hidden>→</span>
            </Link>
          </article>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft md:mt-8">
          {t("footer_note")}
        </p>
      </div>
    </section>
  );
}

// Page 404 utile, dans la langue de l'adresse demandee (oct. 2026) :
// recherche de biens et liens vers les pages principales. Statut HTTP 404,
// jamais indexee.
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: true } };

const LINKS = [
  { href: "/biens", key: "link_properties" },
  { href: "/services/estimer", key: "link_estimate" },
  { href: "/services/simulateurs", key: "link_simulators" },
  { href: "/services/marches-actifs", key: "link_markets" },
  { href: "/off-market", key: "link_offmarket" },
  { href: "/blog", key: "link_blog" },
  { href: "/contact", key: "link_contact" },
] as const;

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "not_found" });
  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("eyebrow")}</p>
        <h1 className="mt-2 t-h1">{t("title")}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-mid">{t("text")}</p>

        <form action={`/${locale}/biens`} method="get" className="mt-10 rounded-2xl border border-line bg-bg-soft p-6">
          <label htmlFor="nf-city" className="block font-mono text-xs uppercase tracking-[0.2em] text-ink-mid">
            {t("search_label")}
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="nf-city"
              name="city"
              type="search"
              placeholder={t("search_placeholder")}
              className="min-h-12 flex-1 rounded-full border border-line bg-bg px-5 text-base text-ink"
            />
            <select
              name="transaction"
              aria-label={t("transaction_label")}
              defaultValue=""
              className="min-h-12 rounded-full border border-line bg-bg px-5 text-base text-ink"
            >
              <option value="">{t("transaction_all")}</option>
              <option value="sale">{t("transaction_sale")}</option>
              <option value="rent">{t("transaction_rent")}</option>
            </select>
            <button type="submit" className="min-h-12 rounded-full bg-ink px-6 font-mono text-xs uppercase tracking-[0.2em] text-bg">
              {t("search_submit")}
            </button>
          </div>
        </form>

        <nav aria-label={t("links_title")} className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-mid">{t("links_title")}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center text-base text-ink underline underline-offset-4 hover:text-gold-deep">
                {t("link_home")}
              </Link>
            </li>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center text-base text-ink underline underline-offset-4 hover:text-gold-deep">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

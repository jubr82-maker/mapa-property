import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { budgetLabel, criteriaList, localizedText } from "@/lib/searches/display";
import type { PublicSearch } from "@/lib/searches/search";

// Carte d'une recherche en cours (liste publique, page d'une commune) :
// presentee comme une annonce, sans aucune donnee du client.
export async function SearchCard({ search, locale }: { search: PublicSearch; locale: string }) {
  const t = await getTranslations({ locale, namespace: "searches_page" });
  const tr = (k: string, v?: Record<string, string | number>) => t(k, v);
  const title = localizedText(search, "title", locale) || search.reference;
  const criteria = criteriaList(search, locale, tr);
  const found = search.status === "found";
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-bg p-6" data-search-card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          {t(`type.${search.property_type}`)} · {t(search.transaction === "rent" ? "tx_rent" : "tx_sale")}
        </p>
        {found && (
          <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid">{t("found_badge")}</span>
        )}
      </div>
      <h2 className="mt-3 font-display text-xl font-bold leading-snug text-ink">
        <Link href={`/recherches/${search.reference}`} className="hover:text-gold">
          {title}
        </Link>
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("label_communes")}</dt>
          <dd className="mt-0.5 text-ink">{search.communes.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("label_budget")}</dt>
          <dd className="mt-0.5 text-ink">{budgetLabel(search, locale, tr)}</dd>
        </div>
        {search.delay && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("label_delay")}</dt>
            <dd className="mt-0.5 text-ink">{t(`delay_${search.delay}`)}</dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("label_reference")}</dt>
          <dd className="mt-0.5 font-mono text-ink">{search.reference}</dd>
        </div>
      </dl>
      {criteria.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("label_criteria")}</p>
          <ul className="mt-1 space-y-1 text-sm text-ink-mid">
            {criteria.slice(0, 6).map((c) => (
              <li key={c}>- {c}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto pt-6">
        {found ? (
          <p className="text-sm text-ink-soft">{t("found_note")}</p>
        ) : (
          <Link
            href={`/recherches/${search.reference}#contact-form`}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-bg transition-opacity hover:opacity-85"
          >
            {t("cta")}
          </Link>
        )}
      </div>
    </article>
  );
}

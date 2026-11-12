// Ce que la recherche a compris (nov. 2026, regles 4, 12, 13, 14) : pastilles
// retirables d'un clic au-dessus des resultats, lieu sans bien, criteres
// relaches, suggestion "Uniquement Luxembourg-Ville ?" et, si la demande est
// incomprise, le message et trois exemples cliquables. Composant serveur.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { placeLabel, type Place } from "@/lib/search/places";
import { hrefWith, placeParam, withoutItem, type SearchParamsRecord } from "@/lib/search/url";
import type { Relaxed, SearchCriteria } from "@/lib/search/engine";
import { formatPrice } from "@/lib/format/numbers";

type Chip = { key: string; label: string; href: string };

export async function SearchSummary({
  locale,
  sp,
  criteria,
  emptyPlace,
  relaxed,
  suggestCity,
}: {
  locale: string;
  sp: SearchParamsRecord;
  criteria: SearchCriteria;
  emptyPlace: Place | null;
  relaxed: Relaxed[];
  suggestCity: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "search_results" });
  const tSearch = await getTranslations({ locale, namespace: "search" });

  if (criteria.notUnderstood) {
    const examples = [t("example_1"), t("example_2"), t("example_3")];
    return (
      <div data-search-not-understood className="mt-8 rounded-xl border border-line bg-bg-soft p-6">
        <p className="font-display text-xl font-bold text-ink">{t("not_understood")}</p>
        <p className="mt-2 text-sm text-ink-mid">{t("examples_intro")}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {examples.map((e) => (
            <li key={e}>
              <Link
                href={`/biens?q=${encodeURIComponent(e)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-gold-text"
              >
                {e}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const chips: Chip[] = [];
  for (const p of criteria.places) {
    if (p.kind === "country" || p.kind === "lu-country") {
      chips.push({ key: `country-${p.country}`, label: placeLabel(p, locale), href: hrefWith(sp, { country: null, pays: null }) });
    } else {
      const name = placeParam(p);
      chips.push({ key: `city-${name}-${p.commune ?? ""}`, label: placeLabel(p, locale), href: hrefWith(sp, { city: withoutItem(sp.city, name) ?? withoutItem(sp.city, p.name), q: null }) });
    }
  }
  if (criteria.near) chips.push({ key: "near", label: t("chip_near"), href: hrefWith(sp, { near: null }) });
  for (const z of criteria.zones) chips.push({ key: `zone-${z}`, label: t(`zone_${z}`), href: hrefWith(sp, { zone: withoutItem(sp.zone, z) }) });
  for (const ty of criteria.types) {
    const key = `type_${ty}`;
    chips.push({ key: `type-${ty}`, label: t.has(key) ? t(key) : ty, href: hrefWith(sp, { types: withoutItem(sp.types ?? sp.type, ty), type: null }) });
  }
  if (criteria.transaction) chips.push({ key: "tx", label: t(`tx_${criteria.transaction}`), href: hrefWith(sp, { transaction: null }) });
  if (criteria.budgetMin !== null) chips.push({ key: "bmin", label: t("chip_budget_min", { value: formatPrice(criteria.budgetMin, locale) }), href: hrefWith(sp, { budget_min: null }) });
  if (criteria.budgetMax !== null) chips.push({ key: "bmax", label: t("chip_budget_max", { value: formatPrice(criteria.budgetMax, locale) }), href: hrefWith(sp, { budget_max: null }) });
  if (criteria.bedroomsMin !== null) chips.push({ key: "bed", label: t("chip_bedrooms", { count: criteria.bedroomsMin }), href: hrefWith(sp, { min_bedrooms: null }) });
  if (criteria.surfaceMin !== null) chips.push({ key: "surf", label: t("chip_surface", { value: criteria.surfaceMin }), href: hrefWith(sp, { min_surface: null }) });
  for (const a of criteria.amenities) chips.push({ key: `eq-${a}`, label: t(`amenity_${a}`), href: hrefWith(sp, { equip: withoutItem(sp.equip, a) }) });
  if (criteria.countryChoice && criteria.countryChoice !== "tous") chips.push({ key: "pays", label: t(`pays_${criteria.countryChoice}`), href: hrefWith(sp, { pays: null }) });

  const relaxedShown = relaxed.filter((r) => r !== "all");
  return (
    <div className="mt-8 space-y-4" data-search-summary>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-mid">{t("understood")}</span>
          <ul className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={c.href}
                  data-search-chip
                  aria-label={t("chip_remove", { label: c.label })}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-bg-soft px-3 py-1 text-sm text-ink transition-colors hover:border-gold hover:text-gold-text"
                >
                  {c.label}
                  <span aria-hidden className="text-ink-mid">×</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/biens" className="ml-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid underline underline-offset-4 hover:text-gold-text">
            {tSearch("type_filter.clear")}
          </Link>
        </div>
      )}
      {emptyPlace && (
        <p data-search-empty-place className="font-display text-xl font-bold text-ink">
          {t("empty_place", { place: placeLabel(emptyPlace, locale) })}
        </p>
      )}
      {relaxed.includes("all") && <p data-search-relaxed className="text-sm text-ink-mid">{t("relaxed_all")}</p>}
      {relaxedShown.length > 0 && (
        <p data-search-relaxed className="text-sm text-ink-mid">
          {t("relaxed_intro", { list: relaxedShown.map((r) => t(`relaxed_${r}`)).join(", ") })}
        </p>
      )}
      {suggestCity && (
        <p>
          <Link
            href={hrefWith(sp, { country: null, city: "Luxembourg-Ville", q: null })}
            data-search-suggest-city
            className="inline-flex min-h-11 items-center rounded-full border border-gold/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-gold-text transition-colors hover:border-gold"
          >
            {t("suggest_city")}
          </Link>
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * Choix "Page de ville" d'un bien (oct. 2026), a cote de la ville saisie.
 * Liste fermee construite depuis le referentiel des pages (lib/cities.ts,
 * via cityPageOptions) : automatique (selon la ville saisie et les alias),
 * une page precise, ou aucune page. La ligne d'etat dit en clair a quelle
 * page le bien est rattache. Valeur enregistree dans
 * listing_data.facts.city_page ; la ville saisie n'est jamais modifiee.
 */
import { useTranslations } from "next-intl";
import { resolveCitySlug } from "@/lib/city-match";

export type CityPageOption = { slug: string; label: string; lu: boolean; keys: string[] };

export function CityPageSelect({
  options,
  place,
  value,
  onChange,
  name,
  className,
}: {
  options: CityPageOption[];
  /** Ville saisie pour le bien. */
  place: string | null;
  /** "" = automatique, "none" = aucune page, sinon identifiant de page. */
  value: string;
  onChange: (v: string) => void;
  /** Nom du champ dans un formulaire envoye tel quel (creation). */
  name?: string;
  className: string;
}) {
  const t = useTranslations("admin_properties");
  const slug = resolveCitySlug(options, place, value || null);
  const page = slug ? options.find((o) => o.slug === slug) : undefined;
  return (
    <>
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className={className} data-city-page-select>
        <option value="">{t("city_page_auto")}</option>
        <optgroup label={t("city_page_group_lu")}>
          {options.filter((o) => o.lu).map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("city_page_group_intl")}>
          {options.filter((o) => !o.lu).map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </optgroup>
        <option value="none">{t("city_page_none_option")}</option>
      </select>
      <span className="mt-1 block text-xs text-[#3D4F63]/60" data-city-page-status>
        {page ? t("city_page_attached", { city: page.label }) : t("city_page_missing")}
      </span>
    </>
  );
}

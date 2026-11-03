"use client";

/**
 * Localite du bien au Luxembourg, formulaires de mandat (oct. 2026, refait
 * en nov. 2026) : liste FERMEE des localites officielles (registre CACLR)
 * et des quartiers de la Ville, recue en prop de la page (jamais dans le
 * JavaScript commun). Bouton et panneau partages avec l'admin
 * (LuLocalityPicker) : liste complete au clic, filtre a la frappe, avec la
 * commune ("Kleinbettingen, commune de Steinfort"). Aucun champ envoye :
 * ContactForm transmet la localite choisie (city, city_commune).
 * Charge a la demande par ContactForm (next/dynamic) : seules les pages de
 * mandat le telechargent.
 */
import { useTranslations } from "next-intl";
import { LuLocalityPicker } from "./LuLocalityPicker";
import type { LuPlace } from "@/lib/geo/lu-place-match";

export function LuLocalityField({
  places,
  value,
  onChange,
  className,
}: {
  places: LuPlace[];
  value: LuPlace | null;
  onChange: (place: LuPlace | null) => void;
  className: string;
}) {
  const t = useTranslations("form");
  const label = (p: LuPlace) => (p.quartier ? t("city_quartier_option", { name: p.name }) : t("city_lu_option", { name: p.name, commune: p.commune }));
  return (
    <LuLocalityPicker
      places={places}
      value={value}
      onChange={onChange}
      optionLabel={label}
      texts={{ choose: t("city_lu_choose"), search: t("city_lu_search"), list: t("city_lu_list"), noMatch: t("city_lu_no_match") }}
      tone="site"
      triggerClassName={className}
      required
    />
  );
}

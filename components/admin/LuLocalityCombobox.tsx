"use client";

/**
 * Ville d'un bien au Luxembourg, admin (oct. 2026, refait en nov. 2026) :
 * liste FERMEE des localites officielles (registre CACLR,
 * lib/geo/lu-localities.ts) et des quartiers de la Ville de Luxembourg,
 * affichees avec leur commune ("Kleinbettingen, commune de Steinfort").
 * Bouton et panneau partages avec les formulaires de mandat
 * (components/forms/LuLocalityPicker.tsx) : liste complete au clic, filtre
 * a la frappe, aucune saisie libre. Tant qu'aucune localite n'est choisie,
 * l'enregistrement est refuse (ici et par le serveur).
 *
 * Aucun champ envoye par ce composant : chaque formulaire envoie la
 * localite choisie (creation d'un bien : champs caches `city` et
 * `city_commune` dans PropertyCreateForm).
 */

import { useTranslations } from "next-intl";
import { LuLocalityPicker } from "@/components/forms/LuLocalityPicker";
import type { LuPlace } from "@/lib/geo/lu-place-match";

export function LuLocalityCombobox({
  places,
  value,
  onChange,
  className = "",
}: {
  places: LuPlace[];
  /** Localite choisie, ou null. */
  value: LuPlace | null;
  onChange: (place: LuPlace | null) => void;
  className?: string;
}) {
  const t = useTranslations("admin_properties");
  const label = (p: LuPlace) =>
    p.communeOnly
      ? t("city_commune_option", { commune: p.commune })
      : p.quartier
        ? t("city_quartier_option", { name: p.name })
        : t("city_lu_option", { name: p.name, commune: p.commune });
  return (
    <LuLocalityPicker
      places={places}
      value={value}
      onChange={onChange}
      optionLabel={label}
      texts={{ choose: t("city_lu_choose"), search: t("city_lu_search"), list: t("city_lu_list"), noMatch: t("city_lu_no_match") }}
      tone="admin"
      triggerClassName={className}
    />
  );
}

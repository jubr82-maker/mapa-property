// Title et meta description des fiches off-market (SEO oct. 2026).
// Generiques : TYPE de bien et ZONE uniquement. Jamais d'adresse, de prix,
// de surface, de reference ni de texte libre de l'annonce.
//
// La vue publique n'a pas de champ "type" : il est deduit de mots-cles du
// titre (FR, EN, DE) ; a defaut, libelle generique "bien d'exception".
// Deux fiches de meme type dans la meme zone recoivent un numero d'ordre
// stable "(2)", pour que chaque page indexable ait un title unique.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo-page-meta";
import { metaDescription } from "@/lib/meta-text";
import type { PropertyOffmarket } from "@/lib/types";

export type OffmarketSeoType =
  | "penthouse"
  | "duplex"
  | "villa"
  | "appartement"
  | "maison"
  | "immeuble"
  | "terrain"
  | "property";

// Ordre = priorite (un "penthouse" est aussi un appartement).
const TYPE_KEYWORDS: [OffmarketSeoType, RegExp][] = [
  ["penthouse", /\bpenthouse\b/],
  ["duplex", /\b(duplex|triplex)\b/],
  ["villa", /\bvilla\b/],
  ["appartement", /\b(appartement|apartment|flat|wohnung|studio|loft)\b/],
  ["maison", /\b(maison|house|haus|einfamilienhaus|chalet|manoir|propriete|domaine|estate)\b/],
  ["immeuble", /\b(immeuble|building|gebaude|mehrfamilienhaus)\b/],
  ["terrain", /\b(terrain|plot|land|grundstuck|bauland)\b/],
];

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function detectOffmarketType(title: string | null | undefined): OffmarketSeoType {
  const t = fold(title ?? "");
  for (const [type, re] of TYPE_KEYWORDS) if (re.test(t)) return type;
  return "property";
}

function zoneOf(p: Pick<PropertyOffmarket, "city_label" | "country">): string {
  return (p.city_label ?? "").trim() || (p.country ?? "").trim() || "Luxembourg";
}

const SUFFIX = ", MAPA Property";
const TITLE_MAX = 60;

export async function offmarketFicheMetadata(
  locale: string,
  property: PropertyOffmarket,
  all: PropertyOffmarket[],
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo_pages.offmarket_fiche" });
  const type = detectOffmarketType(property.title);
  const typeLabel = t(`types.${type}`);
  const zone = zoneOf(property);

  // Rang parmi les fiches de meme type et meme zone (ordre d'affichage puis id).
  const key = `${type}|${fold(zone)}`;
  const peers = all
    .filter((o) => `${detectOffmarketType(o.title)}|${fold(zoneOf(o))}` === key)
    .sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) || a.id.localeCompare(b.id),
    );
  const rank = peers.findIndex((o) => o.id === property.id) + 1;
  const withRank = (s: string) => (rank > 1 ? t("rank", { base: s, rank }) : s);

  // Title : zone raccourcie sur une fin de mot si la limite de 60 est depassee.
  let zoneForTitle = zone;
  let title = withRank(t("title", { type: typeLabel, zone: zoneForTitle })) + SUFFIX;
  while (title.length > TITLE_MAX && zoneForTitle.includes(" ")) {
    zoneForTitle = zoneForTitle.slice(0, zoneForTitle.lastIndexOf(" ")).replace(/[,\s]+$/, "");
    title = withRank(t("title", { type: typeLabel, zone: zoneForTitle })) + SUFFIX;
  }
  if (title.length > TITLE_MAX) {
    title = withRank(t("title", { type: typeLabel, zone: zone.slice(0, 12).trim() })) + SUFFIX;
  }

  // Description : 120 a 155 caracteres (phrase complementaire si trop
  // courte, coupe propre si trop longue).
  let description = withRank(t("description", { type: typeLabel, zone }));
  if (description.length < 120) description += t("extra");
  description = metaDescription(description, 155);

  return buildPageMetadata(locale, `/off-market/${property.id}`, title, description);
}

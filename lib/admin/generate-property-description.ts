// Sprint BRIQUE-IA-1 — Génération de descriptions commerciales (FR/EN/DE)
// via Mistral, à partir des données STRUCTURÉES d'un bien. Distinct de
// lib/translate.ts (qui traduit un texte déjà écrit) : ici on RÉDIGE depuis
// des faits, jamais depuis un texte source.
//
// Même plomberie Mistral que le reste du site (endpoint, modèle, clé) —
// cf. lib/translate.ts et app/api/chatbot/route.ts. response_format
// json_object réutilisé tel quel : déjà confirmé fonctionnel avec
// mistral-small-latest dans app/api/chatbot/route.ts (Sprint ELENA-NAV).
//
// Garde-fou anti-hallucination : le prompt ne contient QUE les champs
// renseignés du bien (buildFactSheet omet tout champ null/absent, et
// n'affiche un équipement booléen que s'il est true) — Mistral n'a
// structurellement aucune autre information à sa disposition.

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

export interface PropertyFacts {
  propertyTypeLabel: string;
  transactionLabel: string;
  propertyStateLabel: string | null;
  city: string | null;
  country: string | null;
  surface: number | null;
  livingSurface: number | null;
  usableSurface: number | null;
  landSurface: number | null;
  terraceSurface: number | null;
  balconySurface: number | null;
  gardenSurface: number | null;
  kitchenSurface: number | null;
  areaTotal: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  douches: number | null;
  wc: number | null;
  bureaux: number | null;
  locauxStockage: number | null;
  floor: string | null;
  hasLaundry: boolean;
  hasDressing: boolean;
  hasPool: boolean;
  parking: number | null;
  energy: string | null;
  thermal: string | null;
  ges: string | null;
  year: number | null;
  amenities: string | null;
  currentUse: string | null;
  potentialUse: string | null;
  price: number | null;
  priceOnDemand: boolean;
  priceMin: number | null;
  priceMax: number | null;
}

export interface GeneratedTexts {
  fr: string;
  en: string;
  de: string;
}

/**
 * Fiche de faits en français, une ligne par donnée RENSEIGNÉE uniquement.
 * C'est la SEULE source d'information transmise à Mistral — aucun champ
 * null/absent n'apparaît, aucun équipement booléen faux n'est mentionné
 * (ni en positif ni en négatif). Mistral ne peut pas halluciner ce qu'il
 * ne voit jamais.
 */
function buildFactSheet(f: PropertyFacts): string {
  const lines: string[] = [];
  lines.push(`Type de bien : ${f.propertyTypeLabel}`);
  lines.push(`Transaction : ${f.transactionLabel}`);
  if (f.propertyStateLabel) lines.push(`État : ${f.propertyStateLabel}`);
  if (f.city || f.country) {
    lines.push(`Localisation : ${[f.city, f.country].filter(Boolean).join(", ")}`);
  }
  if (f.livingSurface) lines.push(`Surface habitable : ${f.livingSurface} m²`);
  else if (f.surface) lines.push(`Surface : ${f.surface} m²`);
  if (f.usableSurface) lines.push(`Surface utile : ${f.usableSurface} m²`);
  if (f.landSurface) lines.push(`Terrain : ${f.landSurface} m²`);
  if (f.terraceSurface) lines.push(`Terrasse : ${f.terraceSurface} m²`);
  if (f.balconySurface) lines.push(`Balcon : ${f.balconySurface} m²`);
  if (f.gardenSurface) lines.push(`Jardin : ${f.gardenSurface} m²`);
  if (f.kitchenSurface) lines.push(`Cuisine : ${f.kitchenSurface} m²`);
  if (f.areaTotal) lines.push(`Surface totale (immeuble) : ${f.areaTotal} m²`);
  if (f.bedrooms != null) lines.push(`Chambres : ${f.bedrooms}`);
  if (f.bathrooms != null) lines.push(`Salles de bain : ${f.bathrooms}`);
  if (f.douches != null) lines.push(`Douches : ${f.douches}`);
  if (f.wc != null) lines.push(`WC : ${f.wc}`);
  if (f.bureaux != null) lines.push(`Bureaux : ${f.bureaux}`);
  if (f.locauxStockage != null) lines.push(`Locaux de stockage : ${f.locauxStockage}`);
  if (f.floor) lines.push(`Étage : ${f.floor}`);
  if (f.hasLaundry) lines.push(`Buanderie : présente`);
  if (f.hasDressing) lines.push(`Dressing : présent`);
  if (f.hasPool) lines.push(`Piscine : présente`);
  if (f.parking != null) lines.push(`Emplacements parking : ${f.parking}`);
  if (f.energy) lines.push(`Classe énergétique (DPE) : ${f.energy}`);
  if (f.thermal) lines.push(`Isolation thermique : ${f.thermal}`);
  if (f.ges) lines.push(`Classe GES : ${f.ges}`);
  if (f.year) lines.push(`Année de construction : ${f.year}`);
  if (f.amenities) lines.push(`Prestations : ${f.amenities}`);
  if (f.currentUse) lines.push(`Usage actuel : ${f.currentUse}`);
  if (f.potentialUse) lines.push(`Usage potentiel : ${f.potentialUse}`);
  if (f.priceOnDemand) lines.push(`Prix : sur demande`);
  else if (f.price) lines.push(`Prix : ${f.price.toLocaleString("fr-FR")} €`);
  if (f.priceMin && f.priceMax) {
    lines.push(
      `Fourchette de prix : ${f.priceMin.toLocaleString("fr-FR")} - ${f.priceMax.toLocaleString("fr-FR")} €`,
    );
  }
  return lines.join("\n");
}

function buildLongPrompt(factSheet: string): string {
  return `Tu es rédacteur immobilier pour MAPA Property, agence de prestige au Luxembourg. Tu rédiges des descriptions commerciales PREMIUM : factuelles, valorisantes, élégantes — jamais racoleuses, jamais pauvres.

RÈGLE ABSOLUE — AUCUNE INVENTION :
Tu ne dois utiliser QUE les faits listés dans la FICHE DE FAITS ci-dessous. Si une caractéristique n'y figure PAS (piscine, dressing, buanderie, terrasse, jardin, etc.), tu NE DOIS JAMAIS l'inventer, la suggérer ou l'impliquer. N'ajoute aucun chiffre, aucune surface, aucun équipement absent de la fiche.

FICHE DE FAITS (source unique autorisée) :
${factSheet}

CONSIGNES DE RÉDACTION :
1. Rédige 3 descriptions commerciales complètes, une par langue : française (fr), anglaise (en), allemande (de).
2. Chaque langue est une rédaction NATIVE et indépendante (même sens, mêmes faits) — PAS une traduction mot à mot des deux autres.
3. Ton premium, sobre, élégant. Phrases fluides en paragraphes, pas de liste à puces, pas d'emoji, pas de superlatifs vides ("incroyable", "unique au monde").
4. Chaque description fait entre 150 et 350 mots.
5. Ne récite pas la fiche de faits telle quelle — transforme-la en texte rédigé et engageant.
6. N'invente ni prix, ni adresse précise, ni détail non listé dans la fiche.

FORMAT DE SORTIE STRICT :
Réponds UNIQUEMENT avec un objet JSON valide de la forme exacte :
{"fr": "<description française>", "en": "<description anglaise>", "de": "<description allemande>"}
Aucun texte avant ou après le JSON. Pas de markdown, pas de backticks.`;
}

function buildShortPrompt(factSheet: string): string {
  return `Tu es rédacteur immobilier pour MAPA Property, agence de prestige au Luxembourg. Tu rédiges un PITCH COURT (une phrase d'accroche) pour une fiche bien.

RÈGLE ABSOLUE — AUCUNE INVENTION :
Tu ne dois utiliser QUE les faits listés dans la FICHE DE FAITS ci-dessous. N'invente, ne suggère et n'implique aucune caractéristique absente de cette fiche.

FICHE DE FAITS (source unique autorisée) :
${factSheet}

CONSIGNES DE RÉDACTION :
1. Rédige 3 pitchs courts, une phrase par langue : française (fr), anglaise (en), allemande (de).
2. Chaque langue est une rédaction NATIVE et indépendante — PAS une traduction mot à mot.
3. Une seule phrase par langue, 12 à 25 mots, ton premium et sobre, pas d'emoji, pas de superlatifs vides.
4. N'invente ni prix, ni adresse précise, ni détail non listé dans la fiche.

FORMAT DE SORTIE STRICT :
Réponds UNIQUEMENT avec un objet JSON valide de la forme exacte :
{"fr": "<pitch français>", "en": "<pitch anglais>", "de": "<pitch allemand>"}
Aucun texte avant ou après le JSON. Pas de markdown, pas de backticks.`;
}

async function callMistralForTexts(
  systemPrompt: string,
  maxTokens: number,
): Promise<GeneratedTexts> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("Génération IA indisponible (clé Mistral non configurée).");
  }

  const res = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mistral HTTP ${res.status} : ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Réponse Mistral vide.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Réponse Mistral non conforme (JSON invalide).");
  }

  const obj = parsed as Record<string, unknown>;
  const fr = typeof obj.fr === "string" ? obj.fr.trim() : "";
  const en = typeof obj.en === "string" ? obj.en.trim() : "";
  const de = typeof obj.de === "string" ? obj.de.trim() : "";
  if (!fr || !en || !de) {
    throw new Error("Réponse Mistral incomplète (fr/en/de manquant).");
  }
  return { fr, en, de };
}

/** ~350 mots max/langue x 3 langues + balisage JSON — un seul appel Mistral. */
export async function generateDescriptionsFromFacts(
  facts: PropertyFacts,
): Promise<GeneratedTexts> {
  return callMistralForTexts(buildLongPrompt(buildFactSheet(facts)), 1800);
}

/** Pitch court (1 phrase/langue) — bonus, même garde-fous, appel séparé. */
export async function generateShortPitchFromFacts(
  facts: PropertyFacts,
): Promise<GeneratedTexts> {
  return callMistralForTexts(buildShortPrompt(buildFactSheet(facts)), 400);
}

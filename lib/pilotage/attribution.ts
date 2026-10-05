// Origine reelle d'une demande client (oct. 2026). Module pur, sans acces
// au navigateur ni a la base : utilise par les routes des formulaires et
// par l'admin. La capture cote navigateur est dans
// lib/pilotage/attribution-client.ts (seulement apres consentement aux
// statistiques).

export type Attribution = {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

/** Canal d'acquisition enregistre en base (leads.origin_channel). */
export type AcquisitionChannel = "campaign" | "google" | "search_other" | "website" | "direct" | "unknown";

const SEARCH_ENGINES = /(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org|qwant\.com|yandex\.[a-z]+|baidu\.com)$/;

function cleanField(v: unknown, max: number, pattern: RegExp): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase().slice(0, max);
  return t && pattern.test(t) ? t : null;
}

/** Valide et borne ce que le navigateur envoie ; null si absent. */
export function sanitizeAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const a: Attribution = {
    referrerHost: cleanField(r.referrerHost, 120, /^[a-z0-9.-]+$/),
    utmSource: cleanField(r.utmSource, 80, /^[\w .+-]+$/),
    utmMedium: cleanField(r.utmMedium, 80, /^[\w .+-]+$/),
    utmCampaign: cleanField(r.utmCampaign, 120, /^[\w .+-]+$/),
  };
  return a;
}

/**
 * Canal : campagne si un parametre UTM est present, Google ou autre moteur
 * selon le site d'origine, autre site, acces direct (consentement donne,
 * aucun site d'origine), inconnu (aucune donnee : pas de consentement).
 */
export function classifyChannel(a: Attribution | null): AcquisitionChannel {
  if (!a) return "unknown";
  if (a.utmSource || a.utmMedium || a.utmCampaign) return "campaign";
  const host = a.referrerHost;
  if (!host) return "direct";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (SEARCH_ENGINES.test(host)) return "search_other";
  return "website";
}

/** Colonnes a ajouter a l'insertion d'un lead (ignorees si absentes en base). */
export function attributionColumns(raw: unknown): Record<string, string | null> {
  const a = sanitizeAttribution(raw);
  return {
    origin_channel: classifyChannel(a),
    referrer_host: a?.referrerHost ?? null,
    utm_source: a?.utmSource ?? null,
    utm_medium: a?.utmMedium ?? null,
    utm_campaign: a?.utmCampaign ?? null,
  };
}

/** Source affichee dans l'admin : formulaire d'origine puis canal. */
export type DisplaySource = "chatbot" | "estimation" | AcquisitionChannel;

export function displaySource(row: { source?: string | null; type?: string | null; origin_channel?: string | null }, kind: "lead" | "estimation" = "lead"): DisplaySource {
  if (kind === "estimation") return "estimation";
  const src = `${row.source ?? ""} ${row.type ?? ""}`.toLowerCase();
  if (src.includes("chatbot")) return "chatbot";
  if (row.origin_channel === "campaign") return "campaign";
  const known: AcquisitionChannel[] = ["google", "search_other", "website", "direct", "unknown"];
  return known.includes(row.origin_channel as AcquisitionChannel) ? (row.origin_channel as AcquisitionChannel) : "unknown";
}

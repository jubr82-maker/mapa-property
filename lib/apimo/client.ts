// Sprint Apimo Lot A — Client HTTP Apimo (en veille).
//
// MODE NO-OP STRICT : tant que APIMO_PROVIDER_ID, APIMO_TOKEN ou
// APIMO_AGENCY_ID sont absents de l'env, isApimoConfigured() retourne
// false. Les appelants doivent verifier ce flag AVANT d'appeler
// apimoFetch — sinon apimoFetch throw une erreur explicite (defense en
// profondeur, ne doit jamais arriver en mode no-op correct).
//
// Doc officielle :
//   Base       : https://api.apimo.pro (configurable via APIMO_API_BASE)
//   Auth       : Basic Auth provider_id:token (header Authorization)
//   Properties : GET  /agencies/{agency_id}/properties
//   Leads      : POST /agencies/{agency_id}/leads
//   Catalogs   : GET  /catalogs/{name}  (types, categories, energy, etc.)
//
// Aucun appel reseau n'est emis depuis ce fichier — seuls les helpers
// sont exposes. Les lots B/C/D exploiteront apimoFetch.

const DEFAULT_API_BASE = "https://api.apimo.pro";

/** True si les 3 variables d'env Apimo sont presentes (non-vides). */
export function isApimoConfigured(): boolean {
  return Boolean(
    process.env.APIMO_PROVIDER_ID?.trim() &&
      process.env.APIMO_TOKEN?.trim() &&
      process.env.APIMO_AGENCY_ID?.trim(),
  );
}

/** Lit APIMO_AGENCY_ID. Throw si absent — appeler isApimoConfigured() avant. */
export function getApimoAgencyId(): string {
  const id = process.env.APIMO_AGENCY_ID?.trim();
  if (!id) {
    throw new Error("[apimo/client] APIMO_AGENCY_ID manquant (no-op attendu).");
  }
  return id;
}

/** Encode l'en-tete Basic Auth a partir des creds env. */
function buildBasicAuth(): string {
  const providerId = process.env.APIMO_PROVIDER_ID?.trim();
  const token = process.env.APIMO_TOKEN?.trim();
  if (!providerId || !token) {
    throw new Error("[apimo/client] APIMO_PROVIDER_ID/APIMO_TOKEN manquant.");
  }
  const credentials = `${providerId}:${token}`;
  // base64 cote Node (utilise Buffer disponible en runtime Edge + Node).
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(credentials, "utf-8").toString("base64")
      : btoa(credentials);
  return `Basic ${b64}`;
}

export interface ApimoFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Wrapper fetch Apimo avec Basic Auth + gestion d'erreurs structuree.
 *
 * - Throw immediatement si isApimoConfigured() === false (defense en
 *   profondeur ; ne doit jamais arriver en mode no-op correct).
 * - Erreurs HTTP (401/403/404/422/500…) capturees, loggees, retournees
 *   dans le ApimoFetchResult sans crasher l'appelant.
 * - Erreurs reseau (fetch reject) : idem, retour { ok:false, status:0 }.
 */
export async function apimoFetch<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {},
): Promise<ApimoFetchResult<T>> {
  if (!isApimoConfigured()) {
    throw new Error(
      "[apimo/client] Appel apimoFetch sans config (verifier isApimoConfigured avant).",
    );
  }
  const base = process.env.APIMO_API_BASE?.trim() || DEFAULT_API_BASE;
  // Construit l'URL avec query params optionnels (skip undefined).
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: buildBasicAuth(),
    Accept: "application/json",
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url.toString(), { method, headers, body });
    const status = res.status;
    let data: T | null = null;
    let errorMsg: string | undefined;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // Reponse non-JSON : on garde en raw dans error pour log.
        errorMsg = `non-json response: ${text.slice(0, 200)}`;
      }
    }
    if (!res.ok) {
      console.error(
        `[apimo/client] HTTP ${status} ${method} ${path}`,
        errorMsg ?? (data ? JSON.stringify(data).slice(0, 200) : ""),
      );
      return { ok: false, status, data, error: errorMsg ?? `http_${status}` };
    }
    return { ok: true, status, data };
  } catch (e) {
    console.error(
      `[apimo/client] network error ${method} ${path}`,
      (e as Error).message,
    );
    return { ok: false, status: 0, data: null, error: (e as Error).message };
  }
}

// ============================================================================
// Types Apimo — formes souples (beaucoup d'optionnels) car la doc n'est pas
// stricte sur la presence des champs. On validera sur les vraies donnees.
// ============================================================================

export interface ApimoCatalogRef {
  id?: number;
  name?: string;
  value?: string | number;
}

export interface ApimoAddress {
  country?: string;
  city?: string;
  zip_code?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
}

export interface ApimoCity {
  id?: number;
  name?: string;
  zipcode?: string;
}

export interface ApimoComment {
  language?: string; // "fr" | "en" | "de" | ...
  title?: string;
  comment?: string;
  subtitle?: string;
}

export interface ApimoPrice {
  value?: number;
  currency?: string;
  hidden?: boolean;
  fees?: number;
  vat?: number;
}

export interface ApimoArea {
  value?: number;
  unit?: string; // "m2" attendu
  total?: number;
  weighted?: number;
}

export interface ApimoEnergy {
  value?: string; // "A".."I"
  rating?: number;
  ges?: string;
  thermal?: string;
}

export interface ApimoFloor {
  value?: number;
  name?: string;
  type?: ApimoCatalogRef;
}

export interface ApimoPicture {
  id?: number;
  url?: string;
  url_large?: string;
  url_medium?: string;
  url_small?: string;
  rank?: number;
  width?: number;
  height?: number;
}

export interface ApimoPlot {
  net_floor?: number;
  gross_floor?: number;
  area?: ApimoArea;
}

export interface ApimoStatus {
  id?: number;
  name?: string;
  active?: boolean;
}

/** Bien immobilier Apimo (forme partielle, champs optionnels par defaut). */
export interface ApimoProperty {
  id: number;
  reference?: string;
  category?: ApimoCatalogRef; // 1=Vente, 2=Location
  type?: ApimoCatalogRef; // 1=Appartement, 2=Maison, etc.
  subtype?: ApimoCatalogRef;
  address?: ApimoAddress;
  city?: ApimoCity;
  district?: ApimoCatalogRef;
  comments?: ApimoComment[];
  price?: ApimoPrice;
  area?: ApimoArea;
  area_total?: ApimoArea;
  area_land?: ApimoArea;
  area_terrace?: ApimoArea;
  area_usable?: ApimoArea;
  plot?: ApimoPlot;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkings?: number;
  year?: number;
  energy?: ApimoEnergy;
  floor?: ApimoFloor;
  pictures?: ApimoPicture[];
  status?: ApimoStatus;
  step?: ApimoCatalogRef;
  created_at?: string;
  updated_at?: string;
}

/** Payload POST /leads (push d'un contact site vers Apimo). */
export interface ApimoLeadPayload {
  /** Reference du bien Apimo concerne (apimo_id chez nous). */
  property_id?: number;
  /** Reference textuelle de l'agence (optionnel). */
  reference?: string;
  lastname?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  message?: string;
  language?: string; // "fr" | "en" | "de"
  /** ISO 8601 — Apimo accepte aussi sans, mais on l'envoie par hygiene. */
  created_at?: string;
}

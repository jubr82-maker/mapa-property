// Chargement admin d'une recherche (oct. 2026) : champs publics, donnees
// du client et modeles des 3 langues. Admin seulement (pages gardees).
import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { loadListingModels } from "@/lib/listing/model-server";
import { isSearchType, type SearchStatus } from "@/lib/searches/search";
import type { SearchFormInitial } from "@/components/admin/SearchForm";

const EMPTY_TEXT = { fr: "", en: "", de: "" };

export async function searchModels() {
  const m = await loadListingModels();
  return {
    fr: { templates: m.fr.search.templates, vocab: m.fr.search.vocab },
    en: { templates: m.en.search.templates, vocab: m.en.search.vocab },
    de: { templates: m.de.search.templates, vocab: m.de.search.vocab },
  };
}

export function emptySearch(): SearchFormInitial {
  return {
    id: null,
    reference: null,
    status: "draft",
    transaction: "sale",
    property_type: "maison",
    communes: [],
    bedrooms_min: null,
    surface_min: null,
    land_min: null,
    delay: null,
    criteria: { ...EMPTY_TEXT },
    titles: { ...EMPTY_TEXT },
    descriptions: { ...EMPTY_TEXT },
    auto: {},
    consent: false,
    client: { name: "", email: "", phone: "", budget_exact: null, current_address: "", notes: "", source_mandate_id: null },
  };
}

type MandateRow = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_city: string | null;
  client_country: string | null;
  property_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  min_bedrooms?: number | null;
  min_surface?: number | null;
  notes: string | null;
  type_transaction: string;
};

/** Recherche pre-remplie depuis un mandat de recherche (table mandats). */
export async function searchFromMandate(mandateId: string): Promise<{ initial: SearchFormInitial; label: string | null }> {
  const supabase = await createSupabaseServerClient();
  const base = "id, client_name, client_email, client_phone, client_city, client_country, property_type, budget_min, budget_max, zones, notes, type_transaction";
  let res = await supabase.from("mandats").select(`${base}, min_bedrooms, min_surface`).eq("id", mandateId).maybeSingle();
  if (res.error) res = await supabase.from("mandats").select(base).eq("id", mandateId).maybeSingle();
  const m = res.data as MandateRow | null;
  const init = emptySearch();
  if (!m) return { initial: init, label: null };
  const type = (m.property_type ?? "").trim().toLowerCase();
  return {
    initial: {
      ...init,
      property_type: isSearchType(type) ? type : init.property_type,
      communes: (m.zones ?? []).filter(Boolean),
      bedrooms_min: m.min_bedrooms ?? null,
      surface_min: m.min_surface ?? null,
      client: {
        name: m.client_name ?? "",
        email: m.client_email ?? "",
        phone: m.client_phone ?? "",
        budget_exact: m.budget_max ?? m.budget_min ?? null,
        current_address: [m.client_city, m.client_country].filter(Boolean).join(", "),
        notes: m.notes ?? "",
        source_mandate_id: m.id,
      },
    },
    label: m.client_name ?? m.id,
  };
}

export async function loadSearch(id: string): Promise<SearchFormInitial | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("property_searches").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const { data: priv } = await supabase.from("property_search_private").select("*").eq("search_id", id).maybeSingle();
  const p = (priv ?? {}) as Record<string, unknown>;
  const txt = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const sd = (r.search_data && typeof r.search_data === "object" ? r.search_data : {}) as { auto?: Record<string, boolean> };
  const transaction = r.transaction === "rent" ? "rent" : "sale";
  return {
    id: String(r.id),
    reference: txt("reference"),
    status: (r.status as SearchStatus) ?? "draft",
    transaction,
    property_type: txt("property_type"),
    communes: Array.isArray(r.communes) ? (r.communes as string[]) : [],
    bedrooms_min: (r.bedrooms_min as number | null) ?? null,
    surface_min: (r.surface_min as number | null) ?? null,
    land_min: (r.land_min as number | null) ?? null,
    delay: (r.delay as string | null) ?? null,
    criteria: { fr: txt("criteria_fr"), en: txt("criteria_en"), de: txt("criteria_de") },
    titles: { fr: txt("title_fr"), en: txt("title_en"), de: txt("title_de") },
    descriptions: { fr: txt("description_fr"), en: txt("description_en"), de: txt("description_de") },
    auto: sd.auto ?? {},
    consent: r.consent_anonymous === true,
    client: {
      name: typeof p.client_name === "string" ? p.client_name : "",
      email: typeof p.client_email === "string" ? p.client_email : "",
      phone: typeof p.client_phone === "string" ? p.client_phone : "",
      budget_exact: typeof p.budget_exact === "number" ? p.budget_exact : null,
      current_address: typeof p.current_address === "string" ? p.current_address : "",
      notes: typeof p.notes === "string" ? p.notes : "",
      source_mandate_id: typeof p.source_mandate_id === "string" ? p.source_mandate_id : null,
    },
  };
}

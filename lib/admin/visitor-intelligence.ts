import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";

// ============================================================================
// MAPA Property — Tableau de bord "Intelligence visiteurs" (admin)
// Lecture seule : exploite leads, tracking_events, property_views déjà en
// base. Indépendant de GA4 (pas encore de trafic réel côté GA4).
//
// Clés de référence utilisées dans le code existant (vérifié par lecture,
// pas d'hypothèse) :
//   - leads.property_ref = SLUG pour les biens classiques (ContactForm),
//     UUID properties_offmarket.id pour les demandes NDA (NDAForm, via
//     /api/nda-request, type='offmarket_request'). Les deux formats
//     coexistent dans la même colonne texte.
//   - tracking_events.event_data->>'property_id' = SLUG pour un
//     contact_reveal sur une fiche classique, UUID pour off-market —
//     même logique, cohérente avec ContactReveal (propertyId={slug} vs
//     {id} selon la fiche).
//   - property_views.property_id = properties.id (UUID) — UNIQUEMENT les
//     biens classiques : PropertyViewTracker n'est monté que sur
//     /biens/[slug], jamais sur /off-market/[id]. L'off-market n'a donc
//     aucun compteur de vues aujourd'hui (limite documentée, pas un bug
//     de cette lecture).
//   - offmarket_requests (table dédiée) : AUCUN endpoint public actif ne
//     l'alimente (/api/offmarket-request et /api/nda-offmarket existent
//     mais ne sont appelés par aucun composant). Le vrai flux NDA passe
//     par /api/nda-request → table leads. D'où l'usage de
//     leads.type='offmarket_request' comme source pour le widget NDA,
//     PAS offmarket_requests (vraisemblablement vide/obsolète).
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WINDOW_LEADS_DAYS = 365;
const WINDOW_EVENTS_DAYS = 90;
const WINDOW_VIEWS_DAYS = 90;
const RECENT_DAYS = 30;

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "PGRST205";
}

type LeadRow = {
  id: string;
  created_at: string;
  type: string | null;
  property_ref: string | null;
};

type TrackingRow = {
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

type ViewRow = { property_id: string; viewed_at: string };

type PropertyMini = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  transaction: string | null;
};

type OffmarketMini = { id: string; reference: string | null; title: string | null };

export type ResolvedProperty = {
  id: string;
  label: string;
  href: string;
  kind: "classic" | "offmarket";
  badge: string;
};

export type RankedItem = {
  id: string;
  label: string;
  href: string;
  badge: string;
  count: number;
};

export type ViewedConversionItem = {
  id: string;
  label: string;
  href: string;
  badge: string;
  views: number;
  contacts: number;
  ratePct: number;
};

type Bucket = "contact" | "estimation" | "offmarket" | "simulateur" | "telephone";

export const BUCKET_LABELS: Record<Bucket, string> = {
  contact: "Contact / demande",
  estimation: "Estimation",
  offmarket: "Off-market (NDA)",
  simulateur: "Simulateur emprunt",
  telephone: "Téléphone / email",
};

export type RecentAction = {
  bucket: Bucket;
  label: string;
  propertyLabel: string | null;
  href: string | null;
  createdAt: string;
};

function bucketOf(e: Pick<TrackingRow, "event_type" | "event_data">): Bucket | null {
  switch (e.event_type) {
    case "estimation_compute":
      return "estimation";
    case "emprunt_simulate":
      return "simulateur";
    case "contact_reveal":
      return "telephone";
    case "form_submit": {
      const form =
        e.event_data && typeof e.event_data.form === "string" ? e.event_data.form : "";
      return form === "nda_request" ? "offmarket" : "contact";
    }
    default:
      return null;
  }
}

export type BudgetBand = "<500k" | "500k-1M" | "1M-2M" | ">2M";

export const BUDGET_BAND_LABELS: Record<BudgetBand, string> = {
  "<500k": "Moins de 500 000 €",
  "500k-1M": "500 000 € – 1 M€",
  "1M-2M": "1 M€ – 2 M€",
  ">2M": "Plus de 2 M€",
};

function budgetBandOf(value: number): BudgetBand {
  if (value < 500_000) return "<500k";
  if (value < 1_000_000) return "500k-1M";
  if (value < 2_000_000) return "1M-2M";
  return ">2M";
}

export interface SearchDemand {
  totalSearches: number;
  topTypes: { key: string; value: number }[];
  topCities: { key: string; value: number }[];
  transactionSplit: { sale: number; rent: number };
  budgetBands: { key: BudgetBand; value: number }[];
  dailySeries: { date: string; value: number }[];
}

export interface VisitorIntelligence {
  available: {
    leads: boolean;
    events: boolean;
    views: boolean;
  };
  topDemand: RankedItem[];
  viewedNotContacted: ViewedConversionItem[];
  conversion: {
    globalViewed: number;
    globalContacted: number;
    globalRatePct: number | null;
    topProperties: ViewedConversionItem[];
  };
  volumeByType: {
    dailySeries: { date: string; value: number }[];
    counts30d: Record<Bucket, number>;
    counts90d: Record<Bucket, number>;
  };
  recentFeed: RecentAction[];
  ndaByProperty: {
    top: RankedItem[];
    total: number;
  };
  searchDemand: SearchDemand;
}

export async function loadVisitorIntelligence(): Promise<VisitorIntelligence> {
  await requireAdminPage();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const since = (days: number) => new Date(now.getTime() - days * 86400 * 1000).toISOString();

  // leads via service_role : table sans policy SELECT confirmée pour le
  // rôle authenticated (cf. app/admin/leads/page.tsx). tracking_events et
  // property_views restent sur le client anon+session (fonctionnels,
  // aucune preuve d'un problème équivalent).
  const [leadsR, eventsR, viewsR] = await Promise.all([
    supabaseService()
      .from("leads")
      .select("id,created_at,type,property_ref")
      .gte("created_at", since(WINDOW_LEADS_DAYS))
      .not("property_ref", "is", null)
      .limit(5000),
    supabase
      .from("tracking_events")
      .select("event_type,event_data,created_at")
      .in("event_type", [
        "contact_reveal",
        "form_submit",
        "estimation_compute",
        "emprunt_simulate",
        "search_query",
      ])
      .gte("created_at", since(WINDOW_EVENTS_DAYS))
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("property_views")
      .select("property_id,viewed_at")
      .gte("viewed_at", since(WINDOW_VIEWS_DAYS))
      .limit(50_000),
  ]);

  const leadsAvailable = !isMissingTable(leadsR.error);
  const eventsAvailable = !isMissingTable(eventsR.error);
  const viewsAvailable = !isMissingTable(viewsR.error);

  const leadsRows = leadsAvailable ? ((leadsR.data ?? []) as LeadRow[]) : [];
  const eventsRows = eventsAvailable ? ((eventsR.data ?? []) as TrackingRow[]) : [];
  const viewsRows = viewsAvailable ? ((viewsR.data ?? []) as ViewRow[]) : [];

  // --- Comptages bruts par référence (slug classique OU uuid off-market) ---
  const leadCountByRef = new Map<string, number>();
  const ndaCountByRef = new Map<string, number>();
  for (const l of leadsRows) {
    if (!l.property_ref) continue;
    leadCountByRef.set(l.property_ref, (leadCountByRef.get(l.property_ref) ?? 0) + 1);
    if (l.type === "offmarket_request") {
      ndaCountByRef.set(l.property_ref, (ndaCountByRef.get(l.property_ref) ?? 0) + 1);
    }
  }

  const revealCountByRef = new Map<string, number>();
  for (const e of eventsRows) {
    if (e.event_type !== "contact_reveal") continue;
    const pid = e.event_data && typeof e.event_data.property_id === "string"
      ? (e.event_data.property_id as string)
      : null;
    if (!pid) continue;
    revealCountByRef.set(pid, (revealCountByRef.get(pid) ?? 0) + 1);
  }

  const viewCountById = new Map<string, number>();
  for (const v of viewsRows) {
    viewCountById.set(v.property_id, (viewCountById.get(v.property_id) ?? 0) + 1);
  }

  // --- Résolution des références vers de vrais biens (titre + lien) -------
  const allRefs = new Set<string>([
    ...leadCountByRef.keys(),
    ...revealCountByRef.keys(),
    ...viewCountById.keys(),
  ]);
  const refsArr = Array.from(allRefs);
  const uuidRefs = refsArr.filter((r) => UUID_RE.test(r));

  const [byIdR, bySlugR, offR] = await Promise.all([
    uuidRefs.length
      ? supabase
          .from("properties")
          .select("id,slug,title_fr,title_en,title_de,transaction")
          .in("id", uuidRefs)
      : Promise.resolve({ data: [] as PropertyMini[] }),
    refsArr.length
      ? supabase
          .from("properties")
          .select("id,slug,title_fr,title_en,title_de,transaction")
          .in("slug", refsArr)
      : Promise.resolve({ data: [] as PropertyMini[] }),
    uuidRefs.length
      ? supabase.from("properties_offmarket").select("id,reference,title").in("id", uuidRefs)
      : Promise.resolve({ data: [] as OffmarketMini[] }),
  ]);

  const resolved = new Map<string, ResolvedProperty>();
  for (const p of [
    ...((byIdR.data ?? []) as PropertyMini[]),
    ...((bySlugR.data ?? []) as PropertyMini[]),
  ]) {
    const label = p.title_fr || p.title_en || p.title_de || p.slug || p.id.slice(0, 8);
    const badge = p.transaction === "rent" ? "Location" : "Vente";
    const entry: ResolvedProperty = {
      id: p.id,
      label,
      href: `/fr/biens/${p.slug ?? p.id}`,
      kind: "classic",
      badge,
    };
    resolved.set(p.id, entry);
    if (p.slug) resolved.set(p.slug, entry);
  }
  for (const o of (offR.data ?? []) as OffmarketMini[]) {
    resolved.set(o.id, {
      id: o.id,
      label: `${o.reference ?? "OM"} · ${o.title ?? "Off-Market"}`,
      href: `/fr/off-market/${o.id}`,
      kind: "offmarket",
      badge: "Off-Market",
    });
  }

  // --- Contacts combinés (leads + révélations), normalisés par id canonique
  const contactsById = new Map<string, number>();
  for (const [ref, count] of leadCountByRef) {
    const info = resolved.get(ref);
    if (!info) continue;
    contactsById.set(info.id, (contactsById.get(info.id) ?? 0) + count);
  }
  for (const [ref, count] of revealCountByRef) {
    const info = resolved.get(ref);
    if (!info) continue;
    contactsById.set(info.id, (contactsById.get(info.id) ?? 0) + count);
  }

  // --- Widget 1 : biens qui génèrent le plus de demandes -------------------
  const topDemand: RankedItem[] = Array.from(contactsById.entries())
    .map(([id, count]) => {
      const info = resolved.get(id);
      return info ? { id, label: info.label, href: info.href, badge: info.badge, count } : null;
    })
    .filter((x): x is RankedItem => x !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // --- Widget 2 : vus mais jamais contactés (biens classiques uniquement,
  //     l'off-market n'a pas de compteur de vues) --------------------------
  const viewedNotContacted: ViewedConversionItem[] = Array.from(viewCountById.entries())
    .filter(([id]) => !contactsById.has(id))
    .map(([id, views]) => {
      const info = resolved.get(id);
      return info
        ? { id, label: info.label, href: info.href, badge: info.badge, views, contacts: 0, ratePct: 0 }
        : null;
    })
    .filter((x): x is ViewedConversionItem => x !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // --- Widget 3 : conversion vue -> contact ---------------------------------
  const topConversionProperties: ViewedConversionItem[] = Array.from(viewCountById.entries())
    .map(([id, views]) => {
      const info = resolved.get(id);
      if (!info) return null;
      const contacts = contactsById.get(id) ?? 0;
      const ratePct = views > 0 ? Math.round((contacts / views) * 1000) / 10 : 0;
      return { id, label: info.label, href: info.href, badge: info.badge, views, contacts, ratePct };
    })
    .filter((x): x is ViewedConversionItem => x !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const globalViewed = viewCountById.size;
  const globalContacted = Array.from(viewCountById.keys()).filter((id) => contactsById.has(id)).length;
  const globalRatePct = globalViewed > 0 ? Math.round((globalContacted / globalViewed) * 1000) / 10 : null;

  // --- Widget 4 : volume d'actions par type, 30j + série journalière -------
  const dailyTotals: Record<string, number> = {};
  for (let i = RECENT_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400 * 1000);
    dailyTotals[d.toISOString().slice(0, 10)] = 0;
  }
  const emptyBuckets = (): Record<Bucket, number> => ({
    contact: 0,
    estimation: 0,
    offmarket: 0,
    simulateur: 0,
    telephone: 0,
  });
  const counts30d = emptyBuckets();
  const counts90d = emptyBuckets();
  for (const e of eventsRows) {
    const b = bucketOf(e);
    if (!b) continue;
    counts90d[b] += 1;
    const day = e.created_at.slice(0, 10);
    if (day in dailyTotals) {
      dailyTotals[day] += 1;
      counts30d[b] += 1;
    }
  }
  const dailySeries = Object.entries(dailyTotals).map(([date, value]) => ({ date, value }));

  // --- Widget 5 : flux chronologique des dernières actions "lead" ----------
  const recentFeed: RecentAction[] = eventsRows
    .map((e) => {
      const b = bucketOf(e);
      if (!b) return null;
      const data = e.event_data ?? {};
      const pid = typeof data.property_id === "string" ? (data.property_id as string) : null;
      const info = pid ? resolved.get(pid) : undefined;
      const rawTitle =
        typeof data.property_title === "string" ? (data.property_title as string) : null;
      return {
        bucket: b,
        label: BUCKET_LABELS[b],
        propertyLabel: info?.label ?? rawTitle,
        href: info?.href ?? null,
        createdAt: e.created_at,
      };
    })
    .filter((x): x is RecentAction => x !== null)
    .slice(0, 30);

  // --- Widget 6 : demandes off-market (NDA) par bien ------------------------
  const ndaTop: RankedItem[] = Array.from(ndaCountByRef.entries())
    .map(([ref, count]) => {
      const info = resolved.get(ref);
      return info ? { id: info.id, label: info.label, href: info.href, badge: info.badge, count } : null;
    })
    .filter((x): x is RankedItem => x !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const ndaTotal = Array.from(ndaCountByRef.values()).reduce((a, b) => a + b, 0);

  // --- Widget 7 : ce que cherchent les visiteurs (search_query) -----------
  const searchRows = eventsRows.filter((e) => e.event_type === "search_query");

  const typeCounts: Record<string, number> = {};
  const cityCounts: Record<string, { label: string; count: number }> = {};
  const transactionSplit = { sale: 0, rent: 0 };
  const budgetCounts: Record<BudgetBand, number> = { "<500k": 0, "500k-1M": 0, "1M-2M": 0, ">2M": 0 };
  const searchDailyTotals: Record<string, number> = {};
  for (let i = RECENT_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400 * 1000);
    searchDailyTotals[d.toISOString().slice(0, 10)] = 0;
  }

  for (const e of searchRows) {
    const data = e.event_data ?? {};

    const types = Array.isArray(data.types) ? (data.types as unknown[]) : [];
    for (const t of types) {
      if (typeof t !== "string" || !t) continue;
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }

    if (typeof data.city === "string" && data.city.trim()) {
      const label = data.city.trim();
      const key = label.toLowerCase();
      cityCounts[key] = { label, count: (cityCounts[key]?.count ?? 0) + 1 };
    }

    if (data.transaction === "sale") transactionSplit.sale += 1;
    else if (data.transaction === "rent") transactionSplit.rent += 1;

    if (typeof data.budget_max === "number" && data.budget_max > 0) {
      budgetCounts[budgetBandOf(data.budget_max)] += 1;
    }

    const day = e.created_at.slice(0, 10);
    if (day in searchDailyTotals) searchDailyTotals[day] += 1;
  }

  const topTypes = Object.entries(typeCounts)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const topCities = Object.values(cityCounts)
    .map(({ label, count }) => ({ key: label, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const budgetBands = (Object.keys(BUDGET_BAND_LABELS) as BudgetBand[]).map((key) => ({
    key,
    value: budgetCounts[key],
  }));
  const searchDailySeries = Object.entries(searchDailyTotals).map(([date, value]) => ({
    date,
    value,
  }));

  return {
    available: { leads: leadsAvailable, events: eventsAvailable, views: viewsAvailable },
    topDemand,
    viewedNotContacted,
    conversion: {
      globalViewed,
      globalContacted,
      globalRatePct,
      topProperties: topConversionProperties,
    },
    volumeByType: { dailySeries, counts30d, counts90d },
    recentFeed,
    ndaByProperty: { top: ndaTop, total: ndaTotal },
    searchDemand: {
      totalSearches: searchRows.length,
      topTypes,
      topCities,
      transactionSplit,
      budgetBands,
      dailySeries: searchDailySeries,
    },
  };
}

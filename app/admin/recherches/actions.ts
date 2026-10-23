"use server";

// Recherches en cours, admin (oct. 2026) : creation (a la main ou depuis
// un mandat de recherche), modification, publication, pause, statut
// "trouvee", retrait, suppression. Admin de la liste en aal2 ; ecriture
// RLS is_mapa_admin (SQL 18). Les champs du client (nom, contact, budget
// exact, adresse actuelle) vont dans property_search_private et ne sont
// jamais lus par le site. Publication impossible sans l'accord du client.
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ActionFailure, dbFailure, runAction, sessionFailure, type ActionResult } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { logAdminAction } from "@/lib/pilotage/audit";
import { checkFields, describeIssues } from "@/lib/listing/writing-check";
import { htmlToText } from "@/lib/listing/template-engine";
import type { ListingLang } from "@/lib/listing/listing-data";
import { SEARCHES_TAG, searchCitySlugs, searchesCityTag } from "@/lib/searches/data";
import {
  PUBLIC_SEARCH_STATUSES,
  SEARCH_DELAYS,
  SEARCH_REF_PLACEHOLDER,
  SEARCH_STATUSES,
  isSearchType,
  nextSearchReference,
  publicBudgetRange,
  type SearchStatus,
} from "@/lib/searches/search";

const tS = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_searches" });
const tL = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_listing" });

export type SearchFormPayload = {
  transaction: string;
  property_type: string;
  communes: string[];
  bedrooms_min: number | null;
  surface_min: number | null;
  land_min: number | null;
  delay: string | null;
  criteria: Record<ListingLang, string>;
  titles: Record<ListingLang, string>;
  descriptions: Record<ListingLang, string>;
  auto: Record<string, boolean>;
  consent: boolean;
  client: {
    name: string;
    email: string;
    phone: string;
    budget_exact: number | null;
    current_address: string;
    notes: string;
    source_mandate_id: string | null;
  };
};

export type SaveSearchResult = { ok: true; id: string; reference: string } | { ok: false; error: string };

const LANGS: ListingLang[] = ["fr", "en", "de"];
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "");
const intOrNull = (v: unknown, max: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null;
};

/**
 * Pages publiques d'une recherche (oct. 2026, quotas Vercel) : liste et page
 * de la recherche, et seulement les communes visees avant et apres la
 * modification (pages de villes et fiches de leurs biens, par etiquette).
 */
function revalidatePublic(reference?: string, ...communeLists: unknown[]) {
  revalidateTag(SEARCHES_TAG, { expire: 0 });
  for (const slug of new Set(communeLists.flatMap((c) => searchCitySlugs(c)))) revalidateTag(searchesCityTag(slug), { expire: 0 });
  for (const l of ["fr", "en", "de"]) {
    revalidatePath(`/${l}/recherches`);
    if (reference) revalidatePath(`/${l}/recherches/${reference}`);
  }
  revalidatePath("/admin/recherches");
}

export async function saveSearch(id: string | null, input: SearchFormPayload): Promise<SaveSearchResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const { supabase, user } = admin;
  const t = await tS();
  try {
    const transaction = input?.transaction === "rent" ? "rent" : "sale";
    if (!isSearchType(input?.property_type)) return { ok: false, error: t("err_type") };
    const communes = (Array.isArray(input.communes) ? input.communes : []).map((c) => str(c, 80)).filter(Boolean).slice(0, 12);
    if (!communes.length) return { ok: false, error: t("err_communes") };
    const delay = input.delay && (SEARCH_DELAYS as readonly string[]).includes(input.delay) ? input.delay : null;
    const budgetExact = intOrNull(input.client?.budget_exact, 100_000_000);
    const range = publicBudgetRange(budgetExact, transaction);

    const row: Record<string, unknown> = {
      transaction,
      property_type: input.property_type,
      communes,
      budget_min: range?.min ?? null,
      budget_max: range?.max ?? null,
      bedrooms_min: intOrNull(input.bedrooms_min, 50),
      surface_min: intOrNull(input.surface_min, 100000),
      land_min: intOrNull(input.land_min, 10_000_000),
      delay,
      consent_anonymous: input.consent === true,
      search_data: { v: 1, auto: Object.fromEntries(Object.entries(input.auto ?? {}).filter(([, v]) => typeof v === "boolean")) },
      updated_at: new Date().toISOString(),
    };
    for (const l of LANGS) {
      row[`criteria_${l}`] = str(input.criteria?.[l], 2000) || null;
      row[`title_${l}`] = str(input.titles?.[l], 300) || null;
      row[`description_${l}`] = str(input.descriptions?.[l], 20000) || null;
    }

    // Controle de redaction : memes regles que les annonces.
    const issues = checkFields(
      LANGS.flatMap((l) => [
        { field: `title_${l}`, lang: l, title: true, text: String(row[`title_${l}`] ?? "") },
        { field: `description_${l}`, lang: l, text: htmlToText(String(row[`description_${l}`] ?? "")) },
        { field: `criteria_${l}`, lang: l, text: String(row[`criteria_${l}`] ?? "") },
      ]),
      communes,
    );
    if (issues.length) {
      const tl = await tL();
      return { ok: false, error: [tl("chk_blocked"), ...describeIssues(issues, (k, v) => tl(k, v), (f) => t(`field_${f}`))].join("\n") };
    }

    let searchId = id;
    let reference: string;
    let previousCommunes: unknown = null;
    if (searchId) {
      const { data: cur, error: curErr } = await supabase.from("property_searches").select("reference, status, communes").eq("id", searchId).maybeSingle();
      if (curErr) throw await dbFailure(curErr, "saveSearch:read");
      if (!cur) return { ok: false, error: t("err_not_found") };
      reference = (cur as { reference: string }).reference;
      previousCommunes = (cur as { communes?: unknown }).communes;
      // Accord retire : une recherche visible repasse en pause.
      if (!row.consent_anonymous && (PUBLIC_SEARCH_STATUSES as readonly string[]).includes((cur as { status: string }).status)) row.status = "paused";
      if (row.consent_anonymous) row.consent_at = new Date().toISOString();
      const { error } = await supabase.from("property_searches").update(row).eq("id", searchId);
      if (error) throw await dbFailure(error, "saveSearch:update");
    } else {
      const year = new Date().getFullYear();
      const { data: refs } = await supabase.from("property_searches").select("reference").like("reference", `R-${year}-%`);
      reference = nextSearchReference(year, ((refs as { reference: string }[] | null) ?? []).map((r) => r.reference));
      // Textes ecrits avant la creation : reference provisoire remplacee.
      for (const l of LANGS) {
        for (const k of [`title_${l}`, `description_${l}`]) {
          if (typeof row[k] === "string") row[k] = (row[k] as string).split(SEARCH_REF_PLACEHOLDER).join(reference);
        }
      }
      const { data: created, error } = await supabase
        .from("property_searches")
        .insert({ ...row, reference, status: "draft", created_by: user.email ?? null, consent_at: row.consent_anonymous ? new Date().toISOString() : null })
        .select("id")
        .single();
      if (error) throw await dbFailure(error, "saveSearch:insert");
      searchId = (created as { id: string }).id;
    }

    const c = input.client ?? ({} as SearchFormPayload["client"]);
    const { error: privErr } = await supabase.from("property_search_private").upsert(
      {
        search_id: searchId,
        client_name: str(c.name, 200) || null,
        client_email: str(c.email, 200) || null,
        client_phone: str(c.phone, 60) || null,
        budget_exact: budgetExact,
        current_address: str(c.current_address, 300) || null,
        notes: str(c.notes, 5000) || null,
        source_mandate_id: str(c.source_mandate_id, 60) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "search_id" },
    );
    if (privErr) throw await dbFailure(privErr, "saveSearch:private");

    await logAdminAction({ actorEmail: user.email, action: id ? "property_search_updated" : "property_search_created", targetTable: "property_searches", targetId: searchId, diff: { reference } });
    revalidatePublic(reference, previousCommunes, communes);
    return { ok: true, id: searchId!, reference };
  } catch (e) {
    if (e instanceof ActionFailure) return { ok: false, error: e.message };
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[admin] saveSearch", detail);
    const tn = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
    return { ok: false, error: tn("err_unexpected", { detail: detail.slice(0, 200) || "?" }) };
  }
}

/** Transitions permises : brouillon, publiee, en pause, trouvee, retiree. */
const TRANSITIONS: Record<SearchStatus, SearchStatus[]> = {
  draft: ["published"],
  published: ["paused", "found", "withdrawn"],
  paused: ["published", "found", "withdrawn"],
  found: ["withdrawn", "published"],
  withdrawn: ["published"],
};

export async function setSearchStatus(id: string, status: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  return runAction(async () => {
    const t = await tS();
    if (!(SEARCH_STATUSES as readonly string[]).includes(status)) throw new ActionFailure(t("err_status"));
    const { data: cur, error } = await admin.supabase.from("property_searches").select("reference, status, consent_anonymous, communes").eq("id", id).maybeSingle();
    if (error) throw await dbFailure(error, "setSearchStatus:read");
    if (!cur) throw new ActionFailure(t("err_not_found"));
    const row = cur as { reference: string; status: SearchStatus; consent_anonymous: boolean };
    const next = status as SearchStatus;
    if (!TRANSITIONS[row.status]?.includes(next)) throw new ActionFailure(t("err_transition", { from: t(`status_${row.status}`), to: t(`status_${next}`) }));
    // Publication impossible sans l'accord du client (aussi garanti en base).
    if ((PUBLIC_SEARCH_STATUSES as readonly string[]).includes(next) && !row.consent_anonymous) throw new ActionFailure(t("err_consent"));
    const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
    if (next === "published") patch.published_at = new Date().toISOString();
    if (next === "found") patch.found_at = new Date().toISOString();
    const { error: upErr } = await admin.supabase.from("property_searches").update(patch).eq("id", id);
    if (upErr) throw await dbFailure(upErr, "setSearchStatus");
    await logAdminAction({ actorEmail: admin.user.email, action: "property_search_status", targetTable: "property_searches", targetId: id, diff: { reference: row.reference, from: row.status, to: next } });
    revalidatePublic(row.reference, (cur as { communes?: unknown }).communes);
  });
}

export async function deleteSearch(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  return runAction(async () => {
    const t = await tS();
    const { data: cur } = await admin.supabase.from("property_searches").select("reference, communes").eq("id", id).maybeSingle();
    if (!cur) throw new ActionFailure(t("err_not_found"));
    // property_search_private suit (ON DELETE CASCADE).
    const { error } = await admin.supabase.from("property_searches").delete().eq("id", id);
    if (error) throw await dbFailure(error, "deleteSearch");
    const reference = (cur as { reference: string }).reference;
    await logAdminAction({ actorEmail: admin.user.email, action: "property_search_deleted", targetTable: "property_searches", targetId: id, diff: { reference } });
    revalidatePublic(reference, (cur as { communes?: unknown }).communes);
  });
}

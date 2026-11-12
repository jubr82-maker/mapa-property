"use server";

// Questions frequentes, admin (oct. 2026) : creation, modification,
// suppression, ordre, visibilite. Admin de la liste en aal2 ; ecriture RLS
// is_mapa_admin (SQL 23). Apres chaque ecriture : pages publiques
// concernees revalidees dans les trois langues.
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ActionFailure, dbFailure, sessionFailure } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { logAdminAction } from "@/lib/pilotage/audit";
import { faqTag } from "@/lib/faq/data";
import { ELENA_FAQ_KEY, FAQ_LANGS, faqPagePaths, isFaqPageKey, type FaqLang } from "@/lib/faq/keys";
import { isElenaButtonPath } from "@/lib/elena/button-paths";

export type FaqPayload = {
  page_key: string;
  question: Record<FaqLang, string>;
  answer: Record<FaqLang, string>;
  published: boolean;
  /**
   * Reponses d'Elena (page 'elena', SQL 37) : autres formulations, bouton
   * (liste fermee des chemins du site) et son libelle, source. Ignore pour
   * les autres pages.
   */
  elena?: {
    variants: string[];
    button_path: string | null;
    button_label: Record<FaqLang, string>;
    source: string;
  };
};

export type FaqResult = { ok: true; id: string } | { ok: false; error: string };
export type FaqSimpleResult = { ok: true } | { ok: false; error: string };

const t = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_faq" });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const DASHES = /[–—]/;

/** Pages publiques d'une ou plusieurs page_key, trois langues, et l'admin. */
function revalidateFaqPages(...keys: string[]) {
  // Seulement les pages des page_key concernees (oct. 2026, quotas Vercel).
  for (const k of keys) revalidateTag(faqTag(k), { expire: 0 });
  for (const k of new Set(keys)) {
    for (const p of faqPagePaths(k)) for (const l of ["fr", "en", "de"]) revalidatePath(`/${l}${p}`);
  }
  revalidatePath("/admin/faq");
}

async function failure(e: unknown): Promise<{ ok: false; error: string }> {
  if (e instanceof ActionFailure) return { ok: false, error: e.message };
  const tn = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  const detail = e instanceof Error ? e.message : String(e);
  return { ok: false, error: tn("err_unexpected", { detail: detail.slice(0, 200) || "?" }) };
}

export async function saveFaq(id: string | null, input: FaqPayload): Promise<FaqResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const { supabase, user } = admin;
  const tf = await t();
  try {
    if (!isFaqPageKey(input?.page_key)) return { ok: false, error: tf("err_page") };
    const row: Record<string, unknown> = { page_key: input.page_key, published: input.published === true, updated_at: new Date().toISOString() };
    for (const l of FAQ_LANGS) {
      const q = clean(input.question?.[l], 500);
      const a = clean(input.answer?.[l], 5000);
      const lang = tf(`lang_${l}`);
      if (Boolean(q) !== Boolean(a)) return { ok: false, error: tf("err_pair", { lang }) };
      if (DASHES.test(q) || DASHES.test(a)) return { ok: false, error: tf("err_dash", { lang }) };
      row[`question_${l}`] = q || null;
      row[`answer_${l}`] = a || null;
    }
    if (!row.question_fr) return { ok: false, error: tf("err_fr") };
    if (input.page_key === ELENA_FAQ_KEY) {
      const e = input.elena;
      const variants = (Array.isArray(e?.variants) ? e.variants : []).map((v) => clean(v, 200)).filter(Boolean).slice(0, 60);
      const path = e?.button_path ? String(e.button_path) : null;
      if (path && !isElenaButtonPath(path)) return { ok: false, error: tf("err_button_path") };
      const labels = Object.fromEntries(FAQ_LANGS.map((l) => [l, clean(e?.button_label?.[l], 80)])) as Record<FaqLang, string>;
      if (path && !labels.fr) return { ok: false, error: tf("err_button_label") };
      if ([...variants, ...Object.values(labels)].some((v) => DASHES.test(v))) return { ok: false, error: tf("err_dash", { lang: tf("lang_fr") }) };
      row.variants_fr = variants;
      row.button_path = path;
      for (const l of FAQ_LANGS) row[`button_label_${l}`] = path ? labels[l] || null : null;
      row.source = clean(e?.source, 200) || null;
    }

    let previousKey: string | null = null;
    let faqId = id;
    if (faqId) {
      const { data: cur, error: curErr } = await supabase.from("faqs").select("page_key").eq("id", faqId).maybeSingle();
      if (curErr) throw await dbFailure(curErr, "saveFaq:read");
      if (!cur) return { ok: false, error: tf("err_not_found") };
      previousKey = (cur as { page_key: string }).page_key;
      if (previousKey !== input.page_key) row.position = await nextPosition(supabase, input.page_key);
      const { error } = await supabase.from("faqs").update(row).eq("id", faqId);
      if (error) throw await dbFailure(error, "saveFaq:update");
    } else {
      row.position = await nextPosition(supabase, input.page_key);
      const { data, error } = await supabase.from("faqs").insert(row).select("id").single();
      if (error) throw await dbFailure(error, "saveFaq:insert");
      faqId = (data as { id: string }).id;
    }
    await logAdminAction({ actorEmail: user.email, action: "faq_saved", targetTable: "faqs", targetId: faqId, diff: { page_key: input.page_key, published: row.published } });
    revalidateFaqPages(input.page_key, ...(previousKey ? [previousKey] : []));
    return { ok: true, id: faqId as string };
  } catch (e) {
    return failure(e);
  }
}

async function nextPosition(supabase: SupabaseClient, pageKey: string): Promise<number> {
  const { data, error } = await supabase.from("faqs").select("position").eq("page_key", pageKey).order("position", { ascending: false }).limit(1);
  if (error) throw await dbFailure(error, "saveFaq:position");
  const last = (data as { position: number }[] | null)?.[0]?.position ?? 0;
  return last + 1;
}

export async function deleteFaq(id: string): Promise<FaqSimpleResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const { supabase, user } = admin;
  try {
    const { data: cur } = await supabase.from("faqs").select("page_key").eq("id", id).maybeSingle();
    const { count, error } = await supabase.from("faqs").delete({ count: "exact" }).eq("id", id);
    if (error) throw await dbFailure(error, "deleteFaq");
    if (!count) return { ok: false, error: (await t())("err_not_found") };
    await logAdminAction({ actorEmail: user.email, action: "faq_deleted", targetTable: "faqs", targetId: id });
    revalidateFaqPages(...(cur ? [(cur as { page_key: string }).page_key] : []));
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Monte ou descend une question parmi celles de la meme page. */
export async function moveFaq(id: string, direction: "up" | "down"): Promise<FaqSimpleResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const { supabase, user } = admin;
  try {
    const { data: cur, error: curErr } = await supabase.from("faqs").select("page_key").eq("id", id).maybeSingle();
    if (curErr) throw await dbFailure(curErr, "moveFaq:read");
    if (!cur) return { ok: false, error: (await t())("err_not_found") };
    const pageKey = (cur as { page_key: string }).page_key;
    const { data: list, error } = await supabase.from("faqs").select("id").eq("page_key", pageKey).order("position", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw await dbFailure(error, "moveFaq:list");
    const ids = ((list as { id: string }[] | null) ?? []).map((r) => r.id);
    const i = ids.indexOf(id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Positions reecrites 1..n : ordre stable meme apres des suppressions.
    for (let k = 0; k < ids.length; k++) {
      const { error: upErr } = await supabase.from("faqs").update({ position: k + 1 }).eq("id", ids[k]);
      if (upErr) throw await dbFailure(upErr, "moveFaq:update");
    }
    await logAdminAction({ actorEmail: user.email, action: "faq_reordered", targetTable: "faqs", targetId: id, diff: { page_key: pageKey, direction } });
    revalidateFaqPages(pageKey);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

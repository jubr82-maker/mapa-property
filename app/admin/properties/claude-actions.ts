"use server";

// Bouton "Traduire maintenant avec Claude API" (nov. 2026). Seule entree
// qui appelle l'API Claude : un clic de Julien sur ce bouton. Titre,
// description et accroche, en anglais et en allemand, depuis le francais ;
// le resultat est renvoye a l'ecran pour relecture : RIEN n'est enregistre
// dans le bien ici. Chaque appel est compte (jetons lus et ecrits, cout en
// dollars et en euros) dans public.claude_usage (SQL 40) ; sans le SQL 40,
// la traduction marche et le cout s'affiche, sans etre garde.
// Cle : ANTHROPIC_API_KEY (variable Vercel ajoutee par Julien).
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { sessionFailure, type ActionResult } from "@/lib/admin/action-result";
import { actionRateLimit } from "@/lib/admin/action-rate-limit";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { claudeCostUsd, usdToEur } from "@/lib/claude/pricing";
import { translateListing, type ClaudeErrorCode, type ListingTranslation } from "@/lib/claude/translate-listing";
import { loadClaudeUsage, missingTable, recordClaudeCall, type ClaudeUsageSummary } from "@/lib/claude/usage";
import { getUsdPerEur } from "@/lib/claude/usd-rate";
import { blockingExpiry, isIsoDay } from "@/lib/claude/deadlines";
import { loadClaudeDeadlines, saveApiKeyExpiry } from "@/lib/claude/deadlines-store";
import { formatDateOnly } from "@/lib/datetime";

const LIMITS = { title: 300, description: 20000, short: 2000 };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClaudeTranslateResult =
  | {
      ok: true;
      en: ListingTranslation;
      de: ListingTranslation;
      cost: { usd: number; eur: number | null };
      saved: boolean;
      usage: ClaudeUsageSummary;
    }
  | { ok: false; error: string; code?: ClaudeErrorCode | "empty" | "too_long" | "rate_local" | "key_expired" | "credit_expired"; offerMistral: boolean; usage?: ClaudeUsageSummary; costUsd?: number };

export async function translateWithClaude(input: { title: string; description: string; short: string; propertyId?: string | null }): Promise<ClaudeTranslateResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ...(await sessionFailure()), offerMistral: false };
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_claude" });

  const source = {
    title: String(input?.title ?? "").trim(),
    description: String(input?.description ?? "").trim(),
    short: String(input?.short ?? "").trim(),
  };
  if (!source.title && !source.description && !source.short) return { ok: false, error: t("err_empty"), code: "empty", offerMistral: false };
  if (source.title.length > LIMITS.title || source.description.length > LIMITS.description || source.short.length > LIMITS.short) {
    return { ok: false, error: t("err_too_long"), code: "too_long", offerMistral: false };
  }
  // Cle absente : aucun appel, message clair et Mistral propose.
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey.trim()) return { ok: false, error: t("err_no_key"), code: "no_key", offerMistral: true };

  // Cle ou credit expire (dates saisies dans le tableau de bord) : aucun
  // appel, message clair au lieu de l'erreur technique de Claude.
  const expired = blockingExpiry(await loadClaudeDeadlines(admin.supabase), new Date());
  if (expired) {
    return { ok: false, error: t(`err_${expired.kind}_expired`, { date: formatDateOnly(expired.date) }), code: `${expired.kind}_expired`, offerMistral: true };
  }

  const limit = actionRateLimit(`claude-translate:${admin.user.id}`, 6, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: t("err_rate_local", { seconds: limit.retryInSeconds }), code: "rate_local", offerMistral: true };

  const propertyId = typeof input?.propertyId === "string" && UUID_RE.test(input.propertyId) ? input.propertyId : null;
  const usdPerEur = await getUsdPerEur();
  const outcomes = await translateListing(source, { apiKey });

  // Chaque appel facture est compte, meme en cas d'erreur.
  const requestId = randomUUID();
  let saved = true;
  let usd = 0;
  for (const o of outcomes) {
    const u = o.call.usage;
    if (!u.inputTokens && !u.outputTokens) continue;
    usd += claudeCostUsd(u.inputTokens, u.outputTokens);
    const ok = await recordClaudeCall(admin.supabase, { usage: `traduction_${o.lang}`, inputTokens: u.inputTokens, outputTokens: u.outputTokens, usdPerEur, propertyId, requestId });
    saved = saved && ok;
  }
  const usage = await loadClaudeUsage(admin.supabase, usdPerEur);
  if (usd > 0) revalidatePath("/admin");

  const failed = outcomes.find((o) => !o.call.ok || !o.translation);
  if (failed) {
    const code = failed.call.ok ? "incomplete" : failed.call.code;
    const status = failed.call.ok ? undefined : failed.call.status;
    console.error("[admin/claude] traduction", { code, status });
    // Appels factures malgre l'erreur : cout affiche avec le message.
    return { ok: false, error: t(`err_${code}`, { status: status ?? 0 }), code, offerMistral: true, usage, costUsd: usd };
  }
  const en = outcomes.find((o) => o.lang === "en")?.translation as ListingTranslation;
  const de = outcomes.find((o) => o.lang === "de")?.translation as ListingTranslation;
  return { ok: true, en, de, cost: { usd, eur: usdToEur(usd, usdPerEur) }, saved, usage };
}

/** Credit charge sur la console Claude (montant en dollars et date). */
export async function saveClaudeCredit(amountUsd: number, loadedOn: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_claude" });
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return { ok: false, error: t("credit_err_amount") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(loadedOn ?? "")) || Number.isNaN(Date.parse(`${loadedOn}T00:00:00Z`))) return { ok: false, error: t("credit_err_date") };
  const { error } = await admin.supabase
    .from("claude_credit")
    .upsert({ id: 1, amount_usd: Math.round(amount * 100) / 100, loaded_on: loadedOn, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: missingTable(error) ? t("not_ready") : t("credit_err_save") };
  revalidatePath("/admin");
  revalidatePath("/admin/sante");
  return { ok: true };
}

/** Date d'expiration de la cle API (seule la date est gardee, jamais la cle). */
export async function saveClaudeKeyExpiry(day: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_claude" });
  if (!isIsoDay(day)) return { ok: false, error: t("key_err_date") };
  const r = await saveApiKeyExpiry(admin.supabase, day);
  if (!r.ok) return { ok: false, error: r.reason === "not_ready" ? t("key_not_ready", { date: formatDateOnly(day) }) : t("key_err_save") };
  revalidatePath("/admin");
  revalidatePath("/admin/sante");
  return { ok: true };
}

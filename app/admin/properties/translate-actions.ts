"use server";

// Traduction d'une annonce depuis le francais (oct. 2026) : titre,
// description et accroche, en anglais et en allemand, par Mistral (meme
// cle et meme modele que le chatbot, lib/translate.ts). Le resultat est
// renvoye a l'ecran pour relecture : RIEN n'est enregistre ici.
// Seul le texte de l'annonce est envoye (aucune donnee personnelle, aucun
// nom ajoute par le code ; le prompt de lib/translate.ts ne cite ni Julien
// ni MAPA). Admin de la liste en aal2, debit limite par compte.
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { sessionFailure } from "@/lib/admin/action-result";
import { actionRateLimit } from "@/lib/admin/action-rate-limit";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { translateBatch } from "@/lib/translate";
import { listingWritingPrompt } from "@/lib/listing/writing-rules";

export type TranslatedFields = { title: string; description: string; short: string };
export type TranslateResult =
  | { ok: true; en: Partial<TranslatedFields>; de: Partial<TranslatedFields> }
  | { ok: false; error: string };

const LIMITS = { title: 300, description: 20000, short: 2000 };

/** Motif clair d'un refus de Mistral (code HTTP lu dans le message). */
function mistralReason(e: unknown): { key: string; values?: Record<string, string | number> } {
  const msg = e instanceof Error ? e.message : String(e);
  if (/MISTRAL_API_KEY missing/.test(msg)) return { key: "translate_err_no_key" };
  const status = Number(msg.match(/HTTP (\d{3})/)?.[1]);
  if (status === 429) return { key: "translate_err_rate" };
  if (status === 401 || status === 403) return { key: "translate_err_key_refused" };
  if (status) return { key: "translate_err_http", values: { status } };
  return { key: "translate_err_network", values: { detail: msg.slice(0, 160) } };
}

export async function translatePropertyFromFrench(input: { title: string; description: string; short: string }): Promise<TranslateResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });

  const limit = actionRateLimit(`translate:${admin.user.id}`, 6, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: t("translate_err_local_rate", { seconds: limit.retryInSeconds }) };

  const source = {
    title: String(input?.title ?? "").trim(),
    description: String(input?.description ?? "").trim(),
    short: String(input?.short ?? "").trim(),
  };
  if (!source.title && !source.description && !source.short) return { ok: false, error: t("translate_err_empty") };
  if (source.title.length > LIMITS.title || source.description.length > LIMITS.description || source.short.length > LIMITS.short) {
    return { ok: false, error: t("translate_err_too_long") };
  }

  try {
    // Regles de redaction des annonces imposees a la traduction.
    const [en, de] = await Promise.all([translateBatch(source, "EN", listingWritingPrompt("en")), translateBatch(source, "DE", listingWritingPrompt("de"))]);
    return { ok: true, en: en as Partial<TranslatedFields>, de: de as Partial<TranslatedFields> };
  } catch (e) {
    const r = mistralReason(e);
    return { ok: false, error: t(r.key, r.values) };
  }
}

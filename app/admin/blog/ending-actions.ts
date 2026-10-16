"use server";

// Fin d'article standard (oct. 2026, SQL 27) : une seule ligne (id = 1),
// modifiee ici par l'admin. Textes nettoyes comme le corps des articles ;
// tirets longs et moyens refuses. Apres enregistrement : articles du blog
// revalides dans les trois langues.
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { dbFailure, sessionFailure, ActionFailure } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sanitizeArticleHtml } from "@/lib/security/sanitize";
import { revalidatePublicBlogPages } from "@/lib/revalidate-property";
import { BLOG_ENDING_TAG } from "@/lib/blog/standard-ending-data";

type Lang = "fr" | "en" | "de";
export type EndingPayload = Record<Lang, { heading: string; textCommune: string; textGeneral: string; signature: string }>;
export type EndingResult = { ok: true } | { ok: false; error: string };

const DASHES = /[–—]/;
const plain = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const html = (v: unknown) => (typeof v === "string" ? sanitizeArticleHtml(v).trim().slice(0, 20000) : "");

export async function saveStandardEnding(input: EndingPayload): Promise<EndingResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  try {
    const row: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
    for (const l of ["fr", "en", "de"] as Lang[]) {
      const v = input?.[l];
      const heading = plain(v?.heading, 120);
      const textCommune = html(v?.textCommune);
      const textGeneral = html(v?.textGeneral);
      const signature = plain(v?.signature, 160);
      const lang = t(`lang_${l}`);
      if (!heading || !textCommune || !textGeneral || !signature) return { ok: false, error: t("ending_err_empty", { lang }) };
      if ([heading, textCommune, textGeneral, signature].some((x) => DASHES.test(x))) return { ok: false, error: t("ending_err_dash", { lang }) };
      row[`heading_${l}`] = heading;
      row[`text_commune_${l}`] = textCommune;
      row[`text_general_${l}`] = textGeneral;
      row[`signature_${l}`] = signature;
    }
    const { error } = await admin.supabase.from("blog_standard_ending").upsert(row, { onConflict: "id" });
    if (error) throw await dbFailure(error, "saveStandardEnding");
    revalidateTag(BLOG_ENDING_TAG, { expire: 0 });
    revalidatePublicBlogPages();
    revalidatePath("/admin/blog/fin-standard");
    return { ok: true };
  } catch (e) {
    if (e instanceof ActionFailure) return { ok: false, error: e.message };
    throw e;
  }
}

"use server";

// Modeles d'annonces (oct. 2026) : enregistrement et retour au modele par
// defaut d'une piece (titre, tronc commun ou bloc d'une famille) dans une
// langue. Table listing_templates (SQL 17), ecriture admin seulement (RLS
// is_mapa_admin). Chaque changement est inscrit au journal.
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ActionFailure, dbFailure, runAction, sessionFailure, type ActionResult } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { logAdminAction } from "@/lib/pilotage/audit";
import { LISTING_LANGS, type ListingLang } from "@/lib/listing/listing-data";
import { isTemplatePart } from "@/lib/listing/families";
import { checkFields, describeIssues, templateLiteral } from "@/lib/listing/writing-check";

const MAX_BODY = 20000;

const tl = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_listing" });

async function checkTarget(lang: unknown, part: unknown): Promise<{ lang: ListingLang; part: string }> {
  if (typeof lang !== "string" || !(LISTING_LANGS as readonly string[]).includes(lang) || !isTemplatePart(part)) {
    throw new ActionFailure((await tl())("tpl_err_target"));
  }
  return { lang: lang as ListingLang, part };
}

export async function saveListingTemplate(lang: string, part: string, body: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  return runAction(async () => {
    const target = await checkTarget(lang, part);
    const text = String(body ?? "").replace(/\r\n?/g, "\n");
    if (!text.trim()) throw new ActionFailure((await tl())("tpl_err_empty"));
    if (text.length > MAX_BODY) throw new ActionFailure((await tl())("tpl_err_too_long", { max: MAX_BODY }));
    // Regles de redaction sur le texte fixe du modele (reperes retires).
    const issues = checkFields([{ field: target.part, lang: target.lang, text: templateLiteral(text), title: target.part === "title" }]);
    if (issues.length) {
      const t = await tl();
      throw new ActionFailure([t("chk_template_blocked"), ...describeIssues(issues, (k, v) => t(k, v), () => t("chk_template_field"))].join("\n"));
    }
    const { error } = await admin.supabase
      .from("listing_templates")
      .upsert({ lang: target.lang, part: target.part, body: text, updated_by: admin.user.email ?? null, updated_at: new Date().toISOString() }, { onConflict: "lang,part" });
    if (error) throw await dbFailure(error, "saveListingTemplate");
    await logAdminAction({ actorEmail: admin.user.email, action: "listing_template_changed", targetTable: "listing_templates", targetId: `${target.lang}:${target.part}`, diff: { op: "save", length: text.length } });
    revalidatePath("/admin/settings/modeles");
  });
}

export async function resetListingTemplate(lang: string, part: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  return runAction(async () => {
    const target = await checkTarget(lang, part);
    const { error } = await admin.supabase.from("listing_templates").delete().eq("lang", target.lang).eq("part", target.part);
    if (error) throw await dbFailure(error, "resetListingTemplate");
    await logAdminAction({ actorEmail: admin.user.email, action: "listing_template_changed", targetTable: "listing_templates", targetId: `${target.lang}:${target.part}`, diff: { op: "reset" } });
    revalidatePath("/admin/settings/modeles");
  });
}

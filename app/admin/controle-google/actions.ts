"use server";

// Case « Indexation demandee » (nov. 2026) : memorise (ou oublie) la
// demande faite par Julien dans Search Console pour une adresse.
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { sessionFailure, type ActionResult } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { luxDay } from "@/lib/pilotage/health";
import { setIndexRequest } from "@/lib/pilotage/index-requests-store";

export async function markIndexRequested(url: string, requested: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_controle" });
  const clean = String(url ?? "").trim();
  if (!/^https?:\/\/\S+$/.test(clean) || clean.length > 2000) return { ok: false, error: t("requested_err") };
  const r = await setIndexRequest(admin.supabase, clean, requested === true, luxDay(new Date()));
  if (r === "not_ready") return { ok: false, error: t("requested_not_ready") };
  if (r === "error") return { ok: false, error: t("requested_err") };
  revalidatePath("/admin/controle-google");
  return { ok: true };
}

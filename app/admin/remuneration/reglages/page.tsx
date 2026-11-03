// Page admin : reglages de la remuneration (nov. 2026), agents et employeur.
// Meme garde que les ventes realisees. Tables de supabase/sql/33 ; tant
// qu'elles sont vides, le formulaire part des reglages par defaut et le
// premier enregistrement cree les lignes (PUT /api/admin/remuneration/reglages).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSalesAdminPage } from "@/lib/admin/sales-auth";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { DEFAULT_AGENT, SALE_AGENT_KEYS, loadEmployerSettings, loadSalesAgents } from "@/lib/admin/remuneration-reglages";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function RemunerationSettingsPage() {
  const { supabase } = await requireSalesAdminPage("/admin/remuneration/reglages");
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_remuneration" });
  const ts = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_sales" });
  const [{ agents: saved, source: agentsSource }, { employer, source: employerSource }] = await Promise.all([
    loadSalesAgents(supabase),
    loadEmployerSettings(supabase),
  ]);
  // Un agent par valeur acceptee par les ventes ; reglages par defaut sinon.
  const agents = SALE_AGENT_KEYS.map((key) => {
    const a = saved.find((x) => x.key === key) ?? { ...DEFAULT_AGENT, key };
    return { ...a, displayName: a.displayName ?? ts(`agent.${key}`) };
  });
  const unavailable = agentsSource === "unavailable" || employerSource === "unavailable";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.05em]">{t("settings.title")}</h1>
          <p className="mt-1 text-sm text-[#3D4F63]/80">{t("settings.intro")}</p>
        </div>
        <Link href="/admin/remuneration" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] underline">
          ← {t("settings.back")}
        </Link>
      </header>
      {unavailable ? (
        <AdminNotice kind="remuneration" />
      ) : (
        <>
          {(agentsSource === "defaults" || employerSource === "defaults") && <p className="text-xs text-[#3D4F63]/70">{t("settings.defaults")}</p>}
          <SettingsForm agents={agents} employer={employer} />
        </>
      )}
    </div>
  );
}

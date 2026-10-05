// Securite du compte admin (oct. 2026) : mot de passe (ancien exige,
// 14 caracteres minimum), appareils de double authentification (dont un
// appareil de secours), journal des connexions. Session aal2 obligatoire.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { readAdminAuthLog } from "@/lib/admin/auth-log";
import { ADMIN_LOCALE, formatDateTimeShort } from "@/lib/datetime";
import { ChangePasswordCard, FactorsCard } from "@/components/admin/SecurityClient";

export const dynamic = "force-dynamic";

const LOG_LIMIT = 50;

export default async function AdminSecurityPage() {
  const { supabase } = await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? null, status: f.status }));
  const log = await readAdminAuthLog(LOG_LIMIT);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-bold text-[#3D4F63]">{t("security_title")}</h1>
      </header>
      <ChangePasswordCard />
      <FactorsCard factors={factors} backupName={t("factor_backup_name")} />
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">{t("auth_log_section")}</h2>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-[#3D4F63]/70">{t("auth_log_empty")}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-[#3D4F63]/70">{t("auth_log_intro", { count: log.length })}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
                  <tr>
                    <th className="px-2 py-2">{t("log_col_date")}</th>
                    <th className="px-2 py-2">{t("log_col_event")}</th>
                    <th className="px-2 py-2">{t("log_col_email")}</th>
                    <th className="px-2 py-2">{t("log_col_result")}</th>
                    <th className="px-2 py-2">{t("log_col_ip")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D4F63]/10">
                  {log.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{formatDateTimeShort(r.created_at)}</td>
                      <td className="px-2 py-1.5">{t(`event_${r.event}`)}</td>
                      <td className="px-2 py-1.5">{r.email ?? ""}</td>
                      <td className={`px-2 py-1.5 ${r.success ? "text-emerald-700" : "text-red-700"}`}>
                        {r.success ? t("log_ok") : t("log_fail")}
                        {r.reason ? ` (${r.reason})` : ""}
                      </td>
                      <td className="px-2 py-1.5 font-mono">{r.ip ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

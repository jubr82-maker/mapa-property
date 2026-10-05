// Securite : journal de ce qui est fait dans l'admin (oct. 2026).
// Connexions (reussies, echouees, facteur utilise : code ou Passkey),
// appareils ajoutes ou retires, et modifications sensibles (prix avec
// ancienne et nouvelle valeur, publication, archivage, restauration,
// suppression, documents, parametres, Off-Market). Les reglages du compte
// (mot de passe, appareils) restent dans /admin/securite.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateTimeShort } from "@/lib/datetime";
import { loadJournal, securitySignals, type JournalEntry } from "@/lib/pilotage/journal";
import { Empty, GoLink, PageHeader, Pill, Section, Stat, Table, Td } from "@/components/admin/pilotage/ui";

export const dynamic = "force-dynamic";

const DAYS = 30;

const eur = (v: unknown) =>
  typeof v === "number" ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : v === null || v === undefined ? "" : String(v);

export default async function JournalPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const { available, entries } = await loadJournal(DAYS, 400);
  const day = securitySignals(entries, 24);
  const week = securitySignals(entries, 24 * 7);

  const eventLabel = (e: JournalEntry) => {
    const key = `event_${e.source}_${e.event.replace(/\./g, "_")}`;
    return t.has(key) ? t(key) : e.event;
  };
  const detail = (e: JournalEntry): string => {
    if (!e.detail) return "";
    if (typeof e.detail === "string") return t.has(`reason_${e.detail}`) ? t(`reason_${e.detail}`) : e.detail;
    const d = e.detail as Record<string, unknown>;
    if (e.event === "property_price_changed") {
      const before = (d.before ?? {}) as Record<string, unknown>;
      const after = (d.after ?? {}) as Record<string, unknown>;
      const parts = Object.keys(after).map((k) => t("price_change", { field: t.has(`field_${k}`) ? t(`field_${k}`) : k, before: eur(before[k]), after: eur(after[k]) }));
      return [d.slug ? String(d.slug) : null, ...parts].filter(Boolean).join(" ; ");
    }
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${t.has(`field_${k}`) ? t(`field_${k}`) : k} : ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" ; ");
  };

  return (
    <div className="space-y-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("journal_title")} intro={t("journal_intro", { days: DAYS })} />

      <Section title={t("journal_alerts")} intro={t("journal_alerts_intro")}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label={t("signal_failed_logins")} value={day.failedLogins} hint={t("signal_week", { n: week.failedLogins })} tone={day.failedLogins ? "warning" : "ok"} />
          <Stat label={t("signal_new_devices")} value={day.newDevices} hint={t("signal_week", { n: week.newDevices })} tone={day.newDevices ? "warning" : "ok"} />
          <Stat label={t("signal_deletions")} value={day.deletions} hint={t("signal_week", { n: week.deletions })} tone={day.deletions ? "warning" : "ok"} />
        </div>
        <p className="text-sm">
          <GoLink href="/admin/securite">{t("journal_account_link")}</GoLink>
        </p>
      </Section>

      <Section title={t("journal_entries")}>
        {(!available.admin || !available.auth) && <Empty>{t("journal_partial")}</Empty>}
        {entries.length === 0 ? (
          <Empty>{t("journal_empty")}</Empty>
        ) : (
          <Table head={[t("col_date"), t("col_category"), t("col_event"), t("col_actor"), t("col_result"), t("col_detail")]}>
            {entries.map((e, i) => (
              <tr key={i}>
                <Td mono>{formatDateTimeShort(e.at)}</Td>
                <Td>{t(`category_${e.source}`)}</Td>
                <Td>{eventLabel(e)}</Td>
                <Td mono>{e.actor ?? ""}</Td>
                <Td>{e.success === null ? "" : <Pill tone={e.success ? "ok" : "critical"}>{e.success ? t("result_ok") : t("result_failed")}</Pill>}</Td>
                <Td>{detail(e)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

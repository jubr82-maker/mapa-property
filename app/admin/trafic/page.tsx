// Trafic et referencement (oct. 2026) : Google Analytics 4 (lecture a
// l'ouverture, quota gratuit de l'API Data) et positions Google sur les
// requetes cibles, relevees chaque semaine par la tache quotidienne et
// enregistrees en base (aucun appel Search Console a l'ouverture).
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";
import { loadGa4Overview } from "@/lib/google/ga4";
import { searchConsoleConfigured } from "@/lib/google/search-console";
import { loadSeoHistory } from "@/lib/pilotage/seo";
import { LineChart } from "@/components/admin/analytics/LineChart";
import { TopList } from "@/components/admin/analytics/TopList";
import { Card, Empty, PageHeader, Section, Stat, Table, Td } from "@/components/admin/pilotage/ui";

export const dynamic = "force-dynamic";

export default async function TraficPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const [ga4, seo] = await Promise.all([loadGa4Overview(), loadSeoHistory(26)]);
  const scConfigured = searchConsoleConfigured();

  return (
    <div className="space-y-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("traffic_title")} intro={t("traffic_intro")} />

      <Section title={t("ga4_title")} intro={t("ga4_intro")}>
        {ga4.status === "not_configured" ? (
          <Empty>{t("ga4_not_configured")}</Empty>
        ) : ga4.status === "error" ? (
          <Empty>{t("ga4_error")}</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Stat label={t("ga4_sessions_7d")} value={ga4.sessions7d} />
              <Stat label={t("ga4_sessions_30d")} value={ga4.sessions30d} />
              <Stat label={t("ga4_users_30d")} value={ga4.users30d} />
            </div>
            <Card title={t("ga4_daily")}>
              <LineChart data={ga4.daily} label={t("ga4_daily")} emptyLabel={t("empty_data")} />
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t("ga4_channels")}>
                <TopList items={ga4.channels} emptyLabel={t("empty_data")} />
              </Card>
              <Card title={t("ga4_pages")}>
                <TopList items={ga4.topPages} emptyLabel={t("empty_data")} />
              </Card>
              <Card title={t("ga4_countries")}>
                <TopList items={ga4.countries} emptyLabel={t("empty_data")} />
              </Card>
              <Card title={t("ga4_devices")}>
                <TopList items={ga4.devices.map((d) => ({ ...d, label: t.has(`device_${d.key}`) ? t(`device_${d.key}`) : d.key }))} emptyLabel={t("empty_data")} />
              </Card>
            </div>
          </>
        )}
      </Section>

      <Section id="positions" title={t("seo_title")} intro={t("seo_intro")}>
        {!scConfigured ? (
          <Empty>{t("seo_not_configured")}</Empty>
        ) : !seo.available ? (
          <Empty>{t("seo_not_ready")}</Empty>
        ) : seo.weeks.length === 0 ? (
          <Empty>{t("seo_no_snapshot")}</Empty>
        ) : (
          <>
            <p className="text-sm text-ink-mid">
              {t("seo_week", { date: formatDateOnly(seo.weeks[0]), count: seo.weeks.length })}
            </p>
            <Card title={t("seo_average")}>
              <p className="mb-2 text-xs text-ink-soft">{t("seo_average_note")}</p>
              <LineChart data={seo.averageByWeek} label={t("seo_average")} emptyLabel={t("empty_data")} />
            </Card>
            {seo.trends.length === 0 ? (
              <Empty>{t("seo_no_target")}</Empty>
            ) : (
              <Table head={[t("col_query"), t("col_position"), t("col_previous"), t("col_evolution"), t("col_clicks"), t("col_impressions")]}>
                {seo.trends.map((q) => {
                  const evol = q.current !== null && q.previous !== null ? Math.round((q.previous - q.current) * 10) / 10 : null;
                  return (
                    <tr key={q.query}>
                      <Td>{q.query}</Td>
                      <Td mono>{q.current ?? ""}</Td>
                      <Td mono>{q.previous ?? ""}</Td>
                      <Td mono>{evol === null ? t("evolution_new") : evol > 0 ? t("evolution_up", { n: evol }) : evol < 0 ? t("evolution_down", { n: -evol }) : t("evolution_same")}</Td>
                      <Td mono>{q.clicks}</Td>
                      <Td mono>{q.impressions}</Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

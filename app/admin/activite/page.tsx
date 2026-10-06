// Activite commerciale (oct. 2026) : demandes clients et leur suivi,
// conversion des biens, recherches des visiteurs, demande revelee par
// l'estimation, qualite des annonces. Reprend sans doublon le contenu utile
// de l'ancienne page "Intelligence visiteurs".
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateTimeShort } from "@/lib/datetime";
import { loadVisitorIntelligence, BUCKETS, type RankedItem, type ViewedConversionItem } from "@/lib/admin/visitor-intelligence";
import { loadLeadsControl, type FollowUpState } from "@/lib/pilotage/leads-control";
import { loadActivityCounts } from "@/lib/pilotage/activity";
import { loadEstimationDemand } from "@/lib/pilotage/estimation-demand";
import { loadListingQuality } from "@/lib/pilotage/listing-quality";
import { LEAD_FOLLOWUP_CRITICAL_HOURS, LEAD_FOLLOWUP_WARN_HOURS, LISTING_STALE_DAYS } from "@/lib/pilotage/config";
import { LineChart } from "@/components/admin/analytics/LineChart";
import { TopList } from "@/components/admin/analytics/TopList";
import { Card, Empty, PageHeader, Pill, Section, Stat, Table, Td, type Tone } from "@/components/admin/pilotage/ui";

export const dynamic = "force-dynamic";

const STATE_TONE: Record<FollowUpState, Tone> = { handled: "ok", waiting: "neutral", late24: "warning", late48: "critical" };
const FOLLOWUP_ROWS = 50;

export default async function ActivitePage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const [counts, control, vi, demand, quality] = await Promise.all([
    loadActivityCounts(30),
    loadLeadsControl(90),
    loadVisitorIntelligence(),
    loadEstimationDemand(365),
    loadListingQuality(),
  ]);
  const n = (v: number | null) => (v === null ? t("unavailable_short") : v);
  const hours = (h: number | null) => (h === null ? "" : h < 1 ? t("delay_minutes", { m: Math.round(h * 60) }) : t("delay_hours", { h: Math.round(h * 10) / 10 }));
  const propertyItem = (p: RankedItem | ViewedConversionItem, value: number) => ({
    key: p.id,
    label: `${p.label} (${t(`badge_${p.badge}`)})`,
    href: p.href,
    value,
  });

  return (
    <div className="space-y-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("activity_title")} intro={t("activity_intro")} />

      <Section title={t("activity_volume_title")} intro={t("activity_volume_intro")}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t("count_leads")} value={n(counts.leads)} />
          <Stat label={t("count_estimations")} value={n(counts.estimations)} />
          <Stat label={t("count_nda")} value={n(counts.nda)} />
          <Stat label={t("count_offmarket_requests")} value={n(counts.offmarketRequests)} />
          <Stat label={t("count_waitlist")} value={n(counts.waitlist)} />
          <Stat label={t("count_arcova")} value={n(counts.arcova)} />
          <Stat label={t("count_chatbot")} value={n(counts.chatbot)} />
        </div>
      </Section>

      <Section id="suivi" title={t("followup_title")} intro={t("followup_intro", { warn: LEAD_FOLLOWUP_WARN_HOURS, critical: LEAD_FOLLOWUP_CRITICAL_HOURS })}>
        {!control.available ? (
          <Empty>{t("unavailable")}</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label={t("followup_median")} value={control.medianDelayHours === null ? t("none_yet") : hours(control.medianDelayHours)} />
              <Stat label={t("followup_late24")} value={control.late24} tone={control.late24 ? "warning" : "ok"} />
              <Stat label={t("followup_late48")} value={control.late48} tone={control.late48 ? "critical" : "ok"} />
              <Stat label={t("followup_total")} value={control.requests.length} />
            </div>
            <Card title={t("followup_by_source")}>
              <TopList items={control.bySource.map((s) => ({ key: s.key, label: t(`source_${s.key}`), value: s.value }))} emptyLabel={t("empty_requests")} />
              <p className="mt-3 text-xs text-ink-soft">{t("source_note")}</p>
            </Card>
            {control.requests.length === 0 ? (
              <Empty>{t("empty_requests")}</Empty>
            ) : (
              <Table head={[t("col_date"), t("col_name"), t("col_kind"), t("col_source"), t("col_followup"), t("col_delay")]}>
                {control.requests.slice(0, FOLLOWUP_ROWS).map((r) => (
                  <tr key={`${r.kind}-${r.id}`}>
                    <Td mono>{formatDateTimeShort(r.createdAt)}</Td>
                    <Td>
                      <Link href={r.href} className="underline underline-offset-4 hover:no-underline">
                        {r.name}
                      </Link>
                    </Td>
                    <Td>{t(`kind_${r.kind}`)}</Td>
                    <Td>
                      {t(`source_${r.source}`)}
                      {r.campaign ? ` (${r.campaign})` : ""}
                    </Td>
                    <Td>
                      <Pill tone={STATE_TONE[r.state]}>{t(`state_${r.state}`)}</Pill>
                    </Td>
                    <Td mono>
                      {hours(r.delayHours)}
                      {r.handledApprox && r.delayHours !== null ? ` ${t("approx")}` : ""}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
            <p className="text-xs text-ink-soft">{t("followup_note")}</p>
          </>
        )}
      </Section>

      <Section id="biens" title={t("conversion_title")} intro={t("conversion_intro")}>
        {!vi.available.views && !vi.available.events ? (
          <Empty>{t("unavailable")}</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Stat label={t("conversion_viewed")} value={vi.conversion.globalViewed} />
              <Stat label={t("conversion_contacted")} value={vi.conversion.globalContacted} />
              <Stat label={t("conversion_rate")} value={vi.conversion.globalRatePct === null ? t("none_yet") : `${vi.conversion.globalRatePct} %`} />
            </div>
            {vi.conversion.topProperties.length === 0 ? (
              <Empty>{t("empty_views")}</Empty>
            ) : (
              <Table head={[t("col_property"), t("col_views"), t("col_contacts"), t("col_rate")]}>
                {vi.conversion.topProperties.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <a href={p.href} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:no-underline">
                        {p.label}
                      </a>{" "}
                      <span className="text-xs text-ink-soft">({t(`badge_${p.badge}`)})</span>
                    </Td>
                    <Td mono>{p.views}</Td>
                    <Td mono>{p.contacts}</Td>
                    <Td mono>{p.ratePct} %</Td>
                  </tr>
                ))}
              </Table>
            )}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title={t("top_demand_title")}>
                <TopList items={vi.topDemand.map((p) => propertyItem(p, p.count))} emptyLabel={t("empty_demand")} />
              </Card>
              <Card title={t("to_rework_title")}>
                <p className="mb-3 text-xs text-ink-soft">{t("to_rework_intro")}</p>
                <TopList items={vi.viewedNotContacted.map((p) => propertyItem(p, p.views))} unit={t("unit_views")} emptyLabel={t("empty_to_rework")} />
              </Card>
              <Card title={t("nda_title", { count: vi.ndaByProperty.total })}>
                <TopList items={vi.ndaByProperty.top.map((p) => propertyItem(p, p.count))} emptyLabel={t("empty_nda")} />
              </Card>
            </div>
          </>
        )}
      </Section>

      <Section title={t("actions_title")} intro={t("actions_intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={t("actions_daily")}>
            <LineChart data={vi.volumeByType.dailySeries} label={t("actions_daily")} emptyLabel={t("empty_actions")} />
          </Card>
          <Card title={t("actions_by_type")}>
            <Table head={[t("col_type"), t("col_30d"), t("col_90d")]}>
              {BUCKETS.map((b) => (
                <tr key={b}>
                  <Td>{t(`bucket_${b}`)}</Td>
                  <Td mono>{vi.volumeByType.counts30d[b]}</Td>
                  <Td mono>{vi.volumeByType.counts90d[b]}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        {vi.recentFeed.length === 0 ? (
          <Empty>{t("empty_actions")}</Empty>
        ) : (
          <Card title={t("recent_actions")}>
            <ul className="divide-y divide-ink/10 text-sm">
              {vi.recentFeed.slice(0, 15).map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {t(`bucket_${a.bucket}`)}
                    {a.propertyLabel ? ` : ${a.propertyLabel}` : ""}
                  </span>
                  <span className="font-mono text-xs text-ink-soft">{formatDateTimeShort(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title={t("searches_title", { count: vi.searchDemand.totalSearches })} intro={t("searches_intro")}>
        {vi.searchDemand.totalSearches === 0 ? (
          <Empty>{t("empty_searches")}</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={t("searches_types")}>
              <TopList items={vi.searchDemand.topTypes} emptyLabel={t("empty_searches")} />
            </Card>
            <Card title={t("searches_cities")}>
              <TopList items={vi.searchDemand.topCities} emptyLabel={t("empty_searches")} />
            </Card>
            <Card title={t("searches_budget")}>
              <TopList items={vi.searchDemand.budgetBands.map((b) => ({ key: b.key, label: t(`budget_${b.key.replace(/[<>]/g, (c) => (c === "<" ? "lt" : "gt"))}`), value: b.value }))} emptyLabel={t("empty_searches")} />
            </Card>
            <Card title={t("searches_transaction")}>
              <TopList
                items={[
                  { key: "sale", label: t("badge_sale"), value: vi.searchDemand.transactionSplit.sale },
                  { key: "rent", label: t("badge_rent"), value: vi.searchDemand.transactionSplit.rent },
                ]}
                emptyLabel={t("empty_searches")}
              />
            </Card>
          </div>
        )}
      </Section>

      <Section id="estimation" title={t("demand_title")} intro={t("demand_intro")}>
        {!demand.available ? (
          <Empty>{t("unavailable")}</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={t("demand_by_commune", { count: demand.total })}>
              <TopList items={demand.byCommune} emptyLabel={t("empty_estimations")} />
            </Card>
            <Card title={t("refusals_title", { count: demand.refusalsTotal })}>
              <p className="mb-3 text-xs text-ink-soft">{t("refusals_intro")}</p>
              {!demand.refusalsAvailable ? (
                <Empty>{t("refusals_not_ready")}</Empty>
              ) : (
                <TopList items={demand.refusalsByPlace} emptyLabel={t("empty_refusals")} />
              )}
            </Card>
          </div>
        )}
        {demand.recentRefusals.length > 0 ? (
          <Table head={[t("col_date"), t("col_place"), t("col_reason"), t("col_type")]}>
            {demand.recentRefusals.map((r, i) => (
              <tr key={i}>
                <Td mono>{formatDateTimeShort(r.createdAt)}</Td>
                <Td>{[r.place, r.country].filter(Boolean).join(", ")}</Td>
                <Td>{t(`refusal_${r.reason}`)}</Td>
                <Td>{r.propertyType ?? ""}</Td>
              </tr>
            ))}
          </Table>
        ) : null}
      </Section>

      <Section id="annonces" title={t("quality_title")} intro={t("quality_intro", { days: LISTING_STALE_DAYS })}>
        {!quality.available ? (
          <Empty>{t("unavailable")}</Empty>
        ) : quality.items.length === 0 ? (
          <Empty>{t("quality_all_good", { count: quality.published })}</Empty>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(quality.counts) as (keyof typeof quality.counts)[]).map((k) => (
                <Pill key={k} tone={quality.counts[k] ? "warning" : "ok"}>
                  {t(`issue_${k}`)} : {quality.counts[k]}
                </Pill>
              ))}
            </div>
            <Table head={[t("col_property"), t("col_issues")]}>
              {quality.items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <Link href={`/admin/properties/${i.id}`} className="underline underline-offset-4 hover:no-underline">
                      {i.title}
                    </Link>
                  </Td>
                  <Td>{i.issues.map((x) => t(`issue_${x}`)).join(", ")}</Td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </Section>
    </div>
  );
}

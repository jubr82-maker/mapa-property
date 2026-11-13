// Sante du site (oct. 2026) : echeances, dernier deploiement, sauvegardes,
// tache planifiee, performance (mesures enregistrees, jamais lancees a
// l'ouverture), formulaires et e-mails.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateOnly, formatDateTimeShort } from "@/lib/datetime";
import { Fragment } from "react";
import { loadPsiHistory, psiConfigured, resolvePsiPaths, type PsiRow } from "@/lib/pilotage/psi";
import { LCP_PHASE_ORDER, type LcpDiagnosis } from "@/lib/pilotage/lcp-diagnosis";
import { loadCronRuns, loadEmailLog, loadFormHealth } from "@/lib/pilotage/health";
import { deployInfo, domainStatus, loadBackupStatus } from "@/lib/pilotage/site-facts";
import { CWV_THRESHOLDS, PSI_MANUAL_COOLDOWN_MINUTES, PSI_PATHS, PSI_STRATEGIES } from "@/lib/pilotage/config";
import { LineChart } from "@/components/admin/analytics/LineChart";
import { Card, Empty, PageHeader, Pill, Section, Stat, Table, Td, type Tone } from "@/components/admin/pilotage/ui";
import { RunPerformanceButton } from "@/components/admin/pilotage/RunPerformanceButton";
import { RunBackupButton } from "@/components/admin/pilotage/RunBackupButton";

export const dynamic = "force-dynamic";
// Sauvegarde a la demande (action de cette page) : jusqu'a 300 s, comme la
// tache nocturne (formule Hobby, Fluid Compute).
export const maxDuration = 300;

function tone(value: number | null, good: number, poor: number): Tone {
  if (value === null) return "neutral";
  return value <= good ? "ok" : value <= poor ? "warning" : "critical";
}

const ms = (v: number | null) => (v === null ? "" : `${Math.round(v)} ms`);
const sec = (v: number | null) => (v === null ? "" : `${(v / 1000).toFixed(1)} s`);

export default async function SantePage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const [psi, forms, emails, cron, backup] = await Promise.all([
    loadPsiHistory(90),
    loadFormHealth(14),
    loadEmailLog(100),
    loadCronRuns(30),
    loadBackupStatus(),
  ]);
  const domain = domainStatus();
  const deploy = deployInfo();

  // Derniere mesure par page et par strategie.
  const latest: PsiRow[] = [];
  // Un exemple de chaque modele de page (nov. 2026) : fiche et article
  // choisis parmi les contenus publies.
  const measuredPaths = await resolvePsiPaths();
  for (const p of measuredPaths) {
    for (const s of PSI_STRATEGIES) {
      const r = psi.rows.find((x) => x.url.endsWith(p) && x.strategy === s);
      if (r) latest.push(r);
    }
  }
  const homeMobile = psi.rows
    .filter((r) => r.url.endsWith(PSI_PATHS[0]) && r.strategy === "mobile" && r.performance !== null)
    .slice()
    .reverse()
    .map((r) => ({ date: r.created_at, value: r.performance as number }));

  return (
    <div className="space-y-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("health_title")} intro={t("health_intro")} />

      <Section id="echeances" title={t("deadlines_title")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Stat
            label={t("domain_label", { domain: domain.domain })}
            value={formatDateOnly(domain.expiresOn)}
            hint={t("domain_days_left", { days: domain.daysLeft })}
            tone={domain.alert ? (domain.daysLeft <= 30 ? "critical" : "warning") : "ok"}
          />
          <Stat
            label={t("deploy_label")}
            value={deploy.commit ?? t("deploy_unknown")}
            hint={[deploy.builtAt ? t("deploy_built", { date: formatDateTimeShort(deploy.builtAt) }) : null, deploy.message].filter(Boolean).join(" : ") || undefined}
          />
          <Stat
            label={t("backup_label")}
            value={backup.status === "ok" || backup.status === "late" ? formatDateTimeShort(backup.lastAt) : t(`backup_${backup.status}`)}
            hint={
              backup.status === "ok" || backup.status === "late"
                ? t("backup_hint", { count: backup.count, size: backup.sizeBytes ? Math.round(backup.sizeBytes / 1024 / 1024 * 10) / 10 : 0 })
                : undefined
            }
            tone={backup.status === "ok" ? "ok" : backup.status === "late" || backup.status === "error" ? "warning" : backup.status === "none" ? "critical" : "neutral"}
          />
        </div>
        <p id="sauvegardes" className="text-xs text-ink-soft">{t("backup_note")}</p>
        <RunBackupButton />
      </Section>

      <Section id="performance" title={t("perf_title")} intro={t("perf_intro", { minutes: PSI_MANUAL_COOLDOWN_MINUTES })}>
        <RunPerformanceButton />
        <Card title={t("perf_thresholds")}>
          <ul className="space-y-1 text-sm text-ink-mid">
            <li>{t("threshold_lcp", { good: CWV_THRESHOLDS.lcpMs.good / 1000, poor: CWV_THRESHOLDS.lcpMs.poor / 1000 })}</li>
            <li>{t("threshold_inp", { good: CWV_THRESHOLDS.inpMs.good, poor: CWV_THRESHOLDS.inpMs.poor })}</li>
            <li>{t("threshold_cls", { good: CWV_THRESHOLDS.cls.good, poor: CWV_THRESHOLDS.cls.poor })}</li>
          </ul>
          <p className="mt-2 text-xs text-ink-soft">{t("threshold_note")}</p>
        </Card>
        {!psiConfigured() ? <Empty>{t("psi_not_configured")}</Empty> : null}
        {!psi.available ? (
          <Empty>{t("psi_not_ready")}</Empty>
        ) : latest.length === 0 ? (
          <Empty>{t("psi_empty")}</Empty>
        ) : (
          <>
            <Table head={[t("col_page"), t("col_device"), t("col_score"), t("col_lcp"), t("col_inp"), t("col_cls"), t("col_measured")]}>
              {latest.map((r) => (
                <Fragment key={`${r.url}-${r.strategy}`}>
                <tr>
                  <Td mono>{new URL(r.url).pathname}</Td>
                  <Td>{t(`device_${r.strategy}`)}</Td>
                  <Td>{r.error ? <Pill tone="critical">{t("psi_failed")}</Pill> : <Pill tone={tone(r.performance === null ? null : 100 - r.performance, 10, 50)}>{r.performance ?? ""}</Pill>}</Td>
                  <Td>
                    <Pill tone={tone(r.field_lcp_ms ?? r.lcp_ms, CWV_THRESHOLDS.lcpMs.good, CWV_THRESHOLDS.lcpMs.poor)}>{sec(r.field_lcp_ms ?? r.lcp_ms)}</Pill>
                  </Td>
                  <Td>
                    {r.field_inp_ms !== null ? (
                      <Pill tone={tone(r.field_inp_ms, CWV_THRESHOLDS.inpMs.good, CWV_THRESHOLDS.inpMs.poor)}>{ms(r.field_inp_ms)}</Pill>
                    ) : (
                      <span className="text-xs text-ink-soft">{r.tbt_ms !== null ? t("inp_lab", { tbt: Math.round(r.tbt_ms) }) : ""}</span>
                    )}
                  </Td>
                  <Td>
                    <Pill tone={tone(r.field_cls ?? r.cls, CWV_THRESHOLDS.cls.good, CWV_THRESHOLDS.cls.poor)}>{(r.field_cls ?? r.cls)?.toFixed(2) ?? ""}</Pill>
                  </Td>
                  <Td mono>{formatDateTimeShort(r.created_at)}</Td>
                </tr>
                {r.strategy === "mobile" && !r.error ? (
                  <tr data-lcp-cause>
                    <td colSpan={7} className="px-3 pb-3">
                      <LcpCause d={r.lcp_diagnosis ?? null} t={t} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </Table>
            <p className="text-xs text-ink-soft">{t("perf_field_note")}</p>
            <Card title={t("perf_trend", { path: PSI_PATHS[0] })}>
              <LineChart data={homeMobile} label={t("perf_trend", { path: PSI_PATHS[0] })} emptyLabel={t("empty_data")} />
            </Card>
          </>
        )}
      </Section>

      <Section id="tache" title={t("cron_title")} intro={t("cron_intro")}>
        {!cron.available ? (
          <Empty>{t("cron_not_ready")}</Empty>
        ) : cron.rows.length === 0 ? (
          <Empty>{t("cron_empty")}</Empty>
        ) : (
          <Table head={[t("col_date"), t("col_task"), t("col_result"), t("col_detail")]}>
            {cron.rows.map((r, i) => (
              <tr key={i}>
                <Td mono>{formatDateTimeShort(r.created_at)}</Td>
                <Td>{t.has(`task_${r.task}`) ? t(`task_${r.task}`) : r.task}</Td>
                <Td>
                  <Pill tone={r.ok ? "ok" : "critical"}>{r.ok ? t("result_ok") : t("result_failed")}</Pill>
                </Td>
                <Td mono>{r.detail ?? ""}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="formulaires" title={t("forms_title")} intro={t("forms_intro")}>
        {!forms.available ? (
          <Empty>{t("forms_not_ready")}</Empty>
        ) : forms.rows.length === 0 ? (
          <Empty>{t("forms_empty")}</Empty>
        ) : (
          <Table head={[t("col_day"), t("col_form"), t("outcome_ok"), t("outcome_captcha"), t("outcome_rate_limited"), t("outcome_db_error"), t("outcome_invalid")]}>
            {forms.rows.map((r) => (
              <tr key={`${r.date}-${r.form}`}>
                <Td mono>{formatDateOnly(r.date)}</Td>
                <Td>{t.has(`form_${r.form}`) ? t(`form_${r.form}`) : r.form}</Td>
                <Td mono>{r.ok}</Td>
                <Td mono>{r.captcha}</Td>
                <Td mono>{r.rate_limited}</Td>
                <Td mono>{r.db_error + r.error > 0 ? <Pill tone="critical">{r.db_error + r.error}</Pill> : 0}</Td>
                <Td mono>{r.invalid}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="emails" title={t("emails_title")} intro={t("emails_intro")}>
        {!emails.available ? (
          <Empty>{t("emails_not_ready")}</Empty>
        ) : emails.rows.length === 0 ? (
          <Empty>{t("emails_empty")}</Empty>
        ) : (
          <Table head={[t("col_date"), t("col_recipient"), t("col_email_kind"), t("col_result"), t("col_reason")]}>
            {emails.rows.map((r, i) => (
              <tr key={i}>
                <Td mono>{formatDateTimeShort(r.created_at)}</Td>
                <Td mono>{r.recipient_masked ?? ""}</Td>
                <Td>{t.has(`email_${r.kind}`) ? t(`email_${r.kind}`) : r.kind}</Td>
                <Td>
                  <Pill tone={r.success ? "ok" : "critical"}>{r.success ? t("result_ok") : t("result_failed")}</Pill>
                </Td>
                <Td mono>{r.failure_reason ?? ""}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

// Cause du LCP d'une mesure mobile (oct. 2026), repliable, en clair.
function LcpCause({ d, t }: { d: LcpDiagnosis | null; t: (key: string, values?: Record<string, string | number>) => string }) {
  if (!d) return <p className="text-xs text-ink-soft">{t("lcp_none")}</p>;
  const total = LCP_PHASE_ORDER.reduce((n, k) => n + (d.phases[k] ?? 0), 0);
  const main = LCP_PHASE_ORDER.filter((k) => d.phases[k] !== undefined).sort((a, b) => (d.phases[b] ?? 0) - (d.phases[a] ?? 0))[0];
  const s = (msv: number) => (msv / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return (
    <details className="rounded-xl border border-ink/10 bg-bg p-3 text-sm" data-lcp-details>
      <summary className="cursor-pointer font-medium text-ink">
        {t("lcp_cause_title")}
        {main ? <span className="ml-2 text-xs text-ink-soft">{t("lcp_main_phase", { phase: t(`lcp_phase_${main}`), s: s(d.phases[main] ?? 0) })}</span> : null}
      </summary>
      <div className="mt-3 space-y-3">
        {d.element ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("lcp_element")}</p>
            {d.element.label ? <p className="mt-1 text-ink">{d.element.label}</p> : null}
            {d.element.selector ? <p className="mt-1 break-all font-mono text-xs text-ink-mid">{d.element.selector}</p> : null}
            {d.element.snippet ? <p className="mt-1 break-all font-mono text-xs text-ink-soft">{d.element.snippet}</p> : null}
          </div>
        ) : null}
        {total > 0 ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("lcp_phases_title")}</p>
            <ul className="mt-1 space-y-1">
              {LCP_PHASE_ORDER.filter((k) => d.phases[k] !== undefined).map((k) => (
                <li key={k} className="flex flex-wrap justify-between gap-2">
                  <span>{t(`lcp_phase_${k}`)}</span>
                  <span className="font-mono text-xs">{t("lcp_phase_value", { s: s(d.phases[k] ?? 0), pct: Math.round(((d.phases[k] ?? 0) / total) * 100) })}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {d.opportunities.length ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("lcp_opportunities")}</p>
            <ol className="mt-1 space-y-1">
              {d.opportunities.map((o) => (
                <li key={o.id} className="flex flex-wrap justify-between gap-2">
                  <span>{o.title}</span>
                  <span className="font-mono text-xs">{t("lcp_gain", { s: s(o.savings_ms) })}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </details>
  );
}

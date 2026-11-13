// Controle Google (nov. 2026) : etat du dernier controle du site et de
// Google, en trois zones (A corriger, En attente de Google, Normal), pages
// a soumettre a Google et evolution. Lecture des resultats enregistres
// (aucun appel a Google a l'ouverture). Sans SQL 39 : message clair.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateOnly, formatDateTimeShort } from "@/lib/datetime";
import { loadControleView, type Group } from "@/lib/pilotage/controle-view";
import { CATEGORIES, pathOf, type Category } from "@/lib/pilotage/controle-core";
import { LineChart } from "@/components/admin/analytics/LineChart";
import { PageHeader } from "@/components/admin/pilotage/ui";
import { RunControleButton } from "@/components/admin/pilotage/RunControleButton";
import { CopyOpenSearchConsole } from "@/components/admin/pilotage/CopyOpenSearchConsole";

export const dynamic = "force-dynamic";
// Un clic sur "Lancer le controle" avance le passage pendant 45 s au plus.
export const maxDuration = 300;

const ZONE_ACCENT: Record<Category, string> = {
  a_corriger: "bg-red-600",
  attente_google: "bg-amber-500",
  normal: "bg-emerald-600",
};

function Zone({ category, groups, count, t }: { category: Category; groups: Group[]; count: number; t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <section id={`zone-${category}`} className="scroll-mt-6 border-t border-ink/15 pt-8">
      <header className="flex items-baseline gap-3">
        <span aria-hidden className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ZONE_ACCENT[category]}`} />
        <h2 className="font-display text-2xl font-bold text-ink">{t(`zone_${category}`)}</h2>
        <span className="font-mono text-sm text-ink-soft">{count}</span>
      </header>
      <p className="mt-1 max-w-3xl text-sm text-ink-mid">{t(`zone_${category}_intro`)}</p>
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{t("zone_empty")}</p>
      ) : (
        <div className="mt-4 divide-y divide-ink/10">
          {groups.map((g) => (
            <details key={g.key} open={category === "a_corriger"} className="group py-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-medium text-ink">{t(`label_${g.key}`)}</span>
                <span className="shrink-0 font-mono text-xs text-ink-soft">{g.count}</span>
              </summary>
              <ul className="mt-2 space-y-3 pl-0 sm:pl-4">
                {g.items.map((it, i) => (
                  <li key={`${it.url}-${i}`} className="min-w-0">
                    <p className="break-all font-mono text-xs text-ink">{it.url}</p>
                    <p className="mt-0.5 text-sm text-ink-mid">{it.explanation}</p>
                  </li>
                ))}
                {g.count > g.items.length ? <li className="text-xs text-ink-soft">{t("more", { count: g.count - g.items.length })}</li> : null}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function ControleGooglePage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_controle" });
  const v = await loadControleView();

  if (!v.ready) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
        <p className="border-l-2 border-gold pl-4 font-display text-xl font-bold text-ink">{t("db_not_ready")}</p>
        {!v.keyConfigured ? <p className="text-sm text-ink-mid">{t("no_key")}</p> : null}
      </div>
    );
  }

  const issues = v.counts.a_corriger;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      {/* Etat */}
      <section className="space-y-4">
        <p className={`font-display text-3xl font-bold sm:text-4xl ${issues ? "text-ink" : "text-gold"}`}>
          {issues ? t("status_issues", { count: issues }) : v.lastCheckAt ? t("status_ok") : t("never")}
        </p>
        {v.lastCheckAt ? <p className="text-sm text-ink-mid">{t("last_check", { date: formatDateTimeShort(v.lastCheckAt) })}</p> : null}
        {v.openRuns.map((r) => (
          <p key={r.id} className="text-sm text-ink-mid">
            {r.state === "quota"
              ? t("open_run_quota", { done: Number(r.counters?.done ?? 0), total: Number(r.counters?.total ?? 0) })
              : t("open_run", { kind: t(`kind_${r.kind}`), done: Number(r.counters?.done ?? 0), total: Number(r.counters?.total ?? 0) })}
          </p>
        ))}
        {!v.keyConfigured ? <p className="text-sm text-ink-mid">{t("no_key")}</p> : <p className="text-xs text-ink-soft">{t("quota_used", { used: v.quotaUsed })}</p>}
        <RunControleButton />
        {v.running ? <p className="text-sm text-ink-mid">{t("result_busy")}</p> : null}
      </section>

      {CATEGORIES.map((c) => (
        <Zone key={c} category={c} groups={v.zones[c]} count={v.counts[c]} t={t} />
      ))}

      {/* A soumettre a Google */}
      <section id="soumettre" className="scroll-mt-6 border-t border-ink/15 pt-8">
        <h2 className="font-display text-2xl font-bold text-ink">{t("submit_title")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-mid">{t("submit_intro")}</p>
        {v.toSubmit.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">{t("submit_empty")}</p>
        ) : (
          <ol className="mt-4 divide-y divide-ink/10">
            {v.toSubmit.map((s) => (
              <li key={s.url} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-ink">{s.url}</p>
                  <p className="text-xs text-ink-soft">{t(`label_${s.key}`)}</p>
                </div>
                <CopyOpenSearchConsole url={s.url} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Evolution */}
      <section className="border-t border-ink/15 pt-8">
        <h2 className="font-display text-2xl font-bold text-ink">{t("evolution_title")}</h2>
        {v.analytics ? (
          <p className="mt-1 max-w-3xl text-sm text-ink-mid">
            {t("totals", {
              clicks: v.analytics.totals.clicks,
              impressions: v.analytics.totals.impressions,
              prevClicks: v.analytics.totals.prevClicks,
              prevImpressions: v.analytics.totals.prevImpressions,
              start: formatDateOnly(v.analytics.period.start),
              end: formatDateOnly(v.analytics.period.end),
            })}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">{t("indexed_chart")}</h3>
            <LineChart data={v.indexHistory} label={t("indexed_chart")} emptyLabel={t("empty_data")} />
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">{t("clicks_chart")}</h3>
            <LineChart data={v.clicksHistory} label={t("clicks_chart")} emptyLabel={t("empty_data")} />
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">{t("impressions_chart")}</h3>
            <LineChart data={v.impressionsHistory} label={t("impressions_chart")} emptyLabel={t("empty_data")} />
          </div>
        </div>

        {v.analytics && v.analytics.pages.length > 0 ? (
          <div className="mt-10">
            <h3 className="font-display text-lg font-bold text-ink">{t("pages_traffic")}</h3>
            <ul className="mt-3 divide-y divide-ink/10">
              {v.analytics.pages.slice(0, 20).map((p) => (
                <li key={p.page} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="min-w-0 break-all font-mono text-xs text-ink">{pathOf(p.page) ?? p.page}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-mid">
                    {t("col_clicks")} {p.clicks} ({p.prevClicks}), {t("col_impressions")} {p.impressions} ({p.prevImpressions}), {t("col_position")} {p.position}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10">
          <h3 className="font-display text-lg font-bold text-ink">{t("positions_title")}</h3>
          <p className="mt-1 text-xs text-ink-soft">{t("positions_note")}</p>
          <div className="mt-4 min-w-0">
            <LineChart data={v.positions.averageByDay} label={t("positions_title")} emptyLabel={t("empty_data")} />
          </div>
          {!v.positions.available || v.positions.queries.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">{t("empty_data")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {v.positions.queries.map((q) => {
                const series = v.positions.days.map((d) => q.byDay[d]).filter((x): x is number => typeof x === "number");
                return (
                  <li key={q.query} className="flex items-baseline justify-between gap-4 py-2">
                    <span className="min-w-0 break-words text-sm text-ink">{q.query}</span>
                    <span className="shrink-0 text-right font-mono text-xs text-ink-mid">
                      {q.last ?? ""}
                      <span className="block text-[10px] text-ink-soft">
                        {t("col_days")} {series.length}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

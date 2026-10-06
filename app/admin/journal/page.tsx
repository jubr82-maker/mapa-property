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
import Link from "next/link";
import {
  JOURNAL_RESULT_FILTERS,
  JOURNAL_TYPE_FILTERS,
  abbreviateAccount,
  journalLines,
  journalSummary,
  paginate,
  parseJournalParams,
  shortTime,
} from "@/lib/pilotage/journal-view";

export const dynamic = "force-dynamic";

const DAYS = 30;

const eur = (v: unknown) =>
  typeof v === "number" ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : v === null || v === undefined ? "" : String(v);

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = parseJournalParams(await searchParams);
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const { available, entries } = await loadJournal(DAYS, 400);
  const day = securitySignals(entries, 24);
  const week = securitySignals(entries, 24 * 7);

  // Telephone (seconde passe, oct. 2026) : resume 7 jours, une ligne par
  // evenement, echecs et evenements sensibles par defaut, connexions
  // reussies regroupees par jour, filtres type et resultat, pages de 20.
  const summary = journalSummary(entries);
  const lines = journalLines(entries, params);
  const pageOf = paginate(lines, params.page);
  const shortLabel = (e: JournalEntry) => {
    const key = `jshort_${e.source}_${e.event.replace(/\./g, "_")}`;
    return t.has(key) ? t(key) : eventLabel(e);
  };
  const href = (over: Partial<{ type: string; result: string; vue: string; page: number }>) => {
    const q = new URLSearchParams();
    const type = over.type ?? params.type;
    const result = over.result ?? params.result;
    const vue = over.vue ?? (params.view === "all" ? "tout" : "");
    if (type !== "all") q.set("type", type);
    if (result !== "all") q.set("result", result);
    if (vue) q.set("vue", vue);
    if (over.page && over.page > 1) q.set("page", String(over.page));
    const qs = q.toString();
    return qs ? `/admin/journal?${qs}` : "/admin/journal";
  };
  const chip = (active: boolean) =>
    `inline-flex items-center rounded-full px-4 py-2 text-[14px] ${active ? "bg-ink text-bg" : "border border-ink/20 text-ink"}`;

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

      <div className="space-y-5 md:hidden" data-admin-journal-mobile>
        <section aria-label={t("journal_summary_title")}>
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink-mid">{t("journal_summary_title")}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["summary_sign_ins", summary.signIns, "neutral"],
                ["summary_failures", summary.failures, summary.failures ? "warning" : "ok"],
                ["summary_devices", summary.devices, summary.devices ? "warning" : "ok"],
                ["summary_sensitive", summary.sensitive, "neutral"],
              ] as const
            ).map(([k, v, tone]) => (
              <div key={k} className={`min-w-0 rounded-xl border bg-bg-soft px-3 py-2 ${tone === "warning" ? "border-amber-500/60" : "border-ink/15"}`}>
                <dt className="truncate text-[14px] text-ink-mid">{t(k)}</dt>
                <dd className="font-display text-2xl font-bold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label={t("col_category")} className="flex gap-2" data-admin-chips>
          {JOURNAL_TYPE_FILTERS.map((k) => (
            <Link key={k} href={href({ type: k, page: 1 })} className={chip(params.type === k)} aria-current={params.type === k ? "true" : undefined}>
              {t(`jfilter_type_${k}`)}
            </Link>
          ))}
        </nav>
        <nav aria-label={t("col_result")} className="flex gap-2" data-admin-chips>
          {JOURNAL_RESULT_FILTERS.map((k) => (
            <Link key={k} href={href({ result: k, page: 1 })} className={chip(params.result === k)} aria-current={params.result === k ? "true" : undefined}>
              {t(`jfilter_result_${k}`)}
            </Link>
          ))}
          <Link href={href({ vue: params.view === "all" ? "" : "tout", page: 1 })} className={chip(params.view === "all")} aria-current={params.view === "all" ? "true" : undefined}>
            {t("jview_all")}
          </Link>
        </nav>

        {(!available.admin || !available.auth) && <Empty>{t("journal_partial")}</Empty>}
        {pageOf.items.length === 0 ? (
          <Empty>{entries.length === 0 ? t("journal_empty") : t("jempty_filtered")}</Empty>
        ) : (
          <ol className="divide-y divide-ink/10 rounded-2xl border border-ink/15 bg-bg-soft">
            {pageOf.items.map((line, i) => {
              if (line.kind === "sign_ins") {
                return (
                  <li key={`d-${line.day}`} className="flex min-h-11 items-center gap-3 px-3 py-2 text-[14px]">
                    <span className="shrink-0 font-mono text-ink-mid">{shortTime(line.at).slice(0, 5)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{t("jline_sign_ins", { count: line.count })}</span>
                    <Pill tone="ok">{t("result_ok")}</Pill>
                  </li>
                );
              }
              const e = line.entry;
              const d = detail(e);
              const row = (
                <span className="flex min-w-0 items-center gap-3 text-[14px]">
                  <span className="shrink-0 font-mono text-ink-mid">{shortTime(e.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{shortLabel(e)}</span>
                  {e.success === null ? null : <Pill tone={e.success ? "ok" : "critical"}>{e.success ? t("result_ok") : t("result_failed")}</Pill>}
                  {e.actor ? <span className="hidden shrink-0 font-mono text-ink-mid min-[400px]:inline">{abbreviateAccount(e.actor)}</span> : null}
                </span>
              );
              return (
                <li key={`e-${i}-${e.at}`} className="px-3 py-2">
                  {d || e.actor ? (
                    <details>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center">{row}</summary>
                      <p className="mt-1 break-words text-[14px] text-ink-mid">
                        {[eventLabel(e), abbreviateAccount(e.actor), d].filter(Boolean).join(" ; ")}
                      </p>
                    </details>
                  ) : (
                    <div className="flex min-h-11 items-center">{row}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {pageOf.pages > 1 && (
          <nav aria-label={t("jpagination")} className="flex flex-nowrap items-center justify-between gap-3 text-[14px]">
            {pageOf.page > 1 ? (
              <Link href={href({ page: pageOf.page - 1 })} className={chip(false)}>{t("jprev")}</Link>
            ) : <span />}
            <span className="text-ink-mid">{t("jpage", { page: pageOf.page, pages: pageOf.pages })}</span>
            {pageOf.page < pageOf.pages ? (
              <Link href={href({ page: pageOf.page + 1 })} className={chip(false)}>{t("jnext")}</Link>
            ) : <span />}
          </nav>
        )}
        <p className="text-sm">
          <GoLink href="/admin/securite">{t("journal_account_link")}</GoLink>
        </p>
      </div>

      <div className="hidden space-y-12 md:block">
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
    </div>
  );
}

// Controle quotidien (nov. 2026) : un passage (site ou google) avec verrou,
// budget de temps, point de reprise, explications en francais simple
// (traductions admin_controle, langue de l'admin) et e-mail seulement s'il
// y a du nouveau a corriger ou des pages sorties de l'index.
import { randomUUID } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sendMail, INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/email/smtp";
import { categoryOf, type CheckKey, type Finding } from "@/lib/pilotage/controle-core";
import { CONTROLE_LOCK_SECONDS } from "@/lib/pilotage/config";
import { controleBase, newSiteCursor, stepSite, type SiteCursor } from "@/lib/pilotage/controle-site";
import { GOOGLE_DAILY_STOP, googleConfigured, googleQuotaDay, newGoogleCursor, stepGoogle, type GoogleCursor } from "@/lib/pilotage/controle-google";
import {
  controleDbReady,
  insertFindings,
  loadResults,
  openRun,
  previousDoneRun,
  releaseLock,
  saveRun,
  takeGoogleQuota,
  tryLock,
  type Kind,
  type RunRow,
} from "@/lib/pilotage/controle-store";

export type ControleOutcome = {
  ok: boolean;
  /** db_not_ready, busy, no_key, done, paused, quota, failed */
  detail: string;
  runId?: number;
  progress?: { done: number; total: number };
};

type Translator = (key: string, params?: Record<string, string | number>) => string;

export async function controleTranslator(): Promise<Translator> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_controle" });
  return (key, params) => (t.has(key) ? t(key, params) : key);
}

export const explainWith = (t: Translator) => (f: Finding) => t(`check_${f.key}`, f.params ?? {});

/**
 * Un passage, jusqu'a `budgetMs`. Le verrou (un seul controle a la fois)
 * est pris pour la duree de l'appel et libere a la fin, meme en erreur.
 */
export async function runControle(kind: Kind, opts: { trigger: string; budgetMs: number; forceNew?: boolean }): Promise<ControleOutcome> {
  const startedAt = Date.now();
  const deadline = startedAt + opts.budgetMs;
  if (!(await controleDbReady())) return { ok: false, detail: "db_not_ready" };
  const holder = `${kind}-${randomUUID()}`;
  if (!(await tryLock(holder, CONTROLE_LOCK_SECONDS))) return { ok: false, detail: "busy" };
  let run: RunRow | null = null;
  try {
    run = await openRun(kind, opts.trigger, Boolean(opts.forceNew));
    const t = await controleTranslator();
    const explain = explainWith(t);
    const runId = run.id;
    let aCorriger = Number(run.counters?.aCorriger ?? 0);
    let findings = Number(run.counters?.findings ?? 0);
    const onFindings = async (f: Finding[]) => {
      if (!f.length) return;
      aCorriger += f.filter((x) => categoryOf(x.key) === "a_corriger").length;
      findings += f.length;
      await insertFindings(runId, f, explain);
    };

    // Point de reprise apres chaque lot (pas de doublon a la reprise, meme
    // si la fonction est coupee) et verrou renouvele.
    const checkpoint = async (cur: SiteCursor | GoogleCursor) => {
      const total = cur.urls.length + ("links" in cur ? cur.links.length : 0);
      const done = cur.i + ("li" in cur ? cur.li : 0);
      await saveRun(runId, { state: "running", cursor: cur as unknown as Record<string, unknown>, counters: { findings, aCorriger, done, total } });
      await tryLock(holder, CONTROLE_LOCK_SECONDS).catch(() => false);
    };

    if (kind === "google" && !googleConfigured()) {
      await saveRun(runId, { state: "no_key", finished_at: new Date().toISOString(), detail: "no_key", cursor: null });
      return { ok: false, detail: "no_key", runId };
    }

    let done: boolean;
    let stoppedBy: "time" | "limit" | null;
    let progress: { done: number; total: number };
    let cursor: SiteCursor | GoogleCursor;
    let summary: Record<string, unknown> = {};
    if (kind === "site") {
      const c = (run.cursor as SiteCursor | null) ?? newSiteCursor(controleBase());
      const r = await stepSite(c, deadline, onFindings, fetch, (cur) => checkpoint(cur));
      ({ done, stoppedBy, progress, cursor } = r);
      summary = { base: c.base, pages: c.urls.length, linksChecked: c.links.length, indexable: c.indexable.length };
    } else {
      const c = (run.cursor as GoogleCursor | null) ?? newGoogleCursor();
      const day = googleQuotaDay();
      const r = await stepGoogle(c, deadline, onFindings, {
        takeQuota: (want) => takeGoogleQuota(day, want, GOOGLE_DAILY_STOP),
        checkpoint: (cur) => checkpoint(cur),
        previousKeys: async () => {
          const prev = await previousDoneRun("google", runId);
          if (!prev) return new Map();
          return new Map((await loadResults(prev.id)).filter((x) => x.check_key.startsWith("g_") && !x.check_key.startsWith("g_sitemap")).map((x) => [x.url, x.check_key]));
        },
      });
      ({ done, stoppedBy, progress, cursor } = r);
      summary = { ...c.counts, total: c.urls.length, analytics: c.analytics };
    }

    const counters = { findings, aCorriger, done: progress.done, total: progress.total };
    if (done) {
      await saveRun(runId, { state: "done", finished_at: new Date().toISOString(), counters, cursor: null, summary, detail: "ok" });
      await notifyIfNeeded(kind, runId).catch(() => undefined);
      return { ok: true, detail: "done", runId, progress };
    }
    const state = stoppedBy === "limit" ? "quota" : "paused";
    await saveRun(runId, { state, counters, cursor: cursor as unknown as Record<string, unknown>, summary, detail: state === "quota" ? "limite_google_du_jour" : "reprise" });
    return { ok: true, detail: state, runId, progress };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 120) : "erreur";
    // Le point de reprise precedent reste en base : le passage suivant reprend.
    if (run) await saveRun(run.id, { state: "paused", detail }).catch(() => undefined);
    return { ok: false, detail: "failed", runId: run?.id };
  } finally {
    await releaseLock(holder).catch(() => undefined);
  }
}

/** Nouveaux points a corriger (absents du passage precedent) et pages sorties de l'index. */
export async function newIssues(kind: Kind, runId: number): Promise<{ added: { url: string; explanation: string }[]; dropped: string[] }> {
  const cur = await loadResults(runId);
  const prev = await previousDoneRun(kind, runId);
  const before = new Set(prev ? (await loadResults(prev.id)).filter((r) => r.category === "a_corriger").map((r) => `${r.url}|${r.check_key}`) : []);
  const added = cur.filter((r) => r.category === "a_corriger" && r.check_key !== "g_dropped" && !before.has(`${r.url}|${r.check_key}`)).map((r) => ({ url: r.url, explanation: r.explanation }));
  const dropped = cur.filter((r) => r.check_key === ("g_dropped" satisfies CheckKey)).map((r) => r.url);
  return { added, dropped };
}

const MAX_MAIL_LINES = 15;

/** E-mail au destinataire du resume hebdomadaire, seulement s'il y a du nouveau. */
export async function notifyIfNeeded(kind: Kind, runId: number): Promise<{ sent: boolean }> {
  const { added, dropped } = await newIssues(kind, runId);
  if (!added.length && !dropped.length) return { sent: false };
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_controle" });
  const lines: string[] = [t("mail_intro"), ""];
  if (dropped.length) {
    lines.push(t("mail_dropped", { count: dropped.length }));
    for (const u of dropped.slice(0, MAX_MAIL_LINES)) lines.push(`  ${u}`);
    lines.push("");
  }
  if (added.length) {
    lines.push(t("mail_added", { count: added.length }));
    for (const a of added.slice(0, MAX_MAIL_LINES)) lines.push(`  ${a.url}`, `    ${a.explanation}`);
    if (added.length > MAX_MAIL_LINES) lines.push(`  ${t("mail_more", { count: added.length - MAX_MAIL_LINES })}`);
    lines.push("");
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
  lines.push(t("mail_link", { url: `${site.replace(/\/$/, "")}/admin/controle-google` }));
  const subject = t(kind === "site" ? "mail_subject_site" : "mail_subject_google", { count: added.length + dropped.length });
  const r = await sendMail({ to: INTERNAL_NOTIFICATION_RECIPIENTS, subject, text: lines.join("\n"), kind: "controle_report" });
  return { sent: r.ok };
}

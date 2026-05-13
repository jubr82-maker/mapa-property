import { headers } from "next/headers";
import { Activity, Gauge, Package, ShieldCheck } from "lucide-react";
import { ScoreCard } from "@/components/admin/performance/ScoreCard";
import { WebVitalBadge } from "@/components/admin/performance/WebVitalBadge";
import { BundleSizeList } from "@/components/admin/performance/BundleSizeList";
import { SentryNotConfiguredCard } from "@/components/admin/performance/SentryNotConfiguredCard";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Scores = {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
};

type WebVitals = {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
};

type PsiResult = {
  url: string;
  strategy: "mobile" | "desktop";
  scores: Scores;
  webVitals: WebVitals;
  error?: string;
};

type PsiResponse =
  | { ok: true; results: PsiResult[]; keyConfigured?: boolean }
  | { ok: false; reason: string; message?: string };

type SentryIssue = {
  id: string;
  title: string;
  shortId?: string;
  count?: string;
  userCount?: number;
  level?: string;
  permalink?: string;
};

type SentryResponse =
  | {
      ok: true;
      errorsCount: number;
      last24h: number;
      topIssues: SentryIssue[];
      unresolvedCount: number;
      org?: string;
      project?: string;
    }
  | {
      ok: false;
      reason: string;
      signupUrl?: string;
      instructions?: string;
      missing?: { token: boolean; org: boolean; project: boolean };
      message?: string;
    };

type BundleResponse =
  | {
      ok: true;
      routes: { path: string; sizeKb: number }[];
      totalRoutes?: number;
    }
  | { ok: false; reason: string; message?: string };

// ---------------------------------------------------------------------------
// Fetch helpers — appellent les routes internes en absolu (auth via cookies)
// ---------------------------------------------------------------------------

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function fetchInternal<T>(pathname: string): Promise<T | null> {
  try {
    const origin = await originUrl();
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const res = await fetch(`${origin}${pathname}`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    if (!res.ok && res.status !== 200) {
      // 401 / 503 retournent un JSON exploitable
      try {
        return (await res.json()) as T;
      } catch {
        return null;
      }
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

function groupResults(results: PsiResult[]) {
  const byUrl = new Map<string, { mobile?: PsiResult; desktop?: PsiResult }>();
  for (const r of results) {
    const entry = byUrl.get(r.url) ?? {};
    entry[r.strategy] = r;
    byUrl.set(r.url, entry);
  }
  return Array.from(byUrl.entries()).map(([url, strategies]) => ({ url, strategies }));
}

function urlLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

function SectionHeader({
  eyebrow,
  title,
  Icon,
}: {
  eyebrow: string;
  title: string;
  Icon: typeof Gauge;
}) {
  return (
    <header className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[#3D4F63]/10 text-[#3D4F63]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B8865A]">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl font-bold text-[#3D4F63]">{title}</h2>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPerformancePage() {
  const [psi, sentry, bundle] = await Promise.all([
    fetchInternal<PsiResponse>("/api/admin/performance/psi"),
    fetchInternal<SentryResponse>("/api/admin/performance/sentry"),
    fetchInternal<BundleResponse>("/api/admin/performance/bundle"),
  ]);

  const psiOk = psi && psi.ok;
  const psiResults = psiOk ? psi.results : [];
  const psiGroups = groupResults(psiResults);

  return (
    <div className="space-y-12">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Performance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">
          PageSpeed Insights, Web Vitals, taille des bundles et erreurs runtime.
          Données rafraîchies à chaque visite (cache 10 min côté PSI).
        </p>
      </header>

      {/* ---------------------------------------- 1. PSI Mobile vs Desktop */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section 1" title="PageSpeed Insights" Icon={Gauge} />

        {!psi ? (
          <p className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6 text-sm text-[#3D4F63]/70">
            Impossible de joindre l&apos;API PSI interne. Vérifier la session admin.
          </p>
        ) : !psiOk ? (
          <p className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6 text-sm text-[#3D4F63]/70">
            PSI indisponible — {"reason" in psi ? psi.reason : "erreur inconnue"}.
          </p>
        ) : (
          <div className="space-y-8">
            {psiGroups.map(({ url, strategies }) => (
              <article
                key={url}
                className="rounded-lg border border-[#3D4F63]/15 bg-white p-6"
              >
                <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                      URL testée
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
                      {urlLabel(url)}
                    </h3>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8865A] hover:underline"
                  >
                    {url}
                  </a>
                </header>

                {(["mobile", "desktop"] as const).map((strategy) => {
                  const r = strategies[strategy];
                  return (
                    <div key={strategy} className="mb-6 last:mb-0">
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                        Stratégie : {strategy}
                      </p>
                      {!r ? (
                        <p className="text-sm text-[#3D4F63]/60">
                          Pas de données.
                        </p>
                      ) : (
                        <>
                          {r.error ? (
                            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#dc2626]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#dc2626]">
                              Erreur PSI : {r.error}
                            </p>
                          ) : null}
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <ScoreCard label="Performance" score={r.scores.performance} />
                            <ScoreCard label="Accessibilité" score={r.scores.accessibility} />
                            <ScoreCard label="SEO" score={r.scores.seo} />
                            <ScoreCard label="Best Practices" score={r.scores.bestPractices} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------- 2. Web Vitals tableau */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section 2" title="Web Vitals" Icon={Activity} />

        <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
          {!psiOk || psiResults.length === 0 ? (
            <p className="text-sm text-[#3D4F63]/60">
              Données indisponibles — réessayer dans 10 minutes ou configurer PSI_API_KEY.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#3D4F63]/15">
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      URL
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      Stratégie
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      LCP
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      FID
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      CLS
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      FCP
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                      TTFB
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {psiResults.map((r, i) => (
                    <tr
                      key={`${r.url}-${r.strategy}-${i}`}
                      className="border-b border-[#3D4F63]/10 last:border-0"
                    >
                      <td className="px-3 py-3 font-mono text-xs text-[#1A1F2A]">
                        {urlLabel(r.url)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs uppercase tracking-[0.15em] text-[#3D4F63]/70">
                        {r.strategy}
                      </td>
                      <td className="px-3 py-3">
                        <WebVitalBadge metric="lcp" value={r.webVitals.lcp} />
                      </td>
                      <td className="px-3 py-3">
                        <WebVitalBadge metric="fid" value={r.webVitals.fid} />
                      </td>
                      <td className="px-3 py-3">
                        <WebVitalBadge metric="cls" value={r.webVitals.cls} />
                      </td>
                      <td className="px-3 py-3">
                        <WebVitalBadge metric="fcp" value={r.webVitals.fcp} />
                      </td>
                      <td className="px-3 py-3">
                        <WebVitalBadge metric="ttfb" value={r.webVitals.ttfb} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                Seuils Google : LCP &lt;2,5 s vert · CLS &lt;0,1 vert · FID &lt;100 ms vert
              </p>
            </div>
          )}
        </article>
      </section>

      {/* ---------------------------------------- 3. Bundle size */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section 3" title="Bundle size · Top 10 routes" Icon={Package} />

        <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
          {!bundle ? (
            <p className="text-sm text-[#3D4F63]/60">
              API bundle injoignable.
            </p>
          ) : !bundle.ok ? (
            <p className="rounded-md border border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-4 text-sm text-[#3D4F63]/70">
              {bundle.reason === "no_build"
                ? "Aucun build trouvé — lancer pnpm build d'abord."
                : bundle.message ?? bundle.reason}
            </p>
          ) : (
            <>
              <BundleSizeList routes={bundle.routes} />
              {bundle.totalRoutes && bundle.totalRoutes > bundle.routes.length ? (
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                  {bundle.totalRoutes} routes analysées · top 10 affiché
                </p>
              ) : null}
            </>
          )}
        </article>
      </section>

      {/* ---------------------------------------- 4. Sentry */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section 4" title="Monitoring erreurs" Icon={ShieldCheck} />

        {!sentry ? (
          <p className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6 text-sm text-[#3D4F63]/70">
            API Sentry interne injoignable.
          </p>
        ) : !sentry.ok ? (
          <SentryNotConfiguredCard
            signupUrl={sentry.signupUrl}
            instructions={sentry.instructions}
            missing={sentry.missing}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Erreurs 24 h
                </p>
                <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
                  {sentry.last24h.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Erreurs totales
                </p>
                <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
                  {sentry.errorsCount.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Issues non résolues
                </p>
                <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
                  {sentry.unresolvedCount.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>

            <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
              <header className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Top issues · non résolues
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                  {sentry.org && sentry.project
                    ? `${sentry.org}/${sentry.project}`
                    : "Issues récentes"}
                </h3>
              </header>
              {sentry.topIssues.length === 0 ? (
                <p className="text-sm text-[#3D4F63]/60">
                  Aucune issue active — site stable.
                </p>
              ) : (
                <ol className="divide-y divide-[#3D4F63]/10">
                  {sentry.topIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        {issue.permalink ? (
                          <a
                            href={issue.permalink}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block truncate font-sans text-sm text-[#1A1F2A] hover:text-[#B8865A]"
                          >
                            {issue.title}
                          </a>
                        ) : (
                          <span className="block truncate font-sans text-sm text-[#1A1F2A]">
                            {issue.title}
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                          {issue.shortId ?? issue.id} · {issue.level ?? "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold text-[#3D4F63]">
                          {issue.count ?? "—"}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                          {issue.userCount ?? 0} users
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

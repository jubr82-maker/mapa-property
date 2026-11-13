// Controle quotidien du site et de Google (nov. 2026) : traduction des
// statuts Google, classement en trois categories, reprise apres le budget
// de temps (270 s), verrou, compteur de limite Google, comportement sans
// base prete et sans cle Google. Sans reseau : site et Google simules.
// Lancement : node --import tsx scripts/test-controle.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Base injoignable et aucune cle Google : conditions "base pas prete" et
// "sans cle", quelles que soient les variables du poste.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
delete process.env.GA4_SERVICE_ACCOUNT_KEY;

const core = await import("../lib/pilotage/controle-core");
const cfg = await import("../lib/pilotage/config");
const { stepSite, newSiteCursor, legacyPaths, keyPaths } = await import("../lib/pilotage/controle-site");
const { stepGoogle, newGoogleCursor, googleConfigured, googleQuotaDay } = await import("../lib/pilotage/controle-google");
const { groupResults } = await import("../lib/pilotage/controle-view");

const root = join(import.meta.dirname, "..");
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};

// --- Site simule ----------------------------------------------------------
const B = "https://mapaproperty.lu";
const page = (path: string, o: { title?: string; desc?: string; canonical?: string; noindex?: boolean; h1?: number; links?: string[]; imgNoAlt?: boolean; jsonld?: string; hreflang?: boolean } = {}) => {
  const alt = (l: string) => `${B}/${l}${path.replace(/^\/(fr|en|de)/, "")}`;
  const hl = o.hreflang === false ? "" : ["fr", "en", "de"].map((l) => `<link rel="alternate" hrefLang="${l}" href="${alt(l)}"/>`).join("") + `<link rel="alternate" hrefLang="x-default" href="${alt("fr")}"/>`;
  return `<!doctype html><html><head><title>${o.title ?? `Titre de la page ${path} pour le test`}</title>${o.desc === "" ? "" : `<meta name="description" content="${o.desc ?? `Description ${path}`}"/>`}${o.noindex ? '<meta name="robots" content="noindex"/>' : ""}<link rel="canonical" href="${o.canonical ?? B + path}"/>${hl}${o.jsonld ? `<script type="application/ld+json">${o.jsonld}</script>` : ""}</head><body>${"<h1>T</h1>".repeat(o.h1 ?? 1)}${o.imgNoAlt ? '<img src="/a.jpg">' : '<img src="/a.jpg" alt="">'}${(o.links ?? []).map((l) => `<a href="${l}">x</a>`).join("")}</body></html>`;
};
const LANG_PAGES = ["/fr", "/en", "/de", "/fr/a", "/en/a", "/de/a"];
const common = ["/fr", "/en", "/de", "/fr/a", "/en/a", "/de/a"];
const SITE: Record<string, { status: number; body?: string; location?: string; type?: string }> = {
  "/robots.txt": { status: 200, type: "text/plain", body: `User-agent: *\nAllow: /\nSitemap: ${B}/sitemap.xml\n` },
  "/sitemap.xml": { status: 200, type: "application/xml", body: `<sitemapindex><sitemap><loc>${B}/sitemaps/pages.xml</loc></sitemap></sitemapindex>` },
  "/sitemaps/pages.xml": { status: 200, type: "application/xml", body: `<urlset>${[...LANG_PAGES, "/fr/b", "/fr/c", "/fr/old"].map((p) => `<url><loc>${B}${p}</loc></url>`).join("")}</urlset>` },
  "/fr/b": { status: 200, body: page("/fr/b", { title: "Titre de la page /fr/a pour le test", h1: 2, imgNoAlt: true, jsonld: "{pas du json", links: common.concat(["/fr/casse"]), hreflang: false }) },
  "/fr/c": { status: 200, body: page("/fr/c", { noindex: true }) },
  "/fr/old": { status: 301, location: `${B}/fr/a` },
  "/fr/agence": { status: 301, location: `${B}/fr/qui-sommes-nous` },
  "/fr/qui-sommes-nous": { status: 200, body: page("/fr/qui-sommes-nous", { links: common }) },
  "/fr/casse": { status: 404 },
};
for (const p of LANG_PAGES) SITE[p] = { status: 200, body: page(p, { links: common.filter((x) => x !== p) }) };

let calls = 0;
const fakeFetch = (async (input: string | URL | Request) => {
  calls++;
  const u = new URL(String(input));
  const hit = SITE[u.pathname] ?? { status: 404, body: "<html><head><title>Introuvable</title></head><body><h1>404</h1></body></html>" };
  const headers = new Headers({ "content-type": hit.type ?? "text/html; charset=utf-8" });
  if (hit.location) headers.set("location", hit.location);
  return new Response(hit.status >= 300 && hit.status < 400 ? null : hit.body ?? "", { status: hit.status, headers });
}) as typeof fetch;

async function fullSiteRun(deadlines: number[]) {
  const all: { url: string; key: string }[] = [];
  let c = newSiteCursor(B);
  let steps = 0;
  for (;;) {
    const deadline = deadlines[steps] ?? Date.now() + 60_000;
    steps++;
    const r = await stepSite(c, deadline, async (f) => void all.push(...f.map((x) => ({ url: x.url, key: x.key }))), fakeFetch);
    // Le point de reprise passe par la base (JSON) entre deux passages.
    c = JSON.parse(JSON.stringify(r.cursor));
    if (r.done) return { all, steps, cursor: c };
    assert.equal(r.stoppedBy, "time");
  }
}

await test("traduction des statuts Google : enumerations et etats de couverture", () => {
  const k = core.googleStatusKey;
  assert.equal(k({ verdict: "PASS", coverageState: "Submitted and indexed" }), "g_indexed");
  assert.equal(k({ verdict: "PASS", googleCanonical: `${B}/fr/x`, userCanonical: `${B}/fr/y` }), "g_canonical_other");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" }), "g_pending_discovered");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }), "g_pending_crawled");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "URL is unknown to Google" }), "g_pending_unknown");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Duplicate, Google chose different canonical than user" }), "g_canonical_other");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Alternate page with proper canonical tag" }), "g_alternate");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Page with redirect" }), "g_redirect");
  assert.equal(k({ verdict: "FAIL", indexingState: "BLOCKED_BY_META_TAG" }), "g_noindex");
  assert.equal(k({ verdict: "FAIL", robotsTxtState: "DISALLOWED" }), "g_robots");
  assert.equal(k({ verdict: "FAIL", pageFetchState: "NOT_FOUND" }), "g_not_found");
  assert.equal(k({ verdict: "FAIL", pageFetchState: "SOFT_404" }), "g_soft404");
  assert.equal(k({ verdict: "FAIL", pageFetchState: "SERVER_ERROR" }), "g_server_error");
  assert.equal(k({ verdict: "FAIL", pageFetchState: "ACCESS_FORBIDDEN" }), "g_access");
  assert.equal(k({ verdict: "NEUTRAL", coverageState: "Something new from Google" }), "g_pending_other");
});

await test("chaque constat a un intitule et une explication en fr, en et de, sans tiret long", () => {
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(readFileSync(join(root, "messages", `${l}.json`), "utf8")) as Record<string, Record<string, string>>;
    for (const key of Object.keys(core.CHECK_CATEGORY)) {
      for (const p of ["label_", "check_"]) {
        assert.ok(m.admin_controle[`${p}${key}`], `${l} ${p}${key}`);
        assert.ok(!/[–—]/.test(m.admin_controle[`${p}${key}`]), `${l} ${p}${key} : tiret`);
      }
    }
    for (const v of Object.values(m.admin_controle)) assert.ok(!/[–—]/.test(v), `${l} : ${v}`);
    assert.ok(m.admin_nav.google_control);
  }
});

await test("classement en trois categories : A corriger, En attente de Google, Normal", () => {
  for (const c of Object.values(core.CHECK_CATEGORY)) assert.ok(core.CATEGORIES.includes(c));
  assert.equal(core.categoryOf("http_error"), "a_corriger");
  assert.equal(core.categoryOf("g_pending_crawled"), "attente_google");
  assert.equal(core.categoryOf("legacy_ok"), "normal");
  assert.equal(core.categoryOf("g_dropped"), "a_corriger");
  const g = groupResults([
    { run_id: 1, url: "u1", check_key: "http_error", category: "a_corriger", explanation: "e", details: {} },
    { run_id: 1, url: "u2", check_key: "http_error", category: "a_corriger", explanation: "e", details: {} },
    { run_id: 1, url: "u3", check_key: "g_pending_unknown", category: "attente_google", explanation: "e", details: {} },
    { run_id: 1, url: "u4", check_key: "page_ok", category: "normal", explanation: "e", details: {} },
  ]);
  assert.deepEqual(g.counts, { a_corriger: 2, attente_google: 1, normal: 1 });
  assert.equal(g.zones.a_corriger[0].count, 2);
});

await test("controle du site : constats attendus sur un site simule", async () => {
  const { all } = await fullSiteRun([]);
  const has = (path: string, key: string) => all.some((f) => f.url === `${B}${path}` && f.key === key);
  assert.ok(has("/robots.txt", "robots_ok"));
  assert.ok(all.some((f) => f.key === "notfound_ok"));
  assert.ok(all.some((f) => f.key === "host_redirect_bad"), "www et http verifies (site simule sans redirection)");
  assert.ok(has("/fr/old", "sitemap_redirect"));
  assert.ok(has("/fr/c", "noindex_in_sitemap"));
  assert.ok(has("/fr/b", "h1_count") && has("/fr/b", "img_no_alt") && has("/fr/b", "jsonld_invalid") && has("/fr/b", "hreflang_missing"));
  assert.ok(has("/fr/b", "title_duplicate") && has("/fr/a", "title_duplicate"));
  assert.ok(has("/fr/b", "broken_link"));
  assert.ok(has("/fr/b", "weak_inbound"), "personne ne pointe vers /fr/b");
  assert.ok(has("/fr", "page_ok") || !has("/fr", "weak_inbound"));
  assert.ok(has("/fr/agence", "legacy_ok"));
  assert.ok(all.some((f) => f.key === "legacy_broken"));
  assert.equal(new Set(all.filter((f) => f.key !== "broken_link").map((f) => `${f.url}|${f.key}`)).size, all.filter((f) => f.key !== "broken_link").length, "aucun constat en double");
  assert.ok(keyPaths().includes("/fr/biens") && legacyPaths().includes("/en/legals/fees"));
});

await test("reprise apres le budget de temps : arret propre, point de reprise, meme resultat", async () => {
  assert.equal(cfg.CONTROLE_TIME_BUDGET_MS, 270_000);
  // runWithBudget : aucun lot lance apres l'echeance.
  let t = 0;
  const seen: number[] = [];
  const r1 = await core.runWithBudget([1, 2, 3, 4, 5, 6, 7], 0, async (x) => { seen.push(x); t += 100; }, { concurrency: 2, deadline: 250, now: () => t });
  assert.deepEqual(r1, { next: 4, done: false, stoppedBy: "time" });
  const r2 = await core.runWithBudget([1, 2, 3, 4, 5, 6, 7], r1.next, async (x) => { seen.push(x); }, { concurrency: 2, deadline: Infinity, now: () => t });
  assert.deepEqual(r2, { next: 7, done: true, stoppedBy: null });
  assert.deepEqual(seen, [1, 2, 3, 4, 5, 6, 7], "chaque element une seule fois");
  // Controle du site interrompu a chaque etape : meme resultat qu'en une fois.
  const once = await fullSiteRun([]);
  const cut = await fullSiteRun([Date.now() - 1, Date.now() - 1, Date.now() - 1]);
  assert.ok(cut.steps >= 3, "le controle s'est bien arrete puis a repris");
  const norm = (a: { url: string; key: string }[]) => a.map((f) => `${f.url}|${f.key}`).sort();
  assert.deepEqual(norm(cut.all), norm(once.all));
  // Routes planifiees : budget 270 s, maxDuration 300, une fois par jour.
  for (const k of ["site", "google"]) {
    const src = readFileSync(join(root, "app", "api", "cron", `controle-${k}`, "route.ts"), "utf8");
    assert.ok(src.includes("maxDuration = 300") && src.includes("CONTROLE_TIME_BUDGET_MS") && src.includes("isAuthorizedCron(req)") && src.includes(`recordCronRun("controle_${k}"`), k);
  }
  const crons = (JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
  assert.equal(crons.find((c) => c.path === "/api/cron/controle-site")?.schedule, "0 2 * * *");
  assert.equal(crons.find((c) => c.path === "/api/cron/controle-google")?.schedule, "0 3 * * *");
  for (const c of crons) assert.match(c.schedule, /^\d+ \d+ \* \* \*$/, `${c.path} : une fois par jour au plus (plan Hobby)`);
});

await test("verrou : un seul controle a la fois, verrou expire repris", () => {
  const now = Date.parse("2026-11-13T02:00:00Z");
  assert.equal(core.lockAvailable(null, "a", now), true);
  assert.equal(core.lockAvailable({ holder: "b", lockedUntil: "2026-11-13T02:03:00Z" }, "a", now), false);
  assert.equal(core.lockAvailable({ holder: "b", lockedUntil: "2026-11-13T01:59:00Z" }, "a", now), true);
  assert.equal(core.lockAvailable({ holder: "a", lockedUntil: "2026-11-13T02:03:00Z" }, "a", now), true);
  const sql = readFileSync(join(root, "supabase", "sql", "39_controle_quotidien.sql"), "utf8");
  // Meme regle en base (atomique) : prise seulement si libre, expire ou meme detenteur.
  assert.ok(/WHERE l\.locked_until < now\(\) OR l\.holder = EXCLUDED\.holder/.test(sql));
  const run = readFileSync(join(root, "lib", "pilotage", "controle-run.ts"), "utf8");
  assert.ok(/if \(!\(await tryLock\(holder, CONTROLE_LOCK_SECONDS\)\)\) return \{ ok: false, detail: "busy" \}/.test(run));
  assert.ok(/finally \{\s*await releaseLock\(holder\)/.test(run), "verrou libere meme en cas d'erreur");
});

await test("compteur Google : arret net avant la limite du jour, rythme sous 600 par minute", async () => {
  assert.ok(cfg.GOOGLE_INSPECTION_DAILY_STOP < cfg.GOOGLE_INSPECTION_DAILY_LIMIT && cfg.GOOGLE_INSPECTION_DAILY_LIMIT === 2000);
  assert.ok(cfg.GOOGLE_INSPECTION_PER_MINUTE < cfg.GOOGLE_INSPECTION_MINUTE_LIMIT && cfg.GOOGLE_INSPECTION_MINUTE_LIMIT === 600);
  assert.equal(cfg.CONTROLE_GOOGLE_CONCURRENCY, 5);
  assert.equal(core.quotaGrant(1948, 5, 1950), 2);
  assert.equal(core.quotaGrant(1950, 5, 1950), 0);
  assert.equal(core.quotaGrant(10, 5, 1950), 5);
  assert.equal(core.minIntervalMs(500), 120);
  assert.match(googleQuotaDay(new Date("2026-11-13T07:30:00Z")), /^2026-11-12$/, "jour du Pacifique");
  // Etape Google simulee : 7 inspections permises, 10 adresses.
  let left = 7;
  let inspected = 0;
  const c = newGoogleCursor();
  c.phase = "inspect";
  c.urls = Array.from({ length: 10 }, (_, i) => `${B}/fr/p${i}`);
  const r = await stepGoogle(c, Date.now() + 60_000, async () => undefined, {
    takeQuota: async (want) => {
      const g = core.quotaGrant(7 - left, want, 7);
      left -= g;
      return g;
    },
    previousKeys: async () => new Map(),
    inspect: async () => {
      inspected++;
      return { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } };
    },
  });
  assert.equal(inspected, 7, "jamais au-dela du compteur");
  assert.equal(r.done, false);
  assert.equal(r.stoppedBy, "limit");
  assert.equal(r.cursor.i, 7, "reprise a la 8e adresse");
  assert.equal(r.cursor.counts.indexed, 7);
});

await test("pages sorties de l'index et pages a soumettre, par importance", () => {
  const prev = new Map<string, import("../lib/pilotage/controle-core").CheckKey>([[`${B}/fr/a`, "g_indexed"], [`${B}/fr/b`, "g_pending_crawled"]]);
  const cur = new Map<string, import("../lib/pilotage/controle-core").CheckKey>([[`${B}/fr/a`, "g_pending_crawled"], [`${B}/fr/b`, "g_pending_crawled"]]);
  assert.deepEqual(core.droppedFromIndex(prev, cur), [`${B}/fr/a`]);
  const sorted = core.sortForSubmission([{ url: `${B}/fr/biens/maison-1` }, { url: `${B}/fr/villes/mamer` }, { url: `${B}/de/services/vendre` }, { url: `${B}/fr` }, { url: `${B}/fr/blog/x` }]);
  assert.deepEqual(sorted.map((x) => x.url), [`${B}/fr`, `${B}/de/services/vendre`, `${B}/fr/villes/mamer`, `${B}/fr/biens/maison-1`, `${B}/fr/blog/x`]);
});

await test("bouton Search Console : accueil de la propriete, copie de l'adresse, secours si refus", async () => {
  // Pas d'adresse directe d'inspection (le parametre id de Google est un jeton interne).
  assert.equal(cfg.SEARCH_CONSOLE_HOME, "https://search.google.com/search-console?resource_id=sc-domain%3Amapaproperty.lu");
  assert.equal("searchConsoleInspectLink" in cfg, false);
  const { copyText } = await import("../lib/pilotage/copy-address");
  const url = `${B}/fr/villes/mamer?x=1`;
  let copied = "";
  assert.equal(await copyText(url, { clipboard: { writeText: async (t) => void (copied = t) }, legacyCopy: () => false }), true, "presse-papiers si l'ancienne methode echoue");
  assert.equal(copied, url, "adresse complete copiee");
  let legacy = "";
  let modernCalled = false;
  const p = copyText(url, { clipboard: { writeText: async () => void (modernCalled = true) }, legacyCopy: (t) => ((legacy = t), true) });
  assert.equal(legacy, url, "ancienne methode lancee tout de suite, pendant le clic");
  assert.equal(await p, true);
  assert.equal(modernCalled, false);
  assert.equal(await copyText(url, { clipboard: { writeText: async () => Promise.reject(new Error("NotAllowed")) }, legacyCopy: () => false }), false, "refus : adresse affichee a la main");
  assert.equal(await copyText(url, { clipboard: null, legacyCopy: () => { throw new Error("x"); } }), false);
  // Plus aucune construction de l'ancienne adresse inspect?...&id= dans le code, l'e-mail ou les messages.
  const files = ["lib/pilotage/config.ts", "lib/pilotage/controle-view.ts", "lib/pilotage/controle-run.ts", "app/admin/controle-google/page.tsx", "components/admin/pilotage/CopyOpenSearchConsole.tsx", "messages/fr.json", "messages/en.json", "messages/de.json"];
  for (const f of files) assert.equal(/search-console\/inspect/.test(readFileSync(join(root, f), "utf8")), false, f);
  const fr = JSON.parse(readFileSync(join(root, "messages", "fr.json"), "utf8")) as Record<string, Record<string, string>>;
  assert.equal(fr.admin_controle.submit_button, "Copier et ouvrir Search Console");
  assert.equal(fr.admin_controle.submit_copied, "Adresse copiée : collez-la dans la barre du haut de Search Console");
  const page = readFileSync(join(root, "components/admin/pilotage/CopyOpenSearchConsole.tsx"), "utf8");
  assert.match(page, /href=\{SEARCH_CONSOLE_HOME\}/);
  assert.match(page, /target="_blank"/);
});

await test("crawl-maillage : option IGNORER_ROBOTS=1 documentee et lue", () => {
  const src = readFileSync(join(root, "scripts/seo/crawl-maillage.mjs"), "utf8");
  const head = src.slice(0, src.indexOf("import "));
  assert.match(head, /IGNORER_ROBOTS=1/);
  assert.match(src, /process\.env\.IGNORER_ROBOTS === "1"/);
  assert.match(src, /IGNORE_ROBOTS \? \(\) => false : await loadRobots\(\)/);
});

await test("sans base prete : aucun plantage, message SQL 39 ; sans cle Google : arret propre", async () => {
  const { runControle } = await import("../lib/pilotage/controle-run");
  const { loadControleView } = await import("../lib/pilotage/controle-view");
  for (const kind of ["site", "google"] as const) {
    const r = await runControle(kind, { trigger: "test", budgetMs: 5_000 });
    assert.deepEqual(r, { ok: false, detail: "db_not_ready" }, kind);
  }
  const v = await loadControleView();
  assert.equal(v.ready, false);
  const fr = JSON.parse(readFileSync(join(root, "messages", "fr.json"), "utf8")) as Record<string, Record<string, string>>;
  assert.equal(fr.admin_controle.db_not_ready, "Base pas encore prête, fichier SQL 39 à exécuter.");
  const pageSrc = readFileSync(join(root, "app", "admin", "controle-google", "page.tsx"), "utf8");
  assert.ok(pageSrc.includes('t("db_not_ready")'));
  // Sans cle : le controle Google s'arrete avant toute requete Google, le site non.
  assert.equal(googleConfigured(), false);
  const run = readFileSync(join(root, "lib", "pilotage", "controle-run.ts"), "utf8");
  assert.ok(/kind === "google" && !googleConfigured\(\)[\s\S]{0,200}state: "no_key"/.test(run));
  const before = calls;
  const { all } = await fullSiteRun([]);
  assert.ok(all.length > 0 && calls > before, "controle du site sans cle Google");
});

await test("correctifs du controle neutre : reprise sans doublon, echec d'inspection, domaine de la canonical, X-Robots-Tag", async () => {
  // Point de reprise enregistre apres chaque lot.
  const saved: number[] = [];
  let c = newSiteCursor(B);
  const first = await stepSite(c, Date.now() + 60_000, async () => undefined, fakeFetch, async (cur) => void saved.push(cur.phase === "pages" ? cur.i : -1));
  assert.ok(first.done && saved.length >= 2 && saved.filter((x) => x >= 0).every((x, i, a) => i === 0 || x > a[i - 1]), "un point de reprise par lot");
  c = first.cursor;
  // Une inspection en echec n'est jamais une sortie de l'index.
  const prev = new Map<string, import("../lib/pilotage/controle-core").CheckKey>([[`${B}/fr/a`, "g_indexed"]]);
  assert.deepEqual(core.droppedFromIndex(prev, new Map([[`${B}/fr/a`, "g_inspect_failed"]])), []);
  // Canonical sur un autre domaine : pas elle-meme.
  const facts = core.parsePage(page("/fr/a", { canonical: "https://www.mapaproperty.lu/fr/a" }));
  assert.ok(core.pageFindings(`${B}/fr/a`, "/fr/a", facts, true, { min: 15, max: 65 }, [B]).some((f) => f.key === "canonical_other"));
  assert.ok(!core.pageFindings(`${B}/fr/a`, "/fr/a", core.parsePage(page("/fr/a")), true, { min: 15, max: 65 }, [B]).some((f) => f.key === "canonical_other"));
  // noindex par en-tete HTTP.
  const src = readFileSync(join(root, "lib/pilotage/controle-site.ts"), "utf8");
  assert.ok(/x-robots-tag/.test(src) && /noindex\/i\.test\(res\.robotsHeader/.test(src));
  // Reprise : un passage en pause est repris par la tache du lendemain et par un clic.
  const store = readFileSync(join(root, "lib/pilotage/controle-store.ts"), "utf8");
  assert.ok(/RESUME_MAX_AGE_MS = 50 \* 3600_000/.test(store));
  const action = readFileSync(join(root, "app/admin/pilotage-actions.ts"), "utf8");
  assert.ok(/forceNew: false/.test(action));
});

await test("requetes sans en-tete identifiant, jamais l'Indexing API", () => {
  for (const f of ["lib/pilotage/controle-site.ts", "lib/pilotage/controle-google.ts", "lib/google/search-console.ts"]) {
    const src = readFileSync(join(root, f), "utf8");
    assert.ok(!/user-agent/i.test(src.replace(/\/\/.*$/gm, "")), `${f} : User-Agent`);
    assert.ok(!/indexing\.googleapis|urlNotifications/i.test(src), `${f} : Indexing API`);
    assert.ok(!/mapagroup|@mapa|bazdiv/i.test(src), `${f} : identifiant`);
  }
  const sa = readFileSync(join(root, "lib/google/service-account.ts"), "utf8");
  assert.ok(sa.includes('SCOPE_SEARCH_CONSOLE = "https://www.googleapis.com/auth/webmasters.readonly"'), "lecture seule");
});

console.log(`${pass} PASS, 0 FAIL`);
process.exit(0);

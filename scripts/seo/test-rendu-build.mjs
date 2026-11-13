// Rendu du BUILD COMPILE (.next), dans les memes conditions que
// "pnpm start" (nov. 2026, correctifs apres test reel du chantier SEO).
//
// Le 13/11/2026, le serveur qui repondait sur le port 3005 n'etait pas le
// build du dernier commit : le dernier "pnpm start -p 3005" avait echoue
// (port deja pris, cf. /tmp/mapa-3005.log) et une ancienne instance
// repondait. Ce script evite les deux pieges :
//   1. sans option : charge .next avec le serveur Next lui-meme (meme code
//      que next start), sans ouvrir de port, et verifie les pages ;
//   2. --url http://localhost:3005 : interroge ce serveur, verifie qu'il sert
//      bien le build present sur le disque (meme identifiant), puis les
//      memes pages. Echoue si le serveur sert un autre build.
// Requetes sans en-tete identifiant.
//
// Lancement : pnpm build, puis
//   node scripts/seo/test-rendu-build.mjs
//   node scripts/seo/test-rendu-build.mjs --url http://localhost:3005
// Articles lies : verifies seulement si la base est joignable (sinon SKIP
// annonce, jamais un faux PASS).
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import http from "node:http";
import { Duplex } from "node:stream";
import { createRequire } from "node:module";

const root = join(import.meta.dirname, "..", "..");
const urlArg = process.argv.indexOf("--url");
const base = urlArg > 0 ? process.argv[urlArg + 1]?.replace(/\/$/, "") : null;
const buildIdFile = join(root, ".next", "BUILD_ID");
if (!existsSync(buildIdFile)) {
  console.error("FAIL aucun build (.next/BUILD_ID absent) : lancer pnpm build");
  process.exit(1);
}
const diskBuildId = readFileSync(buildIdFile, "utf8").trim();

let pass = 0;
let skip = 0;
const test = async (name, fn) => {
  const r = await fn();
  if (r === "skip") {
    skip++;
    return;
  }
  pass++;
  console.log(`PASS ${name}`);
};

// Le build doit etre posterieur au dernier commit (sinon il ne contient pas
// le code verifie).
await test("le build sur le disque est posterieur au dernier commit", () => {
  const commit = Number(execFileSync("git", ["log", "-1", "--format=%ct"], { cwd: root }).toString().trim()) * 1000;
  const built = statSync(buildIdFile).mtimeMs;
  assert.ok(built >= commit, "build plus ancien que le dernier commit : relancer pnpm build");
  // Fichiers du site modifies depuis le dernier commit (pas encore commites).
  const changed = execFileSync("git", ["status", "--porcelain", "--", "app", "lib", "components", "messages", "proxy.ts", "next.config.ts", "i18n"], { cwd: root })
    .toString()
    .split("\n")
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter((f) => f && existsSync(join(root, f)) && statSync(join(root, f)).isFile());
  const newer = changed.filter((f) => statSync(join(root, f)).mtimeMs > built);
  assert.deepEqual(newer, [], `fichiers modifies apres le build : relancer pnpm build (${newer.join(", ")})`);
});

// --- Obtention d'une page --------------------------------------------------
let render;
if (base) {
  render = async (path) => {
    const r = await fetch(base + path, { redirect: "manual" });
    return { status: r.status, html: await r.text() };
  };
} else {
  process.chdir(root);
  const require = createRequire(import.meta.url);
  const next = require(join(root, "node_modules", "next"));
  const app = next({ dev: false, dir: root, hostname: "localhost", port: 3000 });
  await app.prepare();
  const handle = app.getRequestHandler();
  render = async (path) => {
    const out = [];
    const sock = new Duplex({ read() {}, write(c, _e, cb) { out.push(Buffer.from(c)); cb(); } });
    Object.assign(sock, { remoteAddress: "127.0.0.1", encrypted: false, setTimeout() {}, setNoDelay() {}, setKeepAlive() {}, destroySoon() {} });
    const req = new http.IncomingMessage(sock);
    req.method = "GET";
    req.url = path;
    req.headers = { host: "localhost:3000", accept: "text/html" };
    req.push(null);
    const res = new http.ServerResponse(req);
    res.assignSocket(sock);
    await new Promise((done) => {
      const t = setTimeout(done, 30000);
      res.on("finish", () => { clearTimeout(t); done(); });
      handle(req, res).catch(() => done());
    });
    const raw = Buffer.concat(out).toString();
    return { status: res.statusCode, html: raw.slice(raw.indexOf("\r\n\r\n") + 4) };
  };
}

const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim();
const pick = (html) => ({
  title: text((html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? ""),
  h1: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])),
  description: (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? "",
  canonical: (html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? "",
  hreflang: Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])),
  buildId: (html.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})\\?"/) ?? [])[1] ?? null,
});

if (base) {
  await test(`le serveur ${base} sert le build present sur le disque (${diskBuildId})`, async () => {
    const p = pick((await render("/fr")).html);
    assert.equal(p.buildId, diskBuildId, `le serveur sert le build ${p.buildId} : ce n'est pas le dernier build (ancienne instance encore active ?)`);
  });
}

// --- 1a. Pages "biens a vendre" et "biens a louer" -------------------------
const messages = (l) => JSON.parse(readFileSync(join(root, "messages", `${l}.json`), "utf8")).property_list;
for (const [locale, tx] of [["fr", "sale"], ["en", "rent"], ["fr", "rent"], ["de", "sale"]]) {
  await test(`/${locale}/biens?transaction=${tx} : title, description, H1, canonical et hreflang propres`, async () => {
    const m = messages(locale);
    const { status, html } = await render(`/${locale}/biens?transaction=${tx}`);
    assert.equal(status, 200);
    const p = pick(html);
    assert.equal(p.title, m[`seo_${tx}_title`]);
    assert.equal(p.description, m[`seo_${tx}_description`].replace(/'/g, "&#x27;"));
    assert.deepEqual(p.h1, [m[`seo_${tx}_h1`]]);
    assert.ok(p.canonical.endsWith(`/${locale}/biens?transaction=${tx}`), p.canonical);
    for (const l of ["fr", "en", "de"]) assert.ok(p.hreflang[l]?.endsWith(`/${l}/biens?transaction=${tx}`), `${l} ${p.hreflang[l]}`);
    assert.ok(p.hreflang["x-default"]?.endsWith(`/fr/biens?transaction=${tx}`));
  });
}
await test("/fr/biens et /fr/biens?transaction=sale&city=Mamer : page generale, canonical /fr/biens", async () => {
  const m = messages("fr");
  for (const path of ["/fr/biens", "/fr/biens?transaction=sale&city=Mamer"]) {
    const p = pick((await render(path)).html);
    assert.deepEqual(p.h1, [m.title], path);
    assert.ok(p.canonical.endsWith("/fr/biens"), `${path} ${p.canonical}`);
  }
});

// --- 1b. Articles lies --------------------------------------------------------
// Base joignable ? (sinon les articles repondent 404 en rendu local : SKIP).
async function baseReachable() {
  if (base) return true;
  const env = existsSync(join(root, ".env.local")) ? readFileSync(join(root, ".env.local"), "utf8") : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? (env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m) ?? [])[1]?.replace(/^"|"$/g, "");
  if (!url) return false;
  try {
    await fetch(`${url}/rest/v1/`, { signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}

await test("articles : bloc Articles lies apres la FAQ (base joignable)", async () => {
  if (!(await baseReachable())) {
    console.log("SKIP articles lies : base injoignable depuis ce poste (relancer hors bac a sable)");
    return "skip";
  }
  const list = await render("/fr/blog");
  const slugs = [...new Set([...list.html.matchAll(/href="\/fr\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  if (slugs.length < 2) {
    console.log("SKIP articles lies : moins de 2 articles lus (base injoignable depuis ce poste ?)");
    return "skip";
  }
  for (const slug of slugs) {
    const { status, html } = await render(`/fr/blog/${slug}`);
    assert.equal(status, 200, slug);
    const block = html.match(/<section[^>]*data-related-articles[\s\S]*?<\/section>/)?.[0];
    assert.ok(block, `${slug} : bloc Articles lies absent`);
    const links = [...block.matchAll(/href="\/fr\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]);
    assert.ok(links.length >= 1 && links.length <= 3 && !links.includes(slug), `${slug} : ${links.join(", ")}`);
  }
});

console.log(`${pass} PASS, 0 FAIL${skip ? `, ${skip} SKIP` : ""}`);
process.exit(0);

// Suite de securite permanente (audit oct. 2026). Une commande :
//
//   pnpm test:security
//   (= node --import tsx scripts/security/test-security.ts)
//
// Pre-requis : un build de production (npx next build --webpack) pour les
// controles du bundle client et les requetes en memoire. Aucun reseau,
// aucun port, aucune ecriture en base : les seules requetes envoyees sont
// anonymes (ou avec un faux secret) vers des routes qui refusent AVANT
// toute lecture ou ecriture, ce que la partie statique verifie aussi.
//
// Sections :
//   A. decision d'acces admin (anonyme, hors liste, sans second facteur, admin)
//   B. chaque route admin et chaque action serveur est gardee, garde en tete
//   C. taches planifiees : secret obligatoire
//   D. formulaires publics : Turnstile + limite de debit, widget cote client
//   E. en-tetes de securite (configuration)
//   F. assainissement, chemins internes, type de fichier par contenu
//   G. aucun secret dans les fichiers suivis par git
//   H. aucune cle serveur dans le build client
//   I. requetes reelles en memoire : refus anonyme, en-tetes servis
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { evaluateAdminAccess, adminPageRedirect } from "../../lib/admin/admin-access";
import { isAuthorizedCron } from "../../lib/security/cron-auth";
import {
  sanitizeArticleHtml,
  serializeJsonLd,
  sanitizeCssColorOverrides,
  safeInternalPath,
} from "../../lib/security/sanitize";
import { detectFileType } from "../../lib/security/file-type";

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ---------------------------------------------------------------------------
// Petit moteur de test : chaque controle est nomme, chaque echec explique.
// ---------------------------------------------------------------------------
type Outcome = { section: string; name: string; ok: boolean; detail?: string };
const outcomes: Outcome[] = [];
let section = "";
function check(name: string, ok: boolean, detail?: string) {
  outcomes.push({ section, name, ok, detail: ok ? undefined : detail });
}
function walk(dir: string, filter: (p: string) => boolean, out: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

/** Fonctions exportees `export async function NOM(` et leur corps. */
function exportedFunctions(src: string): { name: string; body: string }[] {
  const ms = [...src.matchAll(/export async function (\w+)\(/g)];
  return ms.map((m, i) => ({ name: m[1], body: src.slice(m.index!, ms[i + 1]?.index ?? src.length) }));
}
/** Corps d'une fonction locale `async function NOM(`. */
function localFunction(src: string, name: string): string | null {
  const i = src.search(new RegExp(`\\n(?:async )?function ${name}\\(`));
  if (i < 0) return null;
  const end = src.indexOf("\n}\n", i);
  return src.slice(i, end < 0 ? src.length : end + 3);
}
/** Index de la premiere operation sensible (donnees, stockage, envoi). */
const SENSITIVE_OP = /\.from\(|\.storage\b|\.rpc\(|uploadToR2|sendMail|revalidate(Path|Tag)\(|createClient\(|req\.(json|formData)\(\)|request\.(json|formData)\(\)|fetch\(/;
function firstIndex(body: string, re: RegExp): number {
  const m = body.match(re);
  return m?.index ?? -1;
}

// ===========================================================================
// A. Decision d'acces admin
// ===========================================================================
section = "A. Decision d'acces admin";
check("visiteur anonyme : anonymous", evaluateAdminAccess(null, null) === "anonymous");
check("compte hors liste, meme en aal2 : not_admin", evaluateAdminAccess({ email: "intrus@example.org" }, "aal2") === "not_admin");
check("compte sans e-mail : not_admin", evaluateAdminAccess({ email: null }, "aal2") === "not_admin");
check("admin sans second facteur (aal1) : mfa_required", evaluateAdminAccess({ email: "admin@mapagroup.org" }, "aal1") === "mfa_required");
check("admin, casse et espaces ignores, aal2 : admin", evaluateAdminAccess({ email: "  Admin@MapaGroup.org " }, "aal2") === "admin");
check("adresse voisine refusee", evaluateAdminAccess({ email: "admin@mapagroup.org.evil.com" }, "aal2") === "not_admin");
for (const p of ["/admin", "/admin/leads", "/admin/securite"]) {
  check(`anonyme sur ${p} : renvoye a la connexion`, adminPageRedirect(p, "anonymous")?.path === "/admin/login");
  check(`hors liste sur ${p} : renvoye a la connexion`, adminPageRedirect(p, "not_admin")?.path === "/admin/login");
  check(`aal1 sur ${p} : renvoye au second facteur`, adminPageRedirect(p, "mfa_required")?.path === "/admin/mfa");
  check(`admin aal2 sur ${p} : servi`, adminPageRedirect(p, "admin") === null);
}
check("anonyme sur /admin/mfa : renvoye a la connexion", adminPageRedirect("/admin/mfa", "anonymous")?.path === "/admin/login");
check("anonyme sur /admin/login : servi", adminPageRedirect("/admin/login", "anonymous") === null);
check("garde serveur fondee sur la meme decision", /evaluateAdminAccess\(/.test(read("lib/admin/require-admin.ts")));
check("intercepteur fonde sur la meme decision", /adminPageRedirect\(/.test(read("proxy.ts")) && /evaluateAdminAccess\(/.test(read("proxy.ts")));
{
  const sales = read("lib/admin/sales-auth.ts");
  check("garde des ventes : liste dediee + aal2", /SALES_ALLOWED_EMAILS/.test(sales) && /aal2/.test(sales));
}

// ===========================================================================
// B. Routes admin et actions serveur gardees, garde en tete
// ===========================================================================
section = "B. Gardes des routes et actions";
const GUARD_ROUTE = /requireAdminRoute\(|requireSalesAdmin\(|requireAdmin\(/;
const adminRoutes = walk("app/api/admin", (p) => p.endsWith("route.ts")).sort();
check("routes admin trouvees", adminRoutes.length > 0, "aucune route sous app/api/admin");
for (const f of adminRoutes) {
  const src = read(f);
  const local = src.match(/async function requireAdmin\([\s\S]*?\n}\n/)?.[0];
  if (local) {
    check(`${f} : garde locale deleguee a requireAdminRoute`, /requireAdminRoute\(/.test(local), "garde locale sans aal2");
  }
  for (const { name, body: exported } of exportedFunctions(src)) {
    if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(name)) continue;
    // Gestionnaire qui delegue tout a une fonction locale (return handle(req)) :
    // c'est cette fonction qui doit porter la garde.
    const delegate = exported.match(/^[^{]*\{\s*return (\w+)\(req\);\s*\}/)?.[1];
    const body = delegate ? localFunction(src, delegate) ?? exported : exported;
    const g = firstIndex(body, GUARD_ROUTE);
    const op = firstIndex(body, SENSITIVE_OP);
    check(`${f} ${name} : garde admin`, g >= 0, "aucun appel a requireAdminRoute / requireSalesAdmin");
    // Exception documentee : revalidate accepte d'abord un secret partage
    // (verifie non vide), sinon la garde admin.
    const secretFirst = /hasValidSecret/.test(body) && /secretEnv\.length > 0/.test(body);
    check(`${f} ${name} : garde avant toute operation`, g >= 0 && (op < 0 || g < op || secretFirst), `operation sensible a l'index ${op} avant la garde (${g})`);
  }
}

const GUARD_ACTION = /assertAdminAction\(|requireAdmin\(|requireAdminPage\(|requireSalesAdmin\(/;
// Parcours de connexion : publics par nature, chacun avec SON controle.
const AUTH_FLOW: Record<string, RegExp> = {
  loginAction: /captchaOk\(/,
  forgotPasswordAction: /captchaOk\(/,
  logoutAction: /signOut\(/,
  mfaStatusAction: /isAdminEmail\(/,
  mfaVerifyAction: /isAdminEmail\(/,
  enrollStartAction: /isAdminEmail\(/,
  enrollConfirmAction: /isAdminEmail\(/,
  resetPasswordAction: /isAdminEmail\(/,
};
const actionFiles = [...walk("app", (p) => /\.tsx?$/.test(p)), ...walk("lib", (p) => /\.tsx?$/.test(p)), ...walk("components", (p) => /\.tsx?$/.test(p))]
  .filter((f) => /^\s*["']use server["']/.test(read(f).slice(0, 60)))
  .sort();
check("fichiers d'actions serveur trouves", actionFiles.length > 0);
let actionCount = 0;
for (const f of actionFiles) {
  for (const { name, body } of exportedFunctions(read(f))) {
    actionCount++;
    if (AUTH_FLOW[name] && f.endsWith("auth-actions.ts")) {
      const c = firstIndex(body, AUTH_FLOW[name]);
      const op = firstIndex(body, /signInWithPassword|resetPasswordForEmail|updateUser|mfa\.(enroll|challenge|verify|unenroll)|\.from\(/);
      check(`${f} ${name} : controle propre au parcours de connexion avant toute operation`, c >= 0 && (op < 0 || c < op), `controle ${AUTH_FLOW[name]} absent ou apres l'operation`);
      continue;
    }
    const g = firstIndex(body, GUARD_ACTION);
    const op = firstIndex(body, SENSITIVE_OP);
    check(`${f} ${name} : garde admin en tete`, g >= 0 && (op < 0 || g < op), g < 0 ? "action serveur sans garde (appelable par tout visiteur)" : "operation avant la garde");
  }
}
check("actions serveur trouvees", actionCount > 0);

// ===========================================================================
// C. Taches planifiees
// ===========================================================================
section = "C. Taches planifiees";
for (const f of walk("app/api/cron", (p) => p.endsWith("route.ts")).sort()) {
  for (const { name, body } of exportedFunctions(read(f))) {
    const g = firstIndex(body, /isAuthorizedCron\(req\)/);
    const op = firstIndex(body, SENSITIVE_OP);
    check(`${f} ${name} : secret verifie avant toute operation`, g >= 0 && (op < 0 || g < op));
  }
}
{
  const saved = process.env.CRON_SECRET;
  const req = (h?: string) => new Request("https://x/api/cron/x", { headers: h ? { authorization: h } : {} });
  delete process.env.CRON_SECRET;
  check("sans CRON_SECRET : 'Bearer undefined' refuse", !isAuthorizedCron(req("Bearer undefined")));
  check("sans CRON_SECRET : sans en-tete refuse", !isAuthorizedCron(req()));
  process.env.CRON_SECRET = "secret-de-test-0123456789";
  check("bon secret accepte", isAuthorizedCron(req("Bearer secret-de-test-0123456789")));
  check("mauvais secret refuse", !isAuthorizedCron(req("Bearer secret-de-test-0123456788")));
  check("secret sans prefixe refuse", !isAuthorizedCron(req("secret-de-test-0123456789")));
  if (saved === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = saved;
}

// ===========================================================================
// D. Formulaires publics : anti-robots
// ===========================================================================
section = "D. Formulaires publics";
// Routes publiques en ecriture SANS Turnstile, par decision documentee :
// aucune donnee identifiante, aucun e-mail, aucun service facture ; limite
// de debit par IP obligatoire quand meme.
const CAPTCHA_EXEMPT: Record<string, string> = {
  "app/api/track/route.ts": "statistiques apres consentement, aucun e-mail, aucun cout",
  "app/api/track-view/route.ts": "compteur de vues, entrees bornees, aucun e-mail",
  "app/api/search-ia/route.ts": "analyse par mots-cles locale, aucun appel facture, aucune ecriture",
};
const publicWrites = walk("app/api", (p) => p.endsWith("route.ts"))
  .filter((f) => !/app\/api\/(admin|cron)\//.test(f))
  .filter((f) => /export async function (POST|PUT|PATCH|DELETE)/.test(read(f)))
  .sort();
const captchaRoutes: string[] = [];
for (const f of publicWrites) {
  const src = read(f);
  check(`${f} : limite de debit par IP`, /rateLimit\(/.test(src));
  if (CAPTCHA_EXEMPT[f]) {
    check(`${f} : exemption Turnstile justifiee et sans envoi d'e-mail`, !/sendMail|send[A-Za-z]*Emails?\(/.test(src), "une route exemptee envoie un e-mail");
    continue;
  }
  captchaRoutes.push(f);
  const WRITE = /\.insert\(|\.upsert\(|sendMail|send[A-Za-z]*Emails?\(|insert[A-Za-z]*Lead[A-Za-z]*\(/;
  if (f === "app/api/chatbot/route.ts") {
    // Conception documentee : les messages ordinaires ne creent ni lead ni
    // e-mail ; Turnstile est exige a la creation du lead (handleConsent).
    // Le cout Mistral est borne par limite par IP, plafond quotidien,
    // messages bornes et max_tokens.
    const consent = localFunction(src, "handleConsent") ?? "";
    const c = firstIndex(consent, /verifyTurnstile\(|verifyCaptchaIfConfigured\(/);
    const w = firstIndex(consent, WRITE);
    check(`${f} : Turnstile avant creation du lead`, c >= 0 && (w < 0 || c < w));
    const post = exportedFunctions(src).find((x) => x.name === "POST")?.body ?? "";
    const call = firstIndex(post, /callMistral\(/);
    check(`${f} : plafond quotidien verifie avant l'appel Mistral`, firstIndex(post, /checkDailyLimit\(/) >= 0 && firstIndex(post, /checkDailyLimit\(/) < call);
    check(`${f} : messages bornes (roles, nombre, longueur) avant l'appel Mistral`, firstIndex(post, /CHATBOT_MAX_MESSAGES/) >= 0 && firstIndex(post, /CHATBOT_MAX_MESSAGES/) < call && /m\.role === "user" \|\| m\.role === "assistant"/.test(post));
    check(`${f} : reponse Mistral bornee (max_tokens)`, /max_tokens:\s*\d+/.test(src));
    continue;
  }
  const post = exportedFunctions(src).find((x) => x.name === "POST")?.body ?? src;
  const c = firstIndex(post, /verifyTurnstile\(|verifyCaptchaIfConfigured\(/);
  const w = firstIndex(post, WRITE);
  check(`${f} : Turnstile verifie`, c >= 0, "formulaire public sans anti-robots");
  check(`${f} : Turnstile verifie avant ecriture ou envoi`, c >= 0 && (w < 0 || c < w), `operation a l'index ${w} avant la verification (${c})`);
}
{
  const clientFiles = [...walk("components", (p) => p.endsWith(".tsx")), ...walk("app", (p) => p.endsWith(".tsx"))].filter((f) => !f.includes("admin"));
  for (const route of captchaRoutes) {
    const slug = route.replace(/^app\/api\//, "").replace(/\/route\.ts$/, "");
    const re = new RegExp(`["'\`]/api/${slug}["'\`?/]`);
    for (const f of clientFiles.filter((c) => re.test(read(c)))) {
      check(`${f} -> /api/${slug} : widget Turnstile rendu`, /<Turnstile\b/.test(read(f)), "formulaire sans widget : envoi refuse en production");
    }
  }
}

// ===========================================================================
// E. En-tetes de securite (configuration)
// ===========================================================================
section = "E. En-tetes (configuration)";
const nextConfig = read("next.config.ts");
const REQUIRED_HEADERS = ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security", "Content-Security-Policy"];
for (const h of REQUIRED_HEADERS) check(`${h} declare`, new RegExp(`key:\\s*"${h}"`).test(nextConfig));
check("en-tetes appliques a toutes les routes", /source:\s*"\/\(\.\*\)"/.test(nextConfig));
const cspSrc = nextConfig.match(/const csp = \[([\s\S]*?)\]\.join/)?.[1] ?? "";
for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors", "form-action 'self'"]) {
  check(`CSP : ${d}`, cspSrc.includes(d));
}
check("HSTS : au moins un an + sous-domaines", /max-age=(3153\d{4}|6307\d{4})[^"]*includeSubDomains/.test(nextConfig));

// ===========================================================================
// F. Assainissement et fichiers (regressions des failles corrigees)
// ===========================================================================
section = "F. Assainissement et fichiers";
{
  const out = sanitizeArticleHtml('<p onclick="x()">a</p><script>alert(1)</script><img src="javascript:alert(1)"><a href="javascript:alert(1)">l</a><iframe src="https://e.vil"></iframe><a href="https://ok.lu">ok</a>');
  check("blog : script retire", !/<script/i.test(out));
  check("blog : attribut on* retire", !/onclick/i.test(out));
  check("blog : lien javascript: retire", !/javascript:/i.test(out));
  check("blog : iframe retire", !/<iframe/i.test(out));
  check("blog : lien externe en noopener", /rel="noopener noreferrer"/.test(out));
  const ld = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  check("JSON-LD : fermeture de balise impossible", !ld.includes("</script>") && !ld.includes("<"));
  check("JSON-LD : reste du JSON valide", (JSON.parse(ld) as { name: string }).name === "</script><script>alert(1)</script>");
  const css = sanitizeCssColorOverrides({ "--gold": "#c9a227", "--x": "red;}</style><script>", "bad name": "#fff", "--y": "url(https://e.vil)" });
  check("CSS : couleur valide conservee", css === "--gold:#c9a227;", css);
  for (const t of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/a\nb", "./x"]) {
    check(`chemin interne refuse : ${JSON.stringify(t)}`, safeInternalPath(t) === null);
  }
  check("chemin interne accepte : /fr/biens", safeInternalPath("/fr/biens") === "/fr/biens");
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  check("fichier : vrai PDF reconnu", detectFileType(pdf, "a.pdf")?.ext === "pdf");
  check("fichier : HTML deguise en .pdf refuse", detectFileType(html, "a.pdf") === null);
  check("envoi de documents : type par contenu et taille bornee", /detectFileType\(/.test(read("app/admin/documents/actions.ts")) && /MAX_DOCUMENT_BYTES/.test(read("app/admin/documents/actions.ts")));
  check("envoi video : signature verifiee", /ftyp|EBML/i.test(read("app/api/admin/upload-video/route.ts")));
  check("e-mails : retours a la ligne retires des en-tetes", /stripHeaderBreaks/.test(read("lib/email/smtp.ts")));
  check("e-mails : aucun envoi a un visiteur depuis une preversion", /VERCEL_ENV === "preview"/.test(read("lib/email/smtp.ts")));
}

// ===========================================================================
// G. Aucun secret dans le depot
// ===========================================================================
section = "G. Secrets dans le depot";
function envLocalSecrets(): Map<string, string> {
  const m = new Map<string, string>();
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return m;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const mm = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!mm) continue;
    const v = mm[2].trim().replace(/^["']|["']$/g, "");
    if (mm[1].startsWith("NEXT_PUBLIC_")) continue;
    if (!/(SECRET|KEY|TOKEN|PASSWORD|PASS|DB_URL)$/.test(mm[1])) continue;
    if (v.length >= 12) m.set(mm[1], v);
  }
  return m;
}
const SECRET_PATTERNS: [string, RegExp][] = [
  ["cle privee", /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["cle AWS", /AKIA[0-9A-Z]{16}/],
  ["jeton Supabase (sbp_)", /sbp_[a-f0-9]{40}/],
  ["cle Groq", /gsk_[A-Za-z0-9]{40,}/],
  ["cle Resend", /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}/],
  ["URL Postgres avec mot de passe", /postgres(?:ql)?:\/\/[^:\s/]+:(?!\[|<|\$|PASSWORD|password|\*)[^@\s]{6,}@/],
];
function jwtRoles(text: string): string[] {
  const roles: string[] = [];
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")) as { role?: string };
      roles.push(payload.role ?? "inconnu");
    } catch {
      roles.push("illisible");
    }
  }
  return roles;
}
const envSecrets = envLocalSecrets();
{
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT }).toString().split("\0").filter(Boolean);
  check("fichiers suivis lus", tracked.length > 0);
  const envTracked = tracked.filter((f) => /(^|\/)\.env(\..+)?$/.test(f) && !f.endsWith(".env.example"));
  check("aucun fichier .env suivi (hors .env.example)", envTracked.length === 0, envTracked.join(", "));
  check(".env.local ignore par git", /^\.env\*?(\.local)?$/m.test(read(".gitignore")) || /\.env\*/.test(read(".gitignore")));
  const hits: string[] = [];
  for (const f of tracked) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size > 3_000_000) continue;
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) continue;
    const text = buf.toString("utf8");
    for (const [label, re] of SECRET_PATTERNS) if (re.test(text)) hits.push(`${f} : ${label}`);
    for (const role of jwtRoles(text)) if (role !== "anon") hits.push(`${f} : JWT role=${role}`);
    for (const [name, value] of envSecrets) if (text.includes(value)) hits.push(`${f} : valeur de ${name}`);
  }
  check("aucun secret dans les fichiers suivis", hits.length === 0, hits.join(" ; "));
  if (envSecrets.size === 0) outcomes.push({ section, name: "NOTE : .env.local absent, comparaison des valeurs non faite (motifs seulement)", ok: true });
}

// ===========================================================================
// H. Aucune cle serveur dans le build client
// ===========================================================================
section = "H. Build client";
const BUILD_ID = path.join(ROOT, ".next/BUILD_ID");
const hasBuild = fs.existsSync(BUILD_ID);
check("build de production present (npx next build --webpack)", hasBuild, "lancer le build avant la suite");
if (hasBuild) {
  const clientFiles = [
    ...walk(".next/static", (p) => /\.(js|css|json|html|txt)$/.test(p)),
    ...walk(".next/server/app", (p) => /\.(html|rsc|body|meta)$/.test(p)),
  ];
  check("fichiers servis au navigateur trouves", clientFiles.length > 0);
  const hits: string[] = [];
  for (const f of clientFiles) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const [name, value] of envSecrets) if (text.includes(value)) hits.push(`${f} : valeur de ${name}`);
    for (const role of jwtRoles(text)) if (role !== "anon") hits.push(`${f} : JWT role=${role}`);
    for (const [label, re] of SECRET_PATTERNS) if (re.test(text)) hits.push(`${f} : ${label}`);
  }
  check(`aucune cle serveur dans ${clientFiles.length} fichiers servis au navigateur`, hits.length === 0, hits.slice(0, 10).join(" ; "));
}

// ===========================================================================
// I. Requetes reelles en memoire (build de production)
// ===========================================================================
async function runtime() {
  section = "I. Requetes en memoire";
  if (!hasBuild) {
    check("requetes en memoire", false, "build absent");
    return;
  }
  const { startServerProcess } = await import("../../tests/seo/server-client");
  const server = await startServerProcess();
  try {
    const fill = (route: string) =>
      route
        .replace(/^app/, "")
        .replace(/\/route\.ts$/, "")
        .replace(/\[\.\.\.[^\]]+\]/g, "test")
        .replace(/\[[^\]]+\]/g, "00000000-0000-0000-0000-000000000000");
    // Securite de la suite elle-meme : aucune requete vers une route dont la
    // garde n'est pas prouvee par la partie statique (sinon, avec un acces
    // reseau, une requete anonyme pourrait agir sur la production).
    const staticFailed = new Set(outcomes.filter((o) => !o.ok).map((o) => o.name.split(" ")[0]));
    for (const f of adminRoutes) {
      if (staticFailed.has(f)) {
        check(`${f} : requete non envoyee (garde statique en echec)`, false);
        continue;
      }
      for (const { name } of exportedFunctions(read(f))) {
        if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(name)) continue;
        const url = fill(f);
        const r = await server.request(url, { method: name, body: name === "GET" ? undefined : "{}" });
        check(`${name} ${url} anonyme : refuse`, r.status === 401 || r.status === 403, `statut ${r.status}`);
      }
    }
    for (const f of walk("app/api/cron", (p) => p.endsWith("route.ts")).sort()) {
      if (staticFailed.has(f)) {
        check(`${f} : requete non envoyee (secret statique en echec)`, false);
        continue;
      }
      const url = fill(f);
      const a = await server.request(url);
      check(`GET ${url} sans secret : 401`, a.status === 401, `statut ${a.status}`);
      const b = await server.request(url, { headers: { authorization: "Bearer undefined" } });
      check(`GET ${url} avec 'Bearer undefined' : 401`, b.status === 401, `statut ${b.status}`);
    }
    for (const p of ["/admin", "/admin/leads", "/admin/securite", "/admin/documents"]) {
      const r = await server.request(p);
      const loc = r.headers["location"] ?? "";
      check(`${p} anonyme : redirection vers la connexion`, r.status >= 300 && r.status < 400 && /\/admin\/login/.test(loc), `statut ${r.status} location ${loc}`);
      check(`${p} : jamais en cache, jamais indexe`, /no-store/.test(r.headers["cache-control"] ?? "") && /noindex/.test(r.headers["x-robots-tag"] ?? ""));
    }
    const h = await server.request("/api/health");
    for (const name of REQUIRED_HEADERS) {
      check(`en-tete servi : ${name}`, Boolean(h.headers[name.toLowerCase()]), `absent de /api/health (statut ${h.status})`);
    }
    check("en-tete servi : CSP frame-ancestors", /frame-ancestors/.test(h.headers["content-security-policy"] ?? ""));
  } finally {
    await server.close();
  }
}

runtime()
  .catch((e) => check("requetes en memoire", false, String(e)))
  .finally(() => {
    let current = "";
    for (const o of outcomes) {
      if (o.section !== current) {
        current = o.section;
        console.log(`\n${current}`);
      }
      if (!o.ok || process.env.SECURITY_VERBOSE === "1") console.log(`  ${o.ok ? "OK  " : "ECHEC"} ${o.name}${o.detail ? `\n         ${o.detail}` : ""}`);
    }
    const failed = outcomes.filter((o) => !o.ok);
    const bySection = new Map<string, [number, number]>();
    for (const o of outcomes) {
      const [ok, n] = bySection.get(o.section) ?? [0, 0];
      bySection.set(o.section, [ok + (o.ok ? 1 : 0), n + 1]);
    }
    console.log("\nResume");
    for (const [s, [ok, n]] of bySection) console.log(`  ${s.padEnd(40)} ${ok}/${n}`);
    console.log(`\n${outcomes.length - failed.length}/${outcomes.length} controles reussis${failed.length ? `, ${failed.length} ECHEC(S)` : ""}`);
    process.exit(failed.length ? 1 : 0);
  });

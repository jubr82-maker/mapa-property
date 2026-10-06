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
//   J. Passkeys
//   K. pilotage
//   L. regles d'acces (SQL 02, 05, 09), ecritures par le serveur seul,
//      fichiers inutilises supprimes, purge automatique
//   M. fiche de bien : photos de l'admin, coordonnees protegees, taux,
//      metadonnees de partage
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
import { maskEmail } from "../../lib/email/smtp";
import { classifyChannel, sanitizeAttribution } from "../../lib/pilotage/attribution";
import { isTargetQuery } from "../../lib/pilotage/seo-targets";
import { abbreviateAccount, journalLines, journalSummary, paginate, parseJournalParams } from "../../lib/pilotage/journal-view";
import { displayableImageSrc, isOptimizedImageSrc } from "../../lib/image-hosts";
import { revealLines } from "../../lib/contact/reveal-lines";
import { REVIEW_COLUMNS, buildReviewWrite, reviewTextFor } from "../../lib/reviews";
import { dbErrorReason } from "../../lib/admin/db-error";
import { buildValueOpinionPdf, VALUE_OPINION_LANGS, voPrice, voPercent } from "../../lib/estimation/value-opinion-pdf";
import { estimationInputEntries } from "../../lib/estimation/display";
import { sanitizeArticleHtml as sanitizeArticleForTest } from "../../lib/security/sanitize";
import { RETENTION_RULES } from "../../lib/pilotage/config";
import { retentionCutoff } from "../../lib/pilotage/retention";
import { selectPublicImages, isApimoImageUrl } from "../../lib/property-images";
import { formatRateFraction } from "../../lib/format/numbers";
import { evaluateAdminIdle, sessionStartFromClaims, parseActivityCookie } from "../../lib/admin/idle";
import { SERVER_ONLY_NAMESPACES, clientMessages } from "../../lib/i18n-client-messages";

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
/** Corps du gestionnaire POST, direct ou enveloppe (withFormEvents). */
function postHandlerBody(src: string): string {
  const direct = exportedFunctions(src).find((x) => x.name === "POST")?.body;
  if (direct) return direct;
  const wrapped = src.match(/export const POST = \w+\([^,]+, (\w+)\)/)?.[1];
  return (wrapped && localFunction(src, wrapped)) || src;
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
  passkeyLoginStartAction: /verifyCaptchaIfConfigured\(/,
  passkeyLoginCompleteAction: /isAdminEmail\(/,
  passkeyLoginReportAction: /attemptIsOpen\(/,
};
const actionFiles = [...walk("app", (p) => /\.tsx?$/.test(p)), ...walk("lib", (p) => /\.tsx?$/.test(p)), ...walk("components", (p) => /\.tsx?$/.test(p))]
  .filter((f) => /^\s*["']use server["']/.test(read(f).slice(0, 60)))
  .sort();
check("fichiers d'actions serveur trouves", actionFiles.length > 0);
let actionCount = 0;
for (const f of actionFiles) {
  for (const { name, body } of exportedFunctions(read(f))) {
    actionCount++;
    if (AUTH_FLOW[name] && /app\/admin\/(auth|passkey)-actions\.ts$/.test(f)) {
      const c = firstIndex(body, AUTH_FLOW[name]);
      const op = firstIndex(body, /signInWithPassword|resetPasswordForEmail|updateUser|mfa\.(enroll|challenge|verify|unenroll)|passkey\.|getAuthenticatorAssuranceLevel|\.from\(/);
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
  .filter((f) => /export (async function|const) (POST|PUT|PATCH|DELETE)\b/.test(read(f)))
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
  const post = postHandlerBody(src);
  // contact-reveal affiche le telephone d'un bien : action de visiteur
  // (suivie dans tracking_events), pas une demande client a compter.
  if (f !== "app/api/contact-reveal/route.ts") {
    check(`${f} : envois comptes (sante des formulaires)`, /export const POST = withFormEvents\("[a-z_]+", handlePost\)/.test(src), "formulaire public non compte dans form_events");
  }
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
// J. Passkeys
// ===========================================================================
section = "J. Passkeys";
{
  const src = read("app/admin/passkey-actions.ts");
  const fns = exportedFunctions(src);
  const MANAGEMENT = ["passkeyRegisteredAction", "passkeyRenameAction", "passkeyDeleteAction"];
  for (const n of MANAGEMENT) {
    const body = fns.find((x) => x.name === n)?.body ?? "";
    const g = firstIndex(body, /assertAdminAction\(\)/);
    const op = firstIndex(body, /passkey\.|\.from\(|logAdminAuthEvent/);
    check(`${n} : garde admin aal2 avant toute operation`, body.length > 0 && g >= 0 && (op < 0 || g < op), "action absente ou garde manquante");
  }
  check("aucune autre action de gestion exportee", fns.every((x) => MANAGEMENT.includes(x.name) || /^passkeyLogin(Start|Complete|Report)Action$/.test(x.name)), fns.map((x) => x.name).join(", "));
  // La garde de gestion refuse les trois cas (meme decision que l'admin).
  check("gestion : session anonyme refusee", evaluateAdminAccess(null, null) !== "admin");
  check("gestion : compte hors liste refuse (meme en aal2)", evaluateAdminAccess({ email: "intrus@example.org" }, "aal2") !== "admin");
  check("gestion : session aal1 refusee", evaluateAdminAccess({ email: "admin@mapagroup.org" }, "aal1") !== "admin");
  check("garde de gestion fondee sur aal2", /evaluateAdminAccess\(user, aal2 \? "aal2" : "aal1"\)/.test(read("lib/admin/require-admin.ts")) && /currentLevel === "aal2"/.test(read("lib/admin/require-admin.ts")));
  // Regle A2 : une session ouverte par Passkey n'ouvre l'admin que si le
  // jeton emis par Supabase porte aal2 ; sinon le code a 6 chiffres.
  for (const p of ["/admin", "/admin/securite"]) {
    check(`Passkey avec aal1 sur ${p} : code a 6 chiffres exige`, adminPageRedirect(p, evaluateAdminAccess({ email: "admin@mapagroup.org" }, "aal1"))?.path === "/admin/mfa");
    check(`Passkey avec aal2 sur ${p} : admin servi`, adminPageRedirect(p, evaluateAdminAccess({ email: "admin@mapagroup.org" }, "aal2")) === null);
  }
  check("Passkey sans niveau (jeton sans aal) : code exige", evaluateAdminAccess({ email: "admin@mapagroup.org" }, undefined) === "mfa_required");
  // Jamais de niveau fabrique ni de methode (amr) lue pour accorder l'acces.
  const accessFiles = ["proxy.ts", "lib/admin/require-admin.ts", "lib/admin/admin-access.ts", "lib/admin/sales-auth.ts", "app/admin/passkey-actions.ts", "app/admin/auth-actions.ts", "components/admin/PasskeyClient.tsx"];
  for (const f of accessFiles) {
    const t = read(f);
    check(`${f} : aucune methode de connexion (amr) utilisee`, !/currentAuthenticationMethods|\bamr\b/.test(t));
    check(`${f} : aucun aal2 fabrique`, !/(currentLevel|aal)\s*[:=]\s*["']aal2["']|aal2\s*[:=]\s*true\b/.test(t));
  }
  const complete = fns.find((x) => x.name === "passkeyLoginCompleteAction")?.body ?? "";
  check("connexion Passkey : compte hors liste deconnecte", /!isAdminEmail\(user\.email\)\)\s*\{\s*await supabase\.auth\.signOut\(\)/.test(complete));
  check("connexion Passkey : niveau lu cote serveur apres getUser", firstIndex(complete, /getUser\(\)/) >= 0 && firstIndex(complete, /getUser\(\)/) < firstIndex(complete, /getAuthenticatorAssuranceLevel\(\)/));
  const blocB = read("supabase/manual/execution/05_bloc_B.sql");
  check("SQL bloc B : aal2 lu dans le jeton Supabase", /auth\.jwt\(\) ->> 'aal', ''\) = 'aal2'/.test(blocB));
  check("SQL bloc B : search_path conserve (bloc D)", /SET search_path = public, pg_temp/.test(blocB));
  check("SQL bloc B : test Passkey aal1 refuse avant validation", /Passkey en aal1 : refuse/.test(blocB) && /RAISE EXCEPTION/.test(blocB));
  check("SQL bloc C : search_path conserve", /SET search_path = public, pg_temp/.test(read("supabase/manual/execution/05_bloc_C_secours.sql")));
  for (const f of fs.readdirSync(path.join(ROOT, "supabase/manual/execution"))) {
    const sql = read(`supabase/manual/execution/${f}`);
    check(`SQL ${f} : aucune reference a leads_notifications`, !/leads_notifications/.test(sql));
    check(`SQL ${f} : aucun tiret long ou moyen`, !/[\u2013\u2014]/.test(sql));
  }
  check("connexion Passkey : Turnstile conserve", /passkeyLoginStartAction\(captchaToken\)/.test(read("components/admin/PasskeyClient.tsx")) && /<PasskeyLoginButton/.test(read("components/admin/AdminLoginForm.tsx")));
}

// ===========================================================================
// K. Pilotage (tableau de bord, suivi, sante, journal, tache quotidienne)
// ===========================================================================
section = "K. Pilotage";
{
  const PAGES = ["app/admin/page.tsx", "app/admin/activite/page.tsx", "app/admin/trafic/page.tsx", "app/admin/sante/page.tsx", "app/admin/journal/page.tsx", "app/admin/analytics/page.tsx", "app/admin/visiteurs/page.tsx", "app/admin/performance/page.tsx"];
  for (const f of PAGES) {
    const body = read(f).slice(read(f).indexOf("export default"));
    const g = firstIndex(body, /requireAdminPage\(\)/);
    const op = firstIndex(body, /load[A-Z]\w*\(|redirect\(/);
    check(`${f} : garde admin aal2 avant toute lecture`, g >= 0 && (op < 0 || g < op));
  }
  const pa = read("app/admin/pilotage-actions.ts");
  check("mesure a la demande : garde admin en tete", /export async function runPerformanceNowAction\(\)[^{]*\{\s*const \{ user \} = await assertAdminAction\(\)/.test(pa));
  check("mesure a la demande : delai minimal entre deux mesures", /PSI_MANUAL_COOLDOWN_MINUTES/.test(pa));
  const vercel = JSON.parse(read("vercel.json")) as { crons?: { path: string; schedule: string }[] };
  check("une seule tache planifiee, quotidienne", vercel.crons?.length === 1 && vercel.crons[0].path === "/api/cron/daily" && /^\d+ \d+ \* \* \*$/.test(vercel.crons[0].schedule), JSON.stringify(vercel.crons));
  check("tache quotidienne : secret obligatoire", /isAuthorizedCron\(req\)/.test(read("app/api/cron/daily/route.ts")));
  // PageSpeed : jamais a l'ouverture d'une page ni par une lecture.
  const measurers = [...walk("app", (p) => /\.(ts|tsx)$/.test(p)), ...walk("lib", (p) => /\.(ts|tsx)$/.test(p)), ...walk("components", (p) => /\.(ts|tsx)$/.test(p))]
    .filter((f) => f !== "lib/pilotage/psi.ts" && /runPsiMeasurements\(/.test(read(f)));
  check("PageSpeed lance seulement par la tache quotidienne ou le bouton", measurers.sort().join(",") === "app/admin/pilotage-actions.ts,lib/pilotage/daily-task.ts", measurers.join(", "));
  check("PageSpeed : cle dediee obligatoire", /if \(!psiConfigured\(\)\) return \{ ok: false, detail: "not_configured" \}/.test(read("lib/pilotage/psi.ts")));
  check("route de mesure : lecture seule", !/runPsiMeasurements|fetch\(/.test(read("app/api/admin/performance/psi/route.ts")));
  // Requetes sortantes : aucun en-tete identifiant (User-Agent, nom, e-mail).
  for (const f of [...walk("lib/google", (p) => p.endsWith(".ts")), ...walk("lib/pilotage", (p) => p.endsWith(".ts"))].filter((f) => /fetch\(/.test(read(f)))) {
    const code = read(f).replace(/^\s*\/\/.*$/gm, "");
    check(`${f} : aucun en-tete identifiant dans les requetes sortantes`, !/user-agent/i.test(code) && !/julien|brebion|mapagroup|"mapa/i.test(code));
  }
  // Journal des e-mails : destinataire masque, jamais le contenu.
  const smtp = read("lib/email/smtp.ts");
  const logBody = smtp.slice(smtp.indexOf("async function logEmail"), smtp.indexOf("export async function sendMail"));
  check("journal des e-mails : ni sujet ni contenu", logBody.length > 0 && !/args\.(subject|text)/.test(logBody));
  check("journal des e-mails : destinataire masque", /recipient_masked: to\.map\(maskEmail\)/.test(logBody));
  check("masquage : j***@g***.com", maskEmail("julien.brebion@gmail.com") === "j***@g***.com", maskEmail("julien.brebion@gmail.com"));
  check("origine : sans consentement, inconnue", classifyChannel(null) === "unknown");
  check("origine : parametre UTM, campagne", classifyChannel(sanitizeAttribution({ referrerHost: "www.google.com", utmSource: "newsletter" })) === "campaign");
  check("origine : Google", classifyChannel(sanitizeAttribution({ referrerHost: "www.google.lu" })) === "google");
  check("origine : acces direct", classifyChannel(sanitizeAttribution({})) === "direct");
  check("origine : valeur hostile neutralisee", sanitizeAttribution({ referrerHost: "<script>", utmCampaign: "x\"onload=" })?.referrerHost === null);
  check("requete cible : agence immobiliere luxembourg", isTargetQuery("Agence Immobilière Luxembourg"));
  check("requete cible : immobilier Esch-sur-Alzette", isTargetQuery("immobilier esch sur alzette"));
  check("requete hors cible : immobilier paris", !isTargetQuery("immobilier paris"));
  // Origine des visites : seulement apres consentement aux statistiques.
  const attr = read("lib/pilotage/attribution-client.ts");
  check("origine des visites : capture apres consentement", /if \(!hasStatsConsent\(\) \|\| window\.sessionStorage\.getItem\(KEY\)\) return;/.test(attr) && /if \(!hasStatsConsent\(\)\) return null;/.test(attr));
  // Journal et alertes.
  const props = read("app/admin/properties/actions.ts");
  check("prix modifie : ancienne et nouvelle valeur journalisees", /action: "property_price_changed"[\s\S]{0,400}before:[\s\S]{0,200}after:/.test(props));
  check("bien supprime : journal et alerte e-mail", /action: "property_deleted"/.test(props) && /sendAdminAlert\("property_deleted"/.test(props));
  check("nouvel appareil : alerte e-mail", /sendAdminAlert\("factor_added"/.test(read("app/admin/auth-actions.ts")));
  check("nouvelle Passkey : alerte e-mail", /sendAdminAlert\("passkey_added"/.test(read("app/admin/passkey-actions.ts")));
  check("rafale d'echecs de connexion : alerte e-mail", (read("app/admin/auth-actions.ts").match(/maybeAlertLoginBurst\(\)/g) ?? []).length >= 3);
  // SQL du pilotage et de l'effacement.
  const sql06 = read("supabase/manual/execution/06_pilotage_tables.sql");
  check("SQL 06 : RLS et lecture admin sur chaque table", /ENABLE ROW LEVEL SECURITY/.test(sql06) && /USING \(public\.is_mapa_admin\(\)\)/.test(sql06) && /REVOKE ALL ON public\.%I FROM anon, authenticated/.test(sql06));
  const sql07 = read("supabase/manual/execution/07_effacement_statistiques_test.sql").replace(/^--.*$/gm, "");
  check("SQL 07 : seulement vues de biens, evenements de suivi et chatbot", /VALUES \(1, 'property_views'\), \(2, 'tracking_events'\), \(3, 'chatbot_logs'\)/.test(sql07) && !/DELETE FROM public\.(?!%I)/.test(sql07));
  check("SQL 07 : sauvegarde avant effacement dans la meme transaction", sql07.indexOf("INSERT INTO public.%I SELECT * FROM public.%I") < sql07.indexOf("DELETE FROM public.%I") && /BEGIN;[\s\S]*COMMIT;/.test(sql07));
}

// ===========================================================================
// L. Fermeture des regles d'acces, nettoyage, purge automatique
// ===========================================================================
section = "L. Regles d'acces et purge";
{
  const strip = (s: string) => s.replace(/^\s*--.*$/gm, "");
  const codeFiles = [...walk("app", (p) => /\.(ts|tsx)$/.test(p)), ...walk("lib", (p) => /\.(ts|tsx)$/.test(p)), ...walk("components", (p) => /\.(ts|tsx)$/.test(p))];
  // Ecritures directes : chaque ecriture sur ces tables passe par le serveur
  // avec la cle service_role, jamais par le navigateur ni par la cle anon.
  const DIRECT = ["leads", "estimation_requests", "estimations", "offmarket_requests", "arcova_waitlist", "property_views", "tracking_events"];
  const usesService = (src: string) => /supabaseService\(\)|SUPABASE_SERVICE_ROLE_KEY/.test(src);
  const isClient = (src: string) => /^\s*["']use client["']/.test(src);
  for (const t of DIRECT) {
    const writers = codeFiles.filter((f) => new RegExp(`from\\(["']${t}["']\\)\\s*\\.(insert|upsert|update|delete)\\(`).test(read(f)));
    for (const f of writers) {
      const src = read(f);
      check(`${t} : ${f} ecrit par la cle service_role, cote serveur`, usesService(src) && !isClient(src));
    }
  }
  for (const f of codeFiles.filter((f) => /insertLeadWithConsent\(\s*\w/.test(read(f)) && f !== "lib/lead-insert.ts")) {
    check(`leads : ${f} insere par la cle service_role`, /insertLeadWithConsent\(\s*(sb|sbWrite)\b/.test(read(f)) && /const (sb|sbWrite) = supabaseService\(\)/.test(read(f)));
  }
  const browserWriters = codeFiles.filter((f) => isClient(read(f)) && /\.from\(["'][\w-]+["']\)\s*\.(insert|upsert|update|delete|upload|remove)\(/.test(read(f)));
  check("aucune ecriture en base ni dans le stockage depuis le navigateur", browserWriters.length === 0, browserWriters.join(", "));
  const browserClientUsers = codeFiles.filter((f) => f !== "lib/supabase-ssr.ts" && /createSupabaseBrowserClient/.test(read(f)));
  check("client navigateur reserve a la connexion (Passkey)", browserClientUsers.join(",") === "components/admin/PasskeyClient.tsx", browserClientUsers.join(", "));
  // Stockage : le code n'ecrit que dans property-images et documents, en session admin.
  const storageWriters = codeFiles.filter((f) => /storage\s*\.from\([^)]*\)\s*\.(upload|remove|update|move|copy)\(/.test(read(f)));
  check("stockage : ecritures seulement dans l'admin", storageWriters.length > 0 && storageWriters.every((f) => f.startsWith("app/admin/")), storageWriters.join(", "));
  check("offmarket-photos : aucune ecriture dans le code", !codeFiles.some((f) => /storage\s*\.from\(["']offmarket-photos["']\)/.test(read(f))));

  // Variables revoquees : plus aucune lecture.
  const REVOKED = ["SUPABASE_ACCESS_TOKEN", "GROQ_API_KEY", "RESEND_API_KEY"];
  const envReaders = [...codeFiles, ...walk("scripts", (p) => /\.(ts|mjs|js)$/.test(p) && !p.endsWith("test-security.ts")), "proxy.ts", "next.config.ts", ".env.example"]
    .filter((f) => REVOKED.some((k) => new RegExp(`process\\.env\\.${k}\\b|process\\.env\\[["']${k}["']\\]|^${k}=`, "m").test(read(f))));
  check("aucune lecture de SUPABASE_ACCESS_TOKEN, GROQ_API_KEY, RESEND_API_KEY", envReaders.length === 0, envReaders.join(", "));

  // SQL 02 bloc A.
  const a = strip(read("supabase/manual/execution/02_bloc_A.sql"));
  check("SQL 02 : une seule transaction", (a.match(/^BEGIN;$/gm) ?? []).length === 1 && (a.match(/^COMMIT;$/gm) ?? []).length === 1);
  for (const [tbl, pol] of [["leads", "anon insert leads"], ["estimation_requests", "estimation_requests_insert_anon"], ["estimations", "anon insert estimations"], ["offmarket_requests", "offmarket_requests_public_insert"], ["arcova_waitlist", "anon insert arcova"], ["arcova_waitlist", "arcova_public_insert"], ["property_views", "pv_public_insert"], ["tracking_events", "tracking_events_insert_anon"]]) {
    check(`SQL 02 : regle ouverte supprimee ${tbl} / ${pol}`, a.includes(`('${tbl}', '${pol}')`));
  }
  for (const [tbl, pol] of [["arcova_waitlist", "arcova_admin_full"], ["properties_offmarket", "offmarket_authenticated_write"], ["offmarket_audit_log", "audit_admin_read"]]) {
    check(`SQL 02 : agency_admins remplacee ${tbl} / ${pol}`, a.includes(`pg_temp.bloc_a_admin_only('public', '${tbl}', '${pol}', NULL)`));
  }
  check("SQL 02 : condition admin = public.is_mapa_admin()", /'public\.is_mapa_admin\(\)'/.test(a) && /format\('bucket_id = %L AND public\.is_mapa_admin\(\)', p_bucket\)/.test(a));
  check("SQL 02 : liste d'e-mails de mapa_historical_sales remplacee", /partners_read/.test(a) && /partners_write/.test(a) && /@mapagroup\.org%'/.test(a));
  check("SQL 02 : offmarket-photos, toutes les regles supprimees", a.includes("'offmarket_photos_admin_write'") && a.includes("'offmarket_photos_public_read'") && /LIKE '%''offmarket-photos''%'/.test(a) && /SET public = false WHERE id = 'offmarket-photos'/.test(a));
  check("SQL 02 : refus de droits du stockage signale sans annuler le bloc", (a.match(/EXCEPTION WHEN insufficient_privilege/g) ?? []).length >= 3 && /'A FAIRE dans Storage, Policies'/.test(a));
  check("SQL 02 : agency_admins conservee", !/DROP TABLE[^;]*agency_admins/i.test(a));
  check("SQL 02 : is_mapa_admin non redefinie (bloc B)", !/CREATE OR REPLACE FUNCTION public\.is_mapa_admin/.test(a));
  // Le site v28 en production ecrit encore leads et arcova_waitlist depuis
  // le navigateur : insertion conservee mais bornee, droits inchanges.
  const revoked = a.match(/FOREACH t IN ARRAY ARRAY\[([^\]]+)\][\s\S]{0,200}?REVOKE INSERT, UPDATE, DELETE ON public\.%I FROM anon/)?.[1] ?? "";
  check("SQL 02 : droits d'ecriture anon retires sur les cinq tables sans besoin", ["estimation_requests", "estimations", "offmarket_requests", "property_views", "tracking_events"].every((t) => revoked.includes(`'${t}'`)) && !/'leads'|'arcova_waitlist'/.test(revoked), revoked);
  check("SQL 02 : insertion bornee leads et arcova_waitlist (site v28)", /\('leads', 'leads_insert_borne', 'new'\)/.test(a) && /\('arcova_waitlist', 'arcova_waitlist_insert_borne', NULL\)/.test(a) && /FOR INSERT TO anon WITH CHECK \(%s\)/.test(a));
  check("SQL 02 : bornes e-mail, longueurs, telephone, langue, statut", /'email IS NOT NULL'/.test(a) && /char_length\(%1\$I\) <= %2\$s/.test(a) && /\(1, 'email', 254, '\^\[\^@\[:space:\]\]\+@/.test(a) && /\(5, 'phone', 40,/.test(a) && /\(10, 'lang', 5, '\^\[a-z\]\{2\}\$'\)/.test(a) && /status IS NULL OR status::text = ANY/.test(a));
  // Champs envoyes par le v28 (branche main) : tous bornes par le bloc A.
  for (const col of ["email", "first_name", "last_name", "phone", "message", "type", "property_ref", "source", "lang", "company", "role"]) {
    check(`SQL 02 : champ v28 ${col} borne`, new RegExp(`\\(\\d+, '${col}', \\d+, `).test(a));
  }
  check("SQL 02 : un seul tableau de controle", (a.match(/^SELECT controle::text/gm) ?? []).length === 1);
  // SQL 05 bloc B : point 1 (aal2 et search_path de is_mapa_admin).
  const b = read("supabase/manual/execution/05_bloc_B.sql");
  check("SQL 05 : is_mapa_admin exige aal2 et fixe search_path", /CREATE OR REPLACE FUNCTION public\.is_mapa_admin\(\)[\s\S]*?SET search_path = public, pg_temp[\s\S]*?'aal2'/.test(b));
  // SQL 09 nettoyage.
  const n = strip(read("supabase/manual/execution/09_nettoyage.sql"));
  const raw09 = read("supabase/manual/execution/09_nettoyage.sql");
  check("SQL 09 : copie avant suppression de tmp_property_images_import", n.indexOf("SELECT * FROM public.tmp_property_images_import;") > 0 && n.indexOf("SELECT * FROM public.tmp_property_images_import;") < n.indexOf("DROP TABLE public.tmp_property_images_import;"));
  check("SQL 09 : aucun bucket ni fichier supprime", !/DELETE FROM storage|DROP[^;]*bucket|storage\.buckets\s+SET|delete_bucket/i.test(n));
  check("SQL 09 : retour arriere present", /RETOUR ARRIERE/.test(raw09) && /-- CREATE TABLE public\.tmp_property_images_import/.test(raw09));
  check("tmp_property_images_import : aucun code ne l'utilise", !codeFiles.some((f) => /tmp_property_images_import/.test(read(f))));

  // Decision E : fichiers supprimes.
  const REMOVED = [
    "components/admin/TwoFactorPrompt.tsx", "components/admin/ModuleComingSoon.tsx", "components/admin/AnalyticsHealthPill.tsx",
    "components/admin/performance/ScoreCard.tsx", "components/admin/performance/SentryNotConfiguredCard.tsx",
    "components/admin/performance/WebVitalBadge.tsx", "components/admin/performance/BundleSizeList.tsx",
    "components/admin/analytics/KpiCard.tsx", "components/admin/analytics/PieChart.tsx", "components/admin/analytics/TokenMissingCard.tsx",
    "app/api/admin/analytics/cloudflare/route.ts", "app/api/admin/analytics/vercel/route.ts", "app/api/admin/analytics/ga4/route.ts",
    "app/api/admin/analytics/supabase/route.ts", "app/api/admin/performance/sentry/route.ts",
  ];
  const still = REMOVED.filter((f) => fs.existsSync(path.join(ROOT, f)));
  check("fichiers inutilises supprimes (10 composants, 5 routes)", still.length === 0, still.join(", "));

  // Decision F : purge quotidienne, memes durees que le bloc F.
  check("purge lancee par la tache quotidienne", /step\("retention", \(\) => purgeExpiredRows\(now\)\)/.test(read("lib/pilotage/daily-task.ts")));
  const f04 = read("supabase/manual/execution/04_bloc_F.sql");
  const sqlRules = [...f04.matchAll(/\(\d, '(\w+)', '(\w+)', '(\d+) months'\)/g)].map((m) => `${m[1]}.${m[2]}.${m[3]}`).sort().join(",");
  const codeRules = RETENTION_RULES.map((r) => `${r.table}.${r.column}.${r.months}`).sort().join(",");
  check("durees de conservation identiques au bloc F", sqlRules === codeRules && codeRules === "admin_auth_log.created_at.12,chatbot_logs.created_at.6,property_views.viewed_at.13,tracking_events.created_at.13", `${codeRules} / ${sqlRules}`);
  const ret = read("lib/pilotage/retention.ts");
  check("purge : seules les tables de RETENTION_RULES", (ret.match(/\.from\(/g) ?? []).length === 1 && /\.from\(rule\.table\)/.test(ret) && /\.lt\(rule\.column, cutoff\)/.test(ret));
  check("purge : 6 mois avant le 31 mars 2026 = 30 septembre 2025", retentionCutoff(6, new Date("2026-03-31T05:00:00Z")).toISOString() === "2025-09-30T05:00:00.000Z");
  check("purge : 13 mois avant le 5 octobre 2026 = 5 septembre 2025", retentionCutoff(13, new Date("2026-10-05T05:00:00Z")).toISOString() === "2025-09-05T05:00:00.000Z");
  check("purge : 12 mois avant le 29 fevrier 2028 = 28 fevrier 2027", retentionCutoff(12, new Date("2028-02-29T05:00:00Z")).toISOString() === "2027-02-28T05:00:00.000Z");
}

// ===========================================================================
// M. Fiche de bien publique et coordonnees protegees
// ===========================================================================
// Coordonnees interdites dans le HTML servi par le serveur (decision de
// Julien, oct. 2026) : adresse du compte admin, liens mailto: et tel:,
// numero de Julien en clair (toutes graphies courantes).
const FORBIDDEN_IN_HTML: [string, RegExp][] = [
  ["admin@mapagroup.org", /admin@mapagroup\.org/i],
  ["lien mailto:", /(?<![a-z])mailto:/i],
  ["lien tel:", /(?<![a-z])tel:/i],
  ["numero de Julien", /691[\s.-]*620[\s.-]*127/],
  // Second numero et e-mail du site (oct. 2026) : reveles au clic
  // seulement, jamais en clair dans le HTML servi.
  ["second numero", /691[\s.-]*113[\s.-]*018/],
  ["site@mapagroup.org", /site@mapagroup\.org/i],
];
function forbiddenHits(text: string): string[] {
  return FORBIDDEN_IN_HTML.filter(([, re]) => re.test(text)).map(([label]) => label);
}
section = "M. Fiche de bien et coordonnees";
{
  // Photos : decision A (photos de l'admin, ordre de l'admin, Apimo masque).
  const A = "https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/property-images/p/a.webp";
  const B = "https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/property-images/p/b.webp";
  const X = "https://media.apimo.pro/cache/x.jpg";
  check("photos : image Apimo reconnue", isApimoImageUrl(X) && !isApimoImageUrl(A));
  check("photos : ordre de l'admin, Apimo masque des qu'une photo admin existe", selectPublicImages([{ url: X, sort: 0 }, { url: B, sort: 2 }, { url: A, sort: 1 }]).map((r) => r.url).join(",") === `${A},${B}`);
  check("photos : sans photo admin, les images Apimo restent affichees", selectPublicImages([{ url: X, sort: 0 }]).length === 1);
  const data = read("lib/data.ts");
  check("photos : fiche, cartes et accueil filtres par selectPublicImages", /return selectPublicImages\(/.test(data) && (data.match(/publicCoverUrl\(row\.property_images\)/g) ?? []).length === 3 && !/limit\(1, \{ referencedTable: "property_images" \}\)/.test(data));
  // Cache : toutes les fiches (3 langues, slug ou identifiant Apimo).
  check("cache : invalidation de toutes les fiches publiques", /revalidatePath\("\/\[locale\]\/biens\/\[slug\]", "page"\)/.test(read("lib/revalidate-property.ts")));
  for (const f of ["app/admin/properties/[id]/photos/actions.ts", "app/admin/properties/actions.ts"]) {
    const src = read(f);
    check(`cache : ${f} invalide toutes les fiches`, /revalidatePublicPropertyPages\(/.test(src) && !/revalidatePath\(`\/fr\/biens\/\$\{/.test(src));
  }
  // Admin : chaque changement de photos est enregistre (table lue par la fiche).
  const pm = read("components/admin/PhotoManager.tsx");
  check("admin : photos envoyees enregistrees automatiquement", /if \(added > 0\) persist\(photosRef\.current\)/.test(pm) && (pm.match(/persist\(list\)/g) ?? []).length >= 3);
  check("admin : enregistrements en file, jamais en parallele", /saveChain\.current\.then\(saveLatest\)/.test(pm));
  // SQL 10 : lecture seule, un seul tableau.
  const sql10 = read("supabase/manual/execution/10_images_apimo_restantes.sql").replace(/^--.*$/gm, "");
  check("SQL 10 : lecture seule, un seul tableau", !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(sql10) && (sql10.match(/^SELECT /gm) ?? []).length === 1 && /media\.apimo|apimo\\\.pro/.test(sql10));
  // Galerie : photo principale visible sans animation, repli sans optimiseur.
  const gal = read("components/property/PropertyGallery.tsx");
  check("galerie : aucune opacite initiale ni animation sur la photo principale", !/opacity-0|motion\.|initial=\{\{|animate-/.test(gal));
  check("galerie : repli direct si l'optimiseur echoue", /unoptimized=\{direct\.has\(current\.url\)\}/.test(gal) && /naturalWidth === 0/.test(gal));
  check("galerie : priority deprecie non utilise", !/\bpriority\b/.test(gal));
  // Taux : fractions affichees en pourcentage.
  check("taux : 0.06 -> 6 % (fr)", formatRateFraction(0.06, "fr").replace(/\s/g, " ") === "6 %", formatRateFraction(0.06, "fr"));
  check("taux : 0.01 -> 1% (en)", formatRateFraction(0.01, "en") === "1%", formatRateFraction(0.01, "en"));
  check("taux : 0.00715 -> 0,715 % (fr)", formatRateFraction(0.00715, "fr").replace(/\s/g, " ") === "0,715 %", formatRateFraction(0.00715, "fr"));
  check("taux : plan de financement par formatRateFraction", /formatRateFraction\(li\.rate, locale\)/.test(read("components/property/AcquisitionSimulator.tsx")));
  // Metadonnees.
  const layout = read("app/[locale]/layout.tsx");
  check("metadonnees : plus de noai ni noimageai", !/noai|noimageai/.test(layout + read("next.config.ts")));
  const ogRefs = [...walk("app", (x) => /\.(ts|tsx)$/.test(x)), ...walk("lib", (x) => /\.(ts|tsx)$/.test(x)), ...walk("components", (x) => /\.(ts|tsx)$/.test(x))]
    .filter((f) => /["'`][^"'`]*\/og\/[^"'`]*["'`]/.test(read(f).replace(/^\s*\/\/.*$/gm, "")));
  check("metadonnees : aucune reference a /og/ (dossier absent)", ogRefs.length === 0, ogRefs.join(", "));
  check("metadonnees : image de partage presente dans public/", fs.existsSync(path.join(ROOT, "public/og-image.png")) && fs.existsSync(path.join(ROOT, "public/logo-mapa-property.png")));
  const fiche = read("app/[locale]/biens/[slug]/page.tsx");
  const meta = fiche.slice(fiche.indexOf("export async function generateMetadata"), fiche.indexOf("export default"));
  check("metadonnees : carte X de la fiche = Open Graph (image et description)", /openGraph: \{[\s\S]*?images: \[\{ url: shareImage \}\]/.test(meta) && /twitter: \{[\s\S]*?description: description \|\| undefined,[\s\S]*?images: \[shareImage\]/.test(meta));
  // Coordonnees dans le code des pages publiques.
  const publicSources = [...walk("app/[locale]", (x) => /\.(ts|tsx)$/.test(x)), ...walk("components", (x) => /\.(ts|tsx)$/.test(x) && !x.startsWith("components/admin/")), "lib/seo.ts", ...walk("lib/legal", (x) => x.endsWith(".ts")), "messages/fr.json", "messages/en.json", "messages/de.json", "public/llms.txt", "lib/contact/reveal-lines.ts"];
  const leaks = publicSources.filter((f) => /admin@mapagroup\.org|j\.brebion@mapagroup\.org|site@mapagroup\.org|691[\s.]?620[\s.]?127|691[\s.]?113[\s.]?018|href=["'](tel|mailto):/i.test(read(f)));
  check("coordonnees : aucune en clair dans les sources publiques", leaks.length === 0, leaks.join(", "));
  const reveal = read("components/contact-reveal.tsx");
  check("coordonnees : adresse admin retiree de ContactReveal", !/EMAIL_ADMIN|\["admin"\]/.test(reveal) && !/\["admin"\]/.test(read("lib/contact/reveal-lines.ts")));
  // Revelation (oct. 2026) : telephone et e-mail de Julien, puis le second
  // numero sans nom ni libelle, puis site@mapagroup.org dessous, meme mise
  // en forme que l'e-mail de Julien. Echoue si l'un disparait.
  const lines = revealLines();
  const at = String.fromCharCode(64);
  check("revelation : second numero present, sans nom", lines[2]?.kind === "phone" && lines[2].display === "+352 691 113 018" && lines[2].href === "tel:+352691113018" && lines[2].ariaKey === "aria_call_secondary");
  check("revelation : site@mapagroup.org sous le second numero, comme l'e-mail de Julien", lines.length === 4 && lines[3]?.kind === "email" && lines[3].display === `site${at}mapagroup.org` && lines[3].href === `mailto:site${at}mapagroup.org` && lines[1].kind === "email");
  check("revelation : aucune adresse admin, Julien en premier", lines[0].display === "+352 691 620 127" && lines[1].display === `j.brebion${at}mapagroup.org` && !lines.some((l) => /^admin/.test(l.display)));
  check("revelation : chaque ligne affichee par ContactReveal apres le clic", /\{revealLines\(\)\.map\(\(line\) => \(\s*<ContactLine/.test(reveal) && /icon=\{line\.kind === "phone" \? <PhoneIcon \/> : <MailIcon \/>\}/.test(reveal) && /!revealed \?/.test(reveal));
  const ariaOk = (["fr", "en", "de"] as const).every((l) => {
    const c = JSON.parse(read(`messages/${l}.json`)).contact as Record<string, string>;
    return ["aria_call_julien", "aria_email_julien", "aria_call_secondary", "aria_email_secondary"].every((k) => typeof c[k] === "string" && c[k].length > 0) && !/fr[eé]d[eé]ric|mannis/i.test(c.aria_call_secondary + c.aria_email_secondary);
  });
  check("revelation : libelles accessibles des quatre lignes, trois langues, sans nom pour la seconde ligne", ariaOk);
  check("version imprimee : coordonnees seulement apres clic", /<PrintAdvisorContact/.test(fiche) && /useContactRevealed\(\)/.test(read("components/property/fiche/PrintAdvisorContact.tsx")));
  check("version imprimee : numeros RCS, TVA, AE retires", !/RCS Luxembourg|TVA : LU|AE N/.test(fiche));
  // HTML prerendu par le build.
  if (hasBuild) {
    const htmlFiles = walk(".next/server/app", (x) => /\.(html|rsc)$/.test(x) && !/[\\/]admin[\\/]|[\\/]admin\.(html|rsc)$/.test(x));
    const hits = htmlFiles.flatMap((f) => forbiddenHits(fs.readFileSync(path.join(ROOT, f), "utf8")).map((l) => `${f} : ${l}`));
    check(`HTML prerendu : aucune coordonnee en clair (${htmlFiles.length} fichiers)`, htmlFiles.length > 0 && hits.length === 0, hits.slice(0, 10).join(" ; "));
  }
  // Le controle lui-meme detecte bien chaque cas.
  check("controle HTML : detecte admin@, mailto:, tel:, numero", forbiddenHits('<a href="mailto:x">admin@mapagroup.org</a><a href="tel:+352691620127">+352 691 620 127</a>').length === 4 && forbiddenHits('<input type="tel" autocomplete="tel-national"> Stadtviertel: x').length === 0);
  check("controle HTML : detecte le second numero et site@", forbiddenHits("+352 691 113 018").length === 1 && forbiddenHits("site@mapagroup.org").length === 1 && forbiddenHits("691.113.018 site@MAPAGROUP.org").length === 2);
}

// ===========================================================================
// N. Cartes depliables, accroches, visionneuse, Passkey, region
// ===========================================================================
section = "N. Cartes, visionneuse, Passkey, region";
{
  // Region d'execution : arn1 (Stockholm), a cote de la base Supabase.
  const vj = JSON.parse(read("vercel.json")) as { regions?: string[] };
  check("region des fonctions : arn1 uniquement", JSON.stringify(vj.regions) === JSON.stringify(["arn1"]), JSON.stringify(vj.regions));
  // Cartes retournables : plus de hauteur fixe, hauteur mesuree.
  const flip = read("components/ui/HoverFlipCard.tsx");
  check("cartes : hauteur mesuree, jamais fixe", /ResizeObserver/.test(flip) && /minHeight/.test(flip) && !/height = "h-/.test(flip));
  for (const f of ["components/home/CoverageGrid.tsx", "components/home/MandatesGrid.tsx"]) {
    check(`${f} : hauteur minimale seulement`, /minHeight="min-h-/.test(read(f)) && !/\sheight="h-/.test(read(f)));
  }
  check("cartes : une colonne sous 640 px", /grid grid-cols-1 gap-3 sm:grid-cols-2/.test(read("components/home/CoverageGrid.tsx")));
  check("cartes : transition de hauteur symetrique", /\.flip-card \{[\s\S]*?transition: height 500ms/.test(read("app/globals.css")));
  // Accroches : jamais une virgule devant une majuscule.
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`)) as { method_coverage: { subtitle: string } };
    check(`accroche ${l} : trois phrases`, !/, \p{Lu}/u.test(m.method_coverage.subtitle) && (m.method_coverage.subtitle.match(/\./g) ?? []).length === 3, m.method_coverage.subtitle);
  }
  // Visionneuse.
  const lb = read("components/property/PropertyLightbox.tsx");
  check("visionneuse : glissement qui suit le doigt (embla)", /useEmblaCarousel\(/.test(lb) && /from "embla-carousel-react"/.test(lb));
  check("visionneuse : pincement sans changer de photo", /touches\.length > 1\) return false/.test(lb) && /isPageZoomed\(\)/.test(lb));
  check("visionneuse : touches Gauche, Droite, Echap", /"Escape"/.test(lb) && /"ArrowRight"/.test(lb) && /"ArrowLeft"/.test(lb));
  check("visionneuse : glisser vers le bas pour fermer", /CLOSE_DISTANCE/.test(lb) && /translateY/.test(lb));
  check("visionneuse : compteur et photos voisines prechargees", /gallery_counter/.test(lb) && /PRELOAD_RADIUS/.test(lb) && /loading="eager"/.test(lb));
  check("visionneuse : page derriere figee", /body\.style\.position = "fixed"/.test(lb) && /window\.scrollTo\(0, scrollY\)/.test(lb));
  check("visionneuse : branchee sur la galerie des fiches", /<PropertyLightbox/.test(read("components/property/PropertyGallery.tsx")));
  // Passkey : l'action de fin n'est plus detournee par le proxy.
  check("proxy : action serveur sur la page de connexion jamais redirigee", adminPageRedirect("/admin/login", "mfa_required", { serverAction: true }) === null && adminPageRedirect("/admin/login", "admin", { serverAction: true }) === null);
  check("proxy : navigation vers la connexion avec session toujours redirigee", adminPageRedirect("/admin/login", "mfa_required")?.path === "/admin/mfa" && adminPageRedirect("/admin/login", "admin")?.path === "/admin");
  check("proxy : action serveur hors pages publiques toujours protegee", adminPageRedirect("/admin/leads", "anonymous", { serverAction: true })?.path === "/admin/login" && adminPageRedirect("/admin/leads", "mfa_required", { serverAction: true })?.path === "/admin/mfa");
  check("proxy : detection de l'action serveur", /request\.method === "POST" && request\.headers\.has\("next-action"\)/.test(read("proxy.ts")));
  const pkc = read("components/admin/PasskeyClient.tsx");
  const startBody = pkc.slice(pkc.indexOf("const start = async"), pkc.indexOf("const label ="));
  check("Passkey : chaque appel du parcours a un delai maximal", /withTimeout\(passkeyLoginStartAction/.test(startBody) && /withTimeout\(\s*supabase\.auth\.signInWithPasskey/.test(startBody) && /withTimeout\(passkeyLoginCompleteAction/.test(startBody));
  check("Passkey : aucune attente nue d'un appel du parcours", !/await (passkeyLogin\w+Action|createSupabaseBrowserClient\(\)\.auth\.signInWithPasskey)\(/.test(startBody));
  check("Passkey : erreurs affichees et journalisees, mot de passe propose", (startBody.match(/catch \(e\)/g) ?? []).length >= 3 && /passkey_use_password/.test(pkc) && /console\.error/.test(pkc));
  check("Passkey : ceremonie annulee au delai depasse", /abort\.abort\(\)/.test(startBody));
  const pka = read("app/admin/passkey-actions.ts");
  check("Passkey : debut et reussite des etapes journalises", /reason: "turnstile:start"/.test(pka) && /turnstile:ok/.test(pka) && /reason: "complete:start"/.test(pka) && /complete:\$\{level\}/.test(pka));
  check("Passkey : etapes du navigateur acceptees seulement pendant une tentative", /if \(!\(await attemptIsOpen\(\)\)\) return/.test(pka) && /rateLimit\(/.test(pka));
  check("Passkey : aal2 jamais fabrique, lu dans le jeton Supabase", /getAuthenticatorAssuranceLevel\(\)/.test(pka) && !/aal2:\s*true/.test(pka));
}

// ===========================================================================
// O. Inactivite : jamais a cause d'une session precedente
// ===========================================================================
section = "O. Inactivite et nouvelle session";
{
  const TIMEOUT = 30 * 60_000;
  const at = (iso: string) => new Date(iso).getTime();
  const passkeyStart = at("2026-10-05T16:20:32.000Z");
  const claimsNew = { session_id: "session-nouvelle", amr: [{ method: "passkey", timestamp: Math.floor(passkeyStart / 1000) }] };
  const oldActivity = at("2026-10-05T16:20:20.365Z") - 60 * 60_000; // ancienne activite vieille d'une heure
  const base = { timeoutMs: TIMEOUT, loginInProgress: false };
  // Sequence du journal du 5 octobre (id 7 a 14).
  // id 7 : ouverture de la page de connexion avec l'ANCIENNE session, inactive depuis 1 h : deconnexion legitime.
  const id7 = evaluateAdminIdle({ ...base, now: at("2026-10-05T16:20:20.365Z"), cookieValue: `session-ancienne:${oldActivity}`, sessionId: "session-ancienne", sessionStartMs: oldActivity - 3600_000 });
  check("journal id 7 : ancienne session inactive deconnectee", id7.action === "logout");
  check("heure d'ouverture lue dans le jeton", sessionStartFromClaims(claimsNew) === passkeyStart);
  // id 11 : action serveur du parcours Passkey avec la NOUVELLE session, l'ancien cookie toujours present (deux formats).
  for (const stale of [`session-ancienne:${oldActivity}`, String(oldActivity)]) {
    for (const loginInProgress of [true, false]) {
      const d = evaluateAdminIdle({ timeoutMs: TIMEOUT, loginInProgress, now: at("2026-10-05T16:20:32.570Z"), cookieValue: stale, sessionId: claimsNew.session_id, sessionStartMs: sessionStartFromClaims(claimsNew) });
      check(`journal id 11 : nouvelle session conservee (cookie ${stale.includes(":") ? "d'une autre session" : "ancien format"}, parcours ${loginInProgress ? "en cours" : "termine"})`, d.action === "keep" && parseActivityCookie(d.action === "keep" ? d.cookieValue : "").sessionId === "session-nouvelle", JSON.stringify(d));
    }
  }
  // id 13 et 14 : fin de connexion puis ouverture de l'admin, toujours conservee.
  const id14 = evaluateAdminIdle({ ...base, now: at("2026-10-05T16:20:33.000Z"), cookieValue: `session-ancienne:${oldActivity}`, sessionId: "session-nouvelle", sessionStartMs: passkeyStart });
  check("journal id 13 et 14 : session Passkey jamais supprimee", id14.action === "keep");
  // La regle des 30 minutes reste appliquee a la session en cours.
  const lastNew = at("2026-10-05T16:20:33.000Z");
  check("29 minutes sans activite : session conservee", evaluateAdminIdle({ ...base, now: lastNew + 29 * 60_000, cookieValue: `session-nouvelle:${lastNew}`, sessionId: "session-nouvelle", sessionStartMs: passkeyStart }).action === "keep");
  check("31 minutes sans activite : deconnexion", evaluateAdminIdle({ ...base, now: lastNew + 31 * 60_000, cookieValue: `session-nouvelle:${lastNew}`, sessionId: "session-nouvelle", sessionStartMs: passkeyStart }).action === "logout");
  check("cookie expire sur une session ancienne : deconnexion", evaluateAdminIdle({ ...base, now: lastNew + 2 * 3600_000, cookieValue: undefined, sessionId: "session-nouvelle", sessionStartMs: passkeyStart }).action === "logout");
  check("parcours de connexion en cours : jamais de deconnexion", evaluateAdminIdle({ ...base, loginInProgress: true, now: lastNew + 5 * 3600_000, cookieValue: `session-nouvelle:${lastNew}`, sessionId: "session-nouvelle", sessionStartMs: passkeyStart }).action === "keep");
  // Branchement reel.
  const px = read("proxy.ts");
  check("proxy : decision d'inactivite partagee et testee", /evaluateAdminIdle\(\{/.test(px) && /supabase\.auth\.getClaims\(\)/.test(px) && /sessionStartFromClaims\(claims\)/.test(px));
  check("proxy : parcours de connexion exempte (action publique, tentative Passkey)", /isServerAction && ADMIN_PUBLIC_PATHS\.has\(pathname\)/.test(px) && /PASSKEY_ATTEMPT_COOKIE/.test(px));
  check("proxy : cookie supprime sur son propre chemin", /res\.cookies\.delete\(\{ name: ADMIN_ACTIVITY_COOKIE, path: "\/admin" \}\)/.test(px) && !/res\.cookies\.delete\(ADMIN_ACTIVITY_COOKIE\)/.test(px));
  check("proxy : deconnexion d'inactivite limitee a ce navigateur", /signOut\(\{ scope: "local" \}\)/.test(px));
  const aa = read("app/admin/auth-actions.ts");
  check("remise a zero : mot de passe, code, nouvel appareil", (aa.match(/resetAdminActivity\(supabase\)/g) ?? []).length >= 3);
  check("remise a zero : Passkey", /resetAdminActivity\(supabase\)/.test(read("app/admin/passkey-actions.ts")));
  check("remise a zero : lien e-mail (reinitialisation)", /resetAdminActivity\(supabase\)/.test(read("app/admin/auth/callback/route.ts")));
  // L'inactivite ne peut que deconnecter : jamais d'acces ni de niveau accorde.
  const idleSrc = read("lib/admin/idle.ts");
  check("inactivite : ne decide que deconnexion ou maintien, jamais aal", !/aal2|currentLevel|evaluateAdminAccess/.test(idleSrc.replace(/^\s*\/\/.*$/gm, "")) && !/from "@\/lib\/admin\/idle"/.test(read("lib/admin/admin-access.ts")));
}

// ===========================================================================
// P. Admin sur telephone (aucune largeur imposee au-dela de l'ecran)
// ===========================================================================
section = "P. Admin sur telephone";
{
  // Largeur d'ecran la plus etroite visee (telephones courants). Une
  // largeur minimale ou fixe au-dela, sans prefixe d'ecran large (sm:,
  // md:, lg:, xl:, 2xl:), ferait defiler la page de l'admin a l'horizontale.
  const SCREEN_PX = 360;
  const toPx = (n: number, unit: string) => (unit === "rem" ? n * 16 : n);
  const adminFiles = [...walk("app/admin", (x) => /\.(tsx|ts)$/.test(x)), ...walk("components/admin", (x) => /\.(tsx|ts)$/.test(x))];
  const offenders: string[] = [];
  for (const f of adminFiles) {
    const src = read(f);
    for (const m of src.matchAll(/(^|[\s"'`])((?:[a-z0-9-]+:)*)(min-w|w)-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
      const responsive = /(^|:)(sm|md|lg|xl|2xl):/.test(m[2]);
      if (!responsive && toPx(Number(m[4]), m[5]) > SCREEN_PX) offenders.push(`${f} : ${m[2]}${m[3]}-[${m[4]}${m[5]}]`);
    }
    for (const m of src.matchAll(/(^|[\s"'`])((?:[a-z0-9-]+:)*)grid-cols-\[([^\]]+)\]/g)) {
      const responsive = /(^|:)(sm|md|lg|xl|2xl):/.test(m[2]);
      const fixed = [...m[3].matchAll(/(\d+(?:\.\d+)?)(px|rem)/g)].reduce((a, x) => a + toPx(Number(x[1]), x[2]), 0);
      if (!responsive && fixed > SCREEN_PX) offenders.push(`${f} : grid-cols-[${m[3]}]`);
    }
    for (const m of src.matchAll(/\b(minWidth|width)\s*:\s*["']?(\d+)(px)?["']?/g)) {
      if (Number(m[2]) > SCREEN_PX && !/matchMedia|max-width/.test(src.slice(Math.max(0, m.index! - 40), m.index! + 40))) offenders.push(`${f} : ${m[1]} ${m[2]}`);
    }
  }
  check(`aucune page de l'admin n'impose une largeur superieure a ${SCREEN_PX} px (${adminFiles.length} fichiers)`, offenders.length === 0, offenders.slice(0, 10).join(" ; "));
  // Le controle lui-meme detecte une largeur imposee.
  const probe = 'className="min-w-[480px]" className="md:min-w-[900px]" className="grid-cols-[260px_1fr]"';
  const probeHits = [...probe.matchAll(/(^|[\s"'`])((?:[a-z0-9-]+:)*)(min-w|w)-\[(\d+)(px)\]/g)].filter((m) => !/(sm|md|lg|xl|2xl):/.test(m[2]) && Number(m[4]) > SCREEN_PX).length;
  check("controle des largeurs : detecte min-w-[480px], ignore md:", probeHits === 1);

  // Coque mobile.
  const layout = read("app/admin/layout.tsx");
  check("coque : barre laterale masquee sous 768 px, grille seulement en md", /<div className="hidden md:block">\s*<AdminSidebar \/>/.test(layout) && /md:grid md:grid-cols-\[260px_1fr\]/.test(layout));
  check("coque : en-tete compact, barre au pouce, cartes de tableaux", /<AdminMobileHeader \/>/.test(layout) && /<AdminMobileNav \/>/.test(layout) && /<AdminTableCards \/>/.test(layout));
  const nav = read("components/admin/admin-nav.ts");
  check("barre du bas : Tableau de bord, Leads, Biens, Activite commerciale", /ADMIN_THUMB_KEYS = \["dashboard", "leads", "properties", "activity"\]/.test(nav));
  const mnav = read("components/admin/AdminMobileNav.tsx");
  check("menu complet : groupes Pilotage, Gestion et Compte", /ADMIN_NAV_GROUPS\.map/.test(mnav) && /group_pilotage/.test(nav) && /group_gestion/.test(nav) && /group_compte/.test(nav));
  check("barre du bas : zones de 64 px et marge de la barre d'accueil", /min-h-16/.test(mnav) && /env\(safe-area-inset-bottom\)/.test(mnav));
  // Regles generales (feuille propre a l'admin).
  const css = read("app/admin/admin-mobile.css");
  check("feuille mobile : chargee seulement par l'admin", /import "\.\/admin-mobile\.css";/.test(layout) && ![...walk("app/[locale]", (x) => /\.(tsx|ts|css)$/.test(x)), ...walk("components", (x) => /\.(tsx|ts)$/.test(x) && !x.startsWith("components/admin/"))].some((f) => /admin-mobile\.css/.test(read(f))));
  check("feuille mobile : limitee a body[data-admin] sous 768 px", /@media \(max-width: 767\.98px\)/.test(css) && !/^\s*[^@\s/*}][^{]*\{/m.test(css.replace(/body\[data-admin\][^{]*\{[^}]*\}/g, "").replace(/html:has\(> body\[data-admin\]\)[^{]*\{[^}]*\}/g, "").replace(/@media[^{]*\{/g, "").replace(/\/\*[\s\S]*?\*\//g, "")) && /<body data-admin/.test(layout));
  check("feuille mobile : pas de defilement horizontal", /overflow-x: clip/.test(css));
  check("feuille mobile : champs a 16 px, cibles de 44 px, texte utile a 14 px minimum", /:is\(input, select, textarea\) \{\s*font-size: 16px !important;/.test(css) && /min-height: 44px;/.test(css) && /\.text-\\\[10px\\\][^{]*\{\s*font-size: 14px !important;/.test(css));
  check("feuille mobile : tableaux en cartes, aucune colonne coupee", /table\[data-cards\] td\[data-label\]::before/.test(css) && /white-space: normal !important;/.test(css));
  // Leads : actions rapides.
  const lt = read("components/admin/LeadsTable.tsx");
  check("leads : carte avec appel, e-mail, statut et note", /function LeadCard/.test(lt) && /href=\{telHref\}/.test(lt) && /mailto:\$\{lead\.email\}/.test(lt) && /updateWorkflowStatus\(lead\.id, next\)/.test(lt) && /addAdminNote\(lead\.id, note\)/.test(lt));
  check("leads : filtres et tri dans un panneau", /<AdminFilterPanel/.test(lt) && /\{sortControl\}/.test(lt));
  // Fiche d'un bien.
  const pef = read("components/admin/PropertyEditForm.tsx");
  check("fiche d'un bien : sections repliables, enregistrement toujours accessible", /<details open data-admin-section/.test(pef) && /data-admin-sticky-save/.test(pef) && /\[data-admin-sticky-save\] \{\s*position: sticky;/.test(css));
  const pm = read("components/admin/PhotoManager.tsx");
  check("photos : appareil photo ou galerie", /capture="environment"/.test(pm) && /t\("photo_gallery"\)/.test(pm));
  check("photos : reordonnancement au doigt, confirmation avant suppression", /onPointerDown=\{onHandlePointerDown\(idx\)\}/.test(pm) && /setPointerCapture/.test(pm) && /confirm\(t\("confirm_delete_photo"\)\)/.test(pm));
  // Graphiques : trace telephone a 340 unites, texte 14.
  check("graphiques : trace telephone lisible, sans largeur minimale", /const MOBILE: Layout = \{ W: 340, H: 0, padL: 44, padB: 36, font: 14/.test(read("components/admin/analytics/LineChart.tsx")) && !/min-w-\[480px\]/.test(read("components/admin/analytics/LineChart.tsx")));
  // Connexion : code a 6 chiffres.
  check("code a 6 chiffres : remplissage automatique de l'iPhone", /autoComplete="one-time-code"/.test(read("components/admin/MfaPanel.tsx")) && /inputMode="numeric"/.test(read("components/admin/MfaPanel.tsx")));
  // Ecran d'accueil : manifeste sans donnees, jamais indexe, aucun cache hors ligne.
  const mf = read("app/admin/manifest.webmanifest/route.ts");
  check("ecran d'accueil : manifeste de l'admin, perimetre /admin, non indexe", /scope: "\/admin"/.test(mf) && /"x-robots-tag": "noindex, nofollow, noarchive"/.test(mf) && /manifest: "\/admin\/manifest\.webmanifest"/.test(layout) && /appleWebApp: \{ capable: true/.test(layout));
  const sw = [...walk("app", (x) => /\.(tsx|ts|js)$/.test(x)), ...walk("components", (x) => /\.(tsx|ts|js)$/.test(x)), ...walk("public", (x) => /\.js$/.test(x))].filter((f) => /serviceWorker\.register|navigator\.serviceWorker/.test(read(f)));
  check("ecran d'accueil : aucun service worker, rien en cache hors ligne", sw.length === 0, sw.join(", "));
  // Site public inchange : aucune page publique prerendue ne charge la
  // feuille mobile de l'admin.
  if (hasBuild) {
    const adminCss = walk(".next/static/css", (x) => x.endsWith(".css")).filter((f) => /data-admin/.test(read(f))).map((f) => path.basename(f));
    const publicHtml = walk(".next/server/app", (x) => x.endsWith(".html") && !/[\\/]admin([\\/.]|$)/.test(x));
    const leaks = publicHtml.filter((f) => adminCss.some((c) => read(f).includes(c)));
    check(`site public : feuille mobile de l'admin absente de ${publicHtml.length} pages`, adminCss.length > 0 && publicHtml.length > 0 && leaks.length === 0, leaks.slice(0, 5).join(", "));
  }
  check("ecran d'accueil : manifeste hors du proxy, sans donnee", /\.\*\\\\\.\.\*/.test(read("proxy.ts")) && !/supabase|from\(/.test(mf));

  // ---------- Seconde passe telephone (oct. 2026) ----------
  // 1. Largeurs : cartes de statistiques et barres.
  const gridOffenders: string[] = [];
  const barOffenders: string[] = [];
  for (const f of adminFiles) {
    const src = read(f);
    // Grille sans nombre de colonnes de base mais avec colonnes sur ecran
    // large : piste "auto" dimensionnee sur le plus long texte non coupe.
    for (const m of src.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)) {
      const toks = m[1].split(/\s+/);
      if (!toks.includes("grid")) continue;
      const base = toks.some((x) => /^grid-cols-/.test(x));
      const wide = toks.some((x) => /^(sm|md|lg|xl|2xl):grid-cols-/.test(x));
      if (wide && !base) gridOffenders.push(`${f} : ${m[1].slice(0, 60)}`);
    }
    // Grille de cartes de statistiques : 1 ou 2 colonnes sur telephone.
    for (const m of src.matchAll(/className="([^"]*\bgrid\b[^"]*)"[^>]*>\s*<Stat\b/g)) {
      const base = m[1].split(/\s+/).find((x) => /^grid-cols-\d+$/.test(x));
      if (!base || Number(base.split("-")[2]) > 2) gridOffenders.push(`${f} : statistiques "${m[1]}"`);
    }
    // Barres : largeur toujours en pourcentage, jamais en pixels.
    for (const m of src.matchAll(/style=\{\{[^\n]*?\bwidth:\s*([^\n]*?)\s*(?:,|\}\})/g)) {
      if (!/%/.test(m[1])) barOffenders.push(`${f} : width ${m[1].trim()}`);
    }
  }
  check("statistiques et listes : aucune grille a piste automatique, cartes de statistiques sur 2 colonnes au plus", gridOffenders.length === 0, gridOffenders.slice(0, 8).join(" ; "));
  check("barres : largeur en pourcentage uniquement", barOffenders.length === 0, barOffenders.slice(0, 8).join(" ; "));
  const ui = read("components/admin/pilotage/ui.tsx");
  const tl = read("components/admin/analytics/TopList.tsx");
  check("cartes de statistiques, cartes et barres : largeur minimale nulle (texte coupe, jamais la page)",
    /min-w-0 rounded-2xl border bg-bg-soft/.test(ui) && /<article className="min-w-0/.test(ui) && /data-admin-bars/.test(tl) && /min-w-0 truncate/.test(tl) &&
    /body\[data-admin\] main \.grid > \* \{\s*min-width: 0;/.test(css));
  // Le controle detecte une grille fautive.
  const gridProbe = 'className="grid gap-4 lg:grid-cols-2" className="grid grid-cols-1 gap-4 lg:grid-cols-2"';
  const gridProbeHits = [...gridProbe.matchAll(/className="([^"]*)"/g)].filter((m) => { const k = m[1].split(" "); return k.includes("grid") && k.some((x) => /^lg:grid-cols-/.test(x)) && !k.some((x) => /^grid-cols-/.test(x)); }).length;
  check("controle des grilles : detecte une piste automatique", gridProbeHits === 1);

  // 2. Journal de securite compact.
  const jAt = (h: number) => new Date(Date.UTC(2026, 9, 6, h, 0, 0)).toISOString();
  const jEntries = [
    { at: jAt(9), source: "auth" as const, event: "mfa", actor: "julien@example.com", success: true, detail: null, ip: null },
    { at: jAt(8), source: "auth" as const, event: "login", actor: "julien@example.com", success: true, detail: null, ip: null },
    { at: jAt(7), source: "auth" as const, event: "passkey_login", actor: "julien@example.com", success: true, detail: null, ip: null },
    { at: jAt(6), source: "auth" as const, event: "login", actor: "x@example.com", success: false, detail: "bad", ip: null },
    { at: jAt(5), source: "admin" as const, event: "property_deleted", actor: "julien@example.com", success: true, detail: null, ip: null },
    { at: jAt(4), source: "admin" as const, event: "property_created", actor: "julien@example.com", success: true, detail: null, ip: null },
  ];
  const essential = journalLines(jEntries, { type: "all", result: "all", view: "essential" });
  const grouped = essential.filter((l) => l.kind === "sign_ins");
  check("journal : connexions reussies regroupees en une ligne par jour (2 connexions abouties)", grouped.length === 1 && grouped[0].kind === "sign_ins" && grouped[0].count === 2);
  check("journal : par defaut, echecs et evenements sensibles seulement", essential.length === 3 && essential.some((l) => l.kind === "event" && l.entry.event === "property_deleted") && !essential.some((l) => l.kind === "event" && l.entry.event === "property_created"));
  check("journal : filtres type et resultat", journalLines(jEntries, { type: "auth", result: "failed", view: "essential" }).length === 1 && journalLines(jEntries, { type: "admin", result: "all", view: "all" }).length === 2);
  check("journal : pages de 20", paginate(Array.from({ length: 45 }, (_, i) => i), 3).items.length === 5 && paginate(Array.from({ length: 45 }, (_, i) => i), 9).page === 3 && paginate([], 1).pages === 1);
  check("journal : compte abrege", abbreviateAccount("julien.brebion@example.com") === "jul…@example.com" && abbreviateAccount(null) === "");
  const sum = journalSummary(jEntries, 7, new Date(jAt(12)).getTime());
  check("journal : resume 7 jours", sum.signIns === 2 && sum.failures === 1 && sum.sensitive === 1);
  check("journal : parametres invalides ignores", JSON.stringify(parseJournalParams({ type: "x", result: "ok", vue: "tout", page: "2" })) === JSON.stringify({ type: "all", result: "ok", view: "all", page: 2 }));
  const jp = read("app/admin/journal/page.tsx");
  check("journal : vue telephone compacte, tableau inchange sur ordinateur", /md:hidden" data-admin-journal-mobile/.test(jp) && /<div className="hidden space-y-12 md:block">/.test(jp) && /data-admin-chips/.test(jp));

  // 3. Un seul titre par page sur telephone.
  const mh = read("components/admin/AdminMobileNav.tsx");
  check("titre unique : l'en-tete reprend le h1, masque dans la page avec son surtitre", /main\[data-admin-main\] h1/.test(mh) && /MutationObserver/.test(mh) &&
    /main\[data-admin-main\] h1 \{\s*position: absolute;/.test(css) && /:is\(p, div\):has\(\+ h1\) \{\s*display: none;/.test(css) && /h1 \+ p \{[^}]*-webkit-line-clamp: 1;/.test(css));

  // 4. Filtres sur une ligne, tri dans le panneau.
  const chipPages = ["app/admin/mandats/page.tsx", "app/admin/liste-attente/page.tsx", "app/admin/leads/page.tsx", "app/admin/properties/page.tsx", "app/admin/ventes-realisees/page.tsx", "app/admin/arcova/page.tsx", "app/admin/offmarket/requests/page.tsx"];
  const noChips = chipPages.filter((f) => !/data-admin-chips/.test(read(f)));
  check("filtres de statut et de type : ligne defilante (Mandats, Liste d'attente, Leads, Biens, Ventes, ARCOVA, Off-Market)", noChips.length === 0 && /AdminFilterPanel/.test(read("components/admin/OffmarketListFilters.tsx")), noChips.join(", "));
  check("filtres : ligne defilante avec marges internes de 16 px", /\[data-admin-chips\] \{\s*flex-wrap: nowrap !important;\s*overflow-x: auto;\s*margin-inline: -16px;\s*padding: 2px 16px 6px;/.test(css));
  const sortPages = ["app/admin/mandats/page.tsx", "app/admin/liste-attente/page.tsx", "app/admin/estimations/page.tsx"];
  const sortOut = sortPages.filter((f) => !/<AdminMobileFilterPanel>/.test(read(f)));
  check("tri : dans le panneau Filtres et tri sur telephone (Mandats, Liste d'attente, Estimations, Leads)", sortOut.length === 0 && /\{sortControl\}/.test(read("components/admin/LeadsTable.tsx")) &&
    /hidden items-center gap-2 rounded-full md:inline-flex/.test(read("app/admin/mandats/page.tsx")) && /<div className="hidden md:block">\s*<DateSortToggle basePath="\/admin\/estimations"/.test(read("app/admin/estimations/page.tsx")), sortOut.join(", "));

  // 5. Cartes compactes et vrais interrupteurs.
  const swSrc = read("components/admin/AdminSwitch.tsx");
  check("interrupteurs : role switch, piste et curseur distincts, zone de 44 px sur le bouton exterieur", /role="switch"/.test(swSrc) && /aria-checked=\{checked\}/.test(swSrc) && /data-track/.test(swSrc) && /data-thumb/.test(swSrc) &&
    /\[data-admin-switch\] \{\s*min-height: 44px;\s*min-width: 44px;/.test(css) && /\[data-admin-switch\] \[data-track\] \{\s*width: 52px;\s*height: 32px;/.test(css));
  const oldSwitch = adminFiles.filter((f) => f !== "components/admin/AdminSwitch.tsx" && /<button[^>]*className=\{?`[^`]*relative inline-flex h-6 w-10/.test(read(f)));
  check("interrupteurs : plus de bouton dessine deforme par les 44 px", oldSwitch.length === 0, oldSwitch.join(", "));
  const lc = read("components/admin/AdminListCard.tsx");
  const cardLists = { Biens: "components/admin/PropertiesTable.tsx", Documents: "components/admin/DocumentsManager.tsx", Blog: "app/admin/blog/page.tsx", Avis: "app/admin/reviews/page.tsx" };
  const noCard = Object.entries(cardLists).filter(([, f]) => !/AdminListCard|card: \{/.test(read(f))).map(([k]) => k);
  check("listes : cartes compactes (vignette, titre, une ligne, actions sur une ligne) sur Biens, Blog, Documents, Avis", noCard.length === 0 && /size-16 shrink-0/.test(lc) && /data-admin-card-actions/.test(lc) &&
    /<ul className="space-y-3 md:hidden" data-admin-list-cards>/.test(read("components/admin/SimpleTable.tsx")) && /\[data-admin-card-actions\] > div:first-child \{\s*flex-wrap: nowrap !important;/.test(css), noCard.join(", "));

  // 6. Images du blog.
  const bf = read("components/admin/BlogPostForm.tsx");
  const ba = read("app/admin/blog/actions.ts");
  check("blog : apercu de la couverture, appareil photo ou galerie, adresse web en option", /data-admin-blog-cover/.test(bf) && /capture="environment"/.test(bf) && /onError=\{\(\) => setCoverBroken\(true\)\}/.test(bf) && /name="cover_image"/.test(bf));
  check("blog : envoi d'image garde aal2, bucket blog-covers, image reconvertie", /export async function uploadBlogImage[\s\S]{0,120}const admin = await requireAdmin\(\);\s*if \(!admin\.ok\) return/.test(ba) && /COVER_BUCKET = "blog-covers"/.test(ba) && /processUploadedImage/.test(ba));
  check("blog : couverture affichable (https ou chemin du site), hote non optimise charge directement",
    displayableImageSrc("assets/x.jpg") === null && displayableImageSrc("http://a/b.jpg") === null && displayableImageSrc("https://a/b.jpg") === "https://a/b.jpg" &&
    isOptimizedImageSrc("https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/blog-covers/a.webp") && !isOptimizedImageSrc("https://example.com/a.jpg") &&
    ["app/[locale]/blog/page.tsx", "components/blog/BookletReader.tsx", "components/home/BlogTeaser.tsx"].every((f) => /unoptimized=\{!isOptimizedImageSrc/.test(read(f))));
  const cleaned = sanitizeArticleForTest('<img data-src="https://a/b.jpg" src="data:image/gif;base64,R0"><img src="assets/c.jpg"><script>x</script>');
  check("blog : image du texte a chargement differe recuperee, image relative retiree, script retire", /src="https:\/\/a\/b\.jpg"/.test(cleaned) && !/assets\/c/.test(cleaned) && !/script/.test(cleaned));
  const sqlRead = read("supabase/manual/execution/11_blog_images_lecture.sql").replace(/--.*$/gm, "");
  check("blog : fichier SQL de diagnostic en lecture seule", /storage\.objects/.test(sqlRead) && !/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(sqlRead));

  // 7. Editeur visuel et nettoyage.
  check("blog : editeur visuel (tiptap deja installe), plus de saisie HTML brute par defaut", /<BlogBodyEditor/.test(bf) && !/name=\{`content_\$\{lang\}`\}/.test(bf) && /from "@tiptap\/react"/.test(read("components/admin/BlogBodyEditor.tsx")));
  check("blog : texte nettoye cote serveur a l'enregistrement", /content_fr: cleanBody\(formData\.get\("content_fr"\)\)/.test(ba) && /sanitizeArticleHtml\(String\(v \?\? ""\)\)/.test(ba));
  const sqlDash = read("supabase/manual/execution/12_blog_tirets.sql");
  check("blog : fichier SQL des tirets rejouable, sauvegarde prealable, tableau final, aucun tiret ecrit",
    /IF to_regclass\('public\.blog_posts_sauvegarde_tirets_20261006'\) IS NULL/.test(sqlDash) && /CREATE TABLE public\.blog_posts_sauvegarde_tirets_20261006 AS TABLE public\.blog_posts/.test(sqlDash) &&
    /chr\(8212\)/.test(sqlDash) && /chr\(8211\)/.test(sqlDash) && !/[\u2013\u2014]/.test(sqlDash) && /FROM tirets_resultat/.test(sqlDash.slice(sqlDash.lastIndexOf("COMMIT;"))));

  // 8. Barre du bas et textes d'aide.
  const thumbOk = (["fr", "en", "de"] as const).every((l) => {
    const n = JSON.parse(read(`messages/${l}.json`)).admin_nav;
    return ["thumb_dashboard", "thumb_leads", "thumb_properties", "thumb_activity", "thumb_menu"].every((k) => typeof n[k] === "string" && n[k].length <= 10);
  });
  const fr = JSON.parse(read("messages/fr.json")).admin_nav;
  check("barre du bas : Accueil, Leads, Biens, Activite, Menu (trois langues, une ligne)", thumbOk && fr.thumb_dashboard === "Accueil" && fr.thumb_activity === "Activité" && /t\(`thumb_\$\{item\.key\}`\)/.test(mnav) && /line-clamp-1/.test(mnav));
  const clickTexts = (["fr", "en", "de"] as const).flatMap((l) => {
    const all = JSON.parse(read(`messages/${l}.json`));
    const out: string[] = [];
    const walkMsg = (o: unknown, p: string) => {
      if (typeof o === "string") { if (/\b(cliqu|clic\b|click|klick)/i.test(o) && !/col_clicks/.test(p)) out.push(`${l}:${p}`); return; }
      if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walkMsg(v, p ? `${p}.${k}` : k);
    };
    for (const [ns, v] of Object.entries(all)) if (ns.startsWith("admin_")) walkMsg(v, ns);
    return out;
  });
  check("textes d'aide de l'admin : aucun \"cliquez\" (geste tactile)", clickTexts.length === 0, clickTexts.join(", "));

  // Julien Brebion, seul agent et seul contact (oct. 2026). Le nom de
  // Frederic Mannis ne reste que dans les textes juridiques (lib/legal/ :
  // gerant de la societe, referent RGPD), en attente de decision de Julien.
  const nameRe = /fr[eé]d[eé]ric|mannis/i;
  const codeFiles = [...walk("app", (x) => /\.(tsx?|css)$/.test(x)), ...walk("components", (x) => /\.(tsx?)$/.test(x)), ...walk("lib", (x) => /\.tsx?$/.test(x) && !x.startsWith("lib/legal/"))];
  const nameInCode = codeFiles.filter((f) => nameRe.test(read(f).replace(/^\s*\/\/.*$/gm, "")));
  check("Frederic : absent du code de l'admin et du site (hors textes juridiques)", nameInCode.length === 0, nameInCode.join(", "));
  const nameInMessages = (["fr", "en", "de"] as const).filter((l) => nameRe.test(read(`messages/${l}.json`)));
  check("Frederic : absent des libelles (trois langues)", nameInMessages.length === 0, nameInMessages.join(", "));
  check("ventes : Julien seul agent propose et accepte", /ALLOWED_AGENTS = new Set\(\["julien"\]\)/.test(read("lib/admin/sales-auth.ts")) && /type Agent = "julien";/.test(read("app/admin/ventes-realisees/SaleForm.tsx")) && /KNOWN_AGENTS = \["julien"\]/.test(read("app/admin/ventes-realisees/page.tsx")));
  check("contact : seul le contact de Julien peut etre revele", !/MAPA_PHONE_FREDERIC|"frederic"/.test(read("app/api/contact-reveal/route.ts")));
  const sqlAgent = read("supabase/manual/execution/13_ventes_agent_julien.sql");
  // Avis clients (oct. 2026) : uniquement les colonnes reelles de
  // public.reviews, relevees en base par Julien.
  const REVIEWS_IN_DB = ["id", "name", "rating", "review_date", "comment", "comment_en", "comment_de", "source_lang", "source", "is_published", "apimo_id_link", "created_at"];
  check("avis : liste des colonnes identique a la base", JSON.stringify([...REVIEW_COLUMNS].sort()) === JSON.stringify([...REVIEWS_IN_DB].sort()));
  const reviewWrites = (["fr", "en", "de"] as const).flatMap((lang) => [
    buildReviewWrite({ name: "A", rating: "5", review_date: "2026-10-06", lang, text: "Tres bien", carousel: true }),
    buildReviewWrite({ name: "A", rating: "4", review_date: "2026-10-06", lang, text: "Tres bien", carousel: false, previous_lang: lang === "fr" ? "en" : "fr" }),
  ]);
  const badCols = reviewWrites.flatMap((w) => (w.ok ? Object.keys(w.data) : ["(saisie refusee)"])).filter((k) => !REVIEWS_IN_DB.includes(k));
  check("avis : le formulaire n'ecrit que dans les colonnes de la table", badCols.length === 0, [...new Set(badCols)].join(", "));
  const wEn = buildReviewWrite({ name: "A", rating: "5", review_date: "2026-10-06", lang: "en", text: "Great", carousel: false, previous_lang: "fr" });
  check("avis : texte dans la colonne de la langue, langue dans source_lang, carrousel dans is_published",
    wEn.ok && wEn.data.comment_en === "Great" && wEn.data.source_lang === "en" && wEn.data.is_published === false && wEn.data.comment === null && !("lang" in wEn.data));
  check("avis : saisies invalides refusees avec un motif", ["0", "6", "x"].every((r) => { const w = buildReviewWrite({ name: "A", rating: r, review_date: "2026-10-06", lang: "fr", text: "t", carousel: true }); return !w.ok && w.error === "err_rating"; }) &&
    !buildReviewWrite({ name: "A", rating: "5", review_date: "2026-10-06", lang: "it", text: "t", carousel: true }).ok);
  const ra = read("app/admin/reviews/actions.ts");
  const extraKeys = [...ra.matchAll(/\.(?:insert|update)\(\{\s*\.\.\.built\.data,?\s*([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/([a-z_]+)\s*:/g)].map((x) => x[1])).filter((k) => !REVIEWS_IN_DB.includes(k));
  check("avis : actions sans colonne ajoutee hors de la table, plus d'ancien envoi \"lang\"", extraKeys.length === 0 && !/buildReviewPayload|\blang:\s*String/.test(ra) && /buildReviewWrite\(readForm\(formData\)\)/.test(ra), extraKeys.join(", "));
  const reviewReadFiles = ["lib/data.ts", "app/admin/reviews/page.tsx", "app/admin/reviews/[id]/edit/page.tsx"];
  const badRead = reviewReadFiles.flatMap((f) => [...read(f).matchAll(/from\("reviews"\)\s*\.select\("([^"]*)"\)/g)].flatMap((m) => m[1] === "*" ? [`${f} : *`] : m[1].split(",").map((c) => c.trim()).filter((c) => !REVIEWS_IN_DB.includes(c)).map((c) => `${f} : ${c}`)));
  check("avis : lectures limitees aux colonnes de la table", badRead.length === 0, badRead.join(", "));
  const rf = read("components/admin/ReviewForm.tsx");
  const formNames = [...rf.matchAll(/\bname="([a-z_]+)"/g)].map((m) => m[1]);
  check("avis : champs du formulaire connus de l'action", formNames.length > 0 && formNames.every((n) => ["name", "rating", "review_date", "lang", "text", "carousel", "previous_lang"].includes(n)), formNames.join(", "));
  check("avis : texte public dans la langue de la page, sinon l'original", reviewTextFor({ id: 1, name: "A", rating: 5, review_date: null, comment: null, comment_en: "Great", comment_de: null, source_lang: "en", is_published: true }, "fr") === "Great" &&
    reviewTextFor({ id: 1, name: "A", rating: 5, review_date: null, comment: "Bien", comment_en: "Good", comment_de: null, source_lang: "fr", is_published: true }, "en") === "Good" && /reviewTextFor\(r, locale\)/.test(read("components/home/ReviewsCarousel.tsx")));
  check("erreurs de base : motif clair (colonne inconnue, regle d'acces, valeur manquante)", dbErrorReason({ code: "PGRST204", message: "Could not find the 'lang' column of 'reviews' in the schema cache" }).value === "lang" &&
    dbErrorReason({ code: "42501", message: "new row violates row-level security policy" }).key === "db_forbidden" && dbErrorReason({ code: "23502", message: 'null value in column "id" violates not-null constraint' }).value === "id");
  check("avis et blog : plus de message d'erreur generique", !/save_error|delete_error/.test(rf + read("components/admin/BlogPostForm.tsx")) && /setError\(r\.error\)/.test(rf) && /setError\(r\.error\)/.test(read("components/admin/BlogPostForm.tsx")));
  check("ventes : fichier SQL de reattribution avec sauvegarde prealable et tableau avant et apres", /CREATE TABLE public\.mapa_historical_sales_sauvegarde_agent_20261006 AS TABLE public\.mapa_historical_sales/.test(sqlAgent) &&
    /SET agent = 'julien'\s*WHERE agent = 'frederic'/.test(sqlAgent) && /ventes_avant[\s\S]*ventes_apres/.test(sqlAgent.slice(sqlAgent.lastIndexOf("COMMIT;"))));
}

// ===========================================================================
// R. Avis de valeur PDF (mission C, oct. 2026)
// ===========================================================================
async function valueOpinionChecks() {
  section = "R. Avis de valeur PDF";
  const sample = {
    id: "3f9a21c0-aaaa-bbbb-cccc-000000000000",
    created_at: "2026-10-01T10:00:00Z",
    contact_name: "Client Test",
    inputs: { type: "appartement", commune: "Strassen", surfaceLiving: 92, terrace: 12, terraceSurface: 12, bedrooms: 2, state: "good", energy: "B", rentData: { rentPerM2Month: 31.2, yieldRate: 0.03 }, comparablesPpsqm: [7710.843, 8020.1], email: "client@example.com" },
    client_output: { price_low: 690000, price_mid: 760000, price_high: 830000, confidence: "MEDIUM" },
    internal_output: {
      computed_at: "2026-10-01T10:00:00Z",
      std_deviation_pct: 6.4,
      weights_used: { observatoire: 0.5, sales_comparison: 0.3, income_capitalization: 0.2, depreciated_replacement: 0.1 },
      methods: {
        observatoire: { applicable: true, price: 770000, details: { base_per_m2: 8100 } },
        sales_comparison: { applicable: true, price: 745000, details: { n_comparables_used: 6, median_ppsqm: 7710.843 } },
        income_capitalization: { applicable: true, price: 760000, details: { rent_per_m2_month: 31.2, yield_used: 0.03 } },
        depreciated_replacement: { applicable: false, price: null, details: {} },
      },
    },
  };
  const FORBIDDEN = /tegova|\bevs\b|[\u2013\u2014]|fr[eé]d[eé]ric|mannis/i;
  for (const lang of VALUE_OPINION_LANGS) {
    const messages = JSON.parse(read(`messages/${lang}.json`));
    const texts: string[] = [];
    const pdf = await buildValueOpinionPdf(sample, lang, messages, new Date("2026-10-06T10:00:00Z"), texts);
    const raw = pdf.toString("latin1");
    const pages = (raw.match(/\/Type \/Page\b/g) ?? []).length;
    const all = texts.join("\n");
    const bad = texts.filter((x) => FORBIDDEN.test(x));
    check(`avis de valeur ${lang} : PDF valide de 9 pages`, raw.startsWith("%PDF-") && pages === 9, `${pages} pages`);
    check(`avis de valeur ${lang} : ni TEGoVA, ni EVS, ni tiret long ou moyen, ni Frederic Mannis`, bad.length === 0 && !/tegova|\(EVS|\bEVS\b/i.test(raw), bad.slice(0, 3).join(" | "));
    const vo = messages.value_opinion;
    check(`avis de valeur ${lang} : titre, sous-titre, mention "pas une expertise", signataire unique`,
      all.includes(vo.title) && all.includes(vo.subtitle) && all.includes(vo.not_expertise) && all.includes("Julien Brebion") && all.includes("Real Estate Director") && all.includes(vo.brand_line) && all.includes("26 Rue du Commerce, L-3450 Dudelange"));
    check(`avis de valeur ${lang} : contexte de marche titre "${vo.s_market.split(",")[0]}, [date]" seulement`, texts.some((x) => x === vo.s_market.replace("{date}", "") + x.slice(vo.s_market.indexOf("{date}"))) && !/STATEC|Observatoire/.test(texts.filter((x) => x.startsWith(vo.s_market.split(",")[0])).join("")));
    check(`avis de valeur ${lang} : aucune coordonnee du client ni numero de telephone`, !/client@example\.com|\+352|@mapagroup/i.test(all));
    check(`avis de valeur ${lang} : poids reels (50, 30, 20, 0) et valeur ponderee 760 500`, ["50", "30", "20", "0"].every((w) => all.includes(voPercent(Number(w) / 100, lang, 0))) && all.includes(voPrice(760500, lang)));
    check(`avis de valeur ${lang} : prix au m² formate, rendement en pourcentage, terrasse une fois`, all.includes(voPrice(7711, lang)) && all.includes(voPercent(0.03, lang, 2)) && !/7710[.,]84/.test(all) && !/\b0[.,]03\b/.test(all) && (texts.filter((x) => x === messages.admin_estimations.inputs.terrace).length === 1));
  }
  // Fiche de l'admin : memes corrections (alias et objets).
  const entries = estimationInputEntries({ terrace: 12, terraceSurface: 12, rentData: { rentPerM2Month: 31.2, yieldRate: 0.03 } });
  check("fiche d'estimation : terrasse une seule fois, loyer et rendement separes", entries.filter(([k]) => /terrace/i.test(k)).length === 1 && entries.some(([k]) => k === "yieldRate") && !entries.some(([k]) => k === "rentData"));
  const route = read("app/api/admin/exports/estimations/[id]/avis-de-valeur/route.ts");
  check("avis de valeur : admin aal2, debit limite, journal, aucun stockage", /const admin = await requireAdminRoute\(\);\s*if \(!admin\.ok\) return admin\.response;/.test(route) && /rateLimit\(req,/.test(route) && /action: "estimation_value_opinion"/.test(route) && !/storage\.from|\.upload\(/.test(route));
  const visible = (["fr", "en", "de"] as const).filter((l) => /tegova|\bEVS\b/i.test(read(`messages/${l}.json`)));
  check("TEGoVA et EVS absents des libelles (trois langues)", visible.length === 0, visible.join(", "));
}

// ===========================================================================
// Q. Performance mobile et diffusion (garde-fous)
// ===========================================================================
section = "Q. Performance mobile et diffusion";
{
  const src = [...walk("app", (x) => /\.(ts|tsx)$/.test(x)), ...walk("components", (x) => /\.(ts|tsx)$/.test(x)), ...walk("lib", (x) => /\.(ts|tsx)$/.test(x))];
  const misuse = src.filter((f) => [...read(f).matchAll(/useTranslations\(\s*["']([\w]+)/g)].some((m) => SERVER_ONLY_NAMESPACES.has(m[1])));
  check("messages : aucun namespace serveur lu par useTranslations", misuse.length === 0, misuse.join(", "));
  const sample = clientMessages({ admin_leads: {}, hero: {}, nav: {} });
  check("messages : admin et namespaces serveur jamais envoyes au navigateur", Object.keys(sample).join(",") === "nav");
  const layout = read("app/[locale]/layout.tsx");
  check("layout public : messages filtres", /clientMessages\(\(await getMessages\(\)\)/.test(layout));
  check("layout public : aucun preconnect vers Apimo, Supabase ou Cloudflare", !/rel="preconnect"/.test(layout));
  check("layout public : police des etiquettes non prechargee", /preload: false/.test(layout));
  const banner = read("components/consent/CookieConsentBanner.tsx");
  check("banniere cookies : rendue dans le HTML, masquee avant affichage si choix", !/setMounted/.test(banner) && /useState\(true\)/.test(banner) && /CONSENT_DECIDED_SCRIPT/.test(layout) && /html\.consent-decided \[data-consent-banner\]/.test(read("app/globals.css")));
  check("Turnstile : charge a l'approche du formulaire ou au premier geste", /new IntersectionObserver/.test(read("components/ui/Turnstile.tsx")) && /"pointerdown", "keydown", "focusin"/.test(read("components/ui/Turnstile.tsx")));
  check("logos et pastille du chatbot : jamais precharges", !/<Logo[^>]*priority/.test(read("components/layout/Header.tsx")) && /fetchPriority="low"/.test(read("components/chatbot/ChatbotBubble.tsx")) && /fetchPriority=\{priority \? undefined : "low"\}/.test(read("components/brand/Logo.tsx")));
  if (hasBuild && fs.existsSync(path.join(ROOT, ".next/server/app/fr.html"))) {
    const home = read(".next/server/app/fr.html");
    const preloads = (home.match(/<link rel="preload" as="image"/g) ?? []).length;
    check("accueil : une seule image prechargee (image principale)", preloads === 1 && /mapa-showcase-poster/.test(home.match(/<link rel="preload" as="image"[^>]*>/)?.[0] ?? ""), `${preloads} images prechargees`);
    check("accueil : aucun message de l'admin dans le HTML", !/"admin_[a-z]+":/.test(home));
    check("accueil : banniere cookies presente dans le HTML servi", /data-consent-banner/.test(home));
  }
  // IndexNow : envoi apres la reponse, jamais bloquant ; cle publique servie seulement si definie.
  const inx = read("lib/indexnow.ts");
  check("IndexNow : envoi apres la reponse et journalise", /after\(async \(\) =>/.test(inx) && /recordCronRun\("indexnow"/.test(inx) && !/user-agent/i.test(inx));
  check("IndexNow : active seulement par INDEXNOW_KEY et hors beta", /process\.env\.INDEXNOW_KEY/.test(inx) && /SITE_URL\.includes\("beta\."\)/.test(inx));
  check("IndexNow : fichier de cle a la racine", /source: "\/:key\(\[a-f0-9\]\{8,128\}\)\.txt"/.test(read("next.config.ts")));
  // Chatbot : adresse publique de Dudelange, jamais celle de Luxembourg-Ville.
  const kb = read("components/chatbot/chatbot-knowledge.ts");
  check("chatbot : adresse publique de Dudelange dans les trois langues", (kb.match(/26 Rue du Commerce, L-3450 Dudelange/g) ?? []).length === 3);
  check("chatbot : adresse de Luxembourg-Ville jamais communiquee", /dont l'adresse n'est JAMAIS communiquée/.test(kb) && /NEVER disclosed/.test(kb) && /NIE mitgeteilt/.test(kb) && !/n'apparaît que dans les pages légales|only appears on legal pages|nur im Impressum/.test(kb));
  check("accueil : image principale servie par le site, pas par r2.dev", !/r2\.dev/.test(read("components/home/Hero.tsx").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")) && /HeroPoster/.test(read("components/home/Hero.tsx")) && /\/images\/hero\/mapa-showcase-poster/.test(read("components/home/HeroPoster.tsx")));
  check("IndexNow : biens et articles signales", /revalidatePublicBlogPages\(id\)/.test(read("app/admin/blog/actions.ts")) && /scheduleIndexNow/.test(read("lib/revalidate-property.ts")));
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
    for (const p of ["/admin", "/admin/leads", "/admin/securite", "/admin/documents", "/admin/activite", "/admin/trafic", "/admin/sante", "/admin/journal"]) {
      const r = await server.request(p);
      const loc = r.headers["location"] ?? "";
      check(`${p} anonyme : redirection vers la connexion`, r.status >= 300 && r.status < 400 && /\/admin\/login/.test(loc), `statut ${r.status} location ${loc}`);
      check(`${p} : jamais en cache, jamais indexe`, /no-store/.test(r.headers["cache-control"] ?? "") && /noindex/.test(r.headers["x-robots-tag"] ?? ""));
    }
    // Pages publiques servies : aucune coordonnee en clair dans le HTML.
    let verified = 0;
    const unverified: string[] = [];
    for (const p of ["/fr", "/en", "/de", "/fr/contact", "/fr/qui-sommes-nous", "/fr/biens", "/fr/off-market", "/fr/legal/mentions-legales", "/fr/legal/cgv", "/fr/legal/rgpd", "/fr/services/vendre", "/fr/services/estimer", "/fr/services/simulateurs/financement", "/fr/liste-attente", "/fr/biens/86388715"]) {
      const r = await server.request(p);
      // 598/599 : page non rendue (delai depasse sans acces a la base,
      // ex. bac a sable hors reseau) : non verifiee, jamais comptee OK.
      if (r.status >= 590) {
        unverified.push(`${p} (${r.status})`);
        continue;
      }
      const hits = forbiddenHits(r.body ?? "");
      check(`${p} : aucune coordonnee en clair dans le HTML (statut ${r.status})`, hits.length === 0, hits.join(", "));
      verified++;
    }
    check(`pages publiques verifiees : ${verified}`, verified >= 10, `non rendues : ${unverified.join(", ")}`);
    if (unverified.length) console.log(`  (non rendues, donc non verifiees ici : ${unverified.join(", ")})`);
    const h = await server.request("/api/health");
    for (const name of REQUIRED_HEADERS) {
      check(`en-tete servi : ${name}`, Boolean(h.headers[name.toLowerCase()]), `absent de /api/health (statut ${h.status})`);
    }
    check("en-tete servi : CSP frame-ancestors", /frame-ancestors/.test(h.headers["content-security-policy"] ?? ""));
  } finally {
    await server.close();
  }
}

valueOpinionChecks()
  .catch((e) => check("avis de valeur PDF", false, String(e)))
  .then(runtime)
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

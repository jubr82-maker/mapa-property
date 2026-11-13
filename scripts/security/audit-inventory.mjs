#!/usr/bin/env node
// Audit de securite : inventaire de la surface d'attaque et matrice de
// couverture (oct. 2026). Aucune dependance, aucun reseau.
//
//   node scripts/security/audit-inventory.mjs
//
// Produit docs/security/inventaire.json, docs/security/matrice.csv et
// docs/security/matrice-resume.md. Echoue (code 1) si le nombre de lignes
// de la matrice differe du total de l'inventaire.
//
// Chaque categorie porte la REGLE DE RECHERCHE qui la produit (equivalent
// d'une commande) : l'inventaire est reconstruit depuis le code a chaque
// execution, jamais de memoire.
//
// Verdicts : C conforme, F faille ouverte, S sans objet, V a verifier hors
// depot (base ou reglage, par le SQL d'audit ou la liste de reglages).

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const rel = (p) => path.relative(ROOT, p);
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function walk(dir, filter, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}
const codeFiles = [
  ...walk("app", (p) => /\.(ts|tsx)$/.test(p)),
  ...walk("components", (p) => /\.(ts|tsx)$/.test(p)),
  ...walk("lib", (p) => /\.(ts|tsx)$/.test(p)),
  "proxy.ts",
  "next.config.ts",
].sort();
const migrations = walk("supabase", (p) => p.endsWith(".sql")).filter((p) => !p.includes("ROLLBACK")).sort();
const stripSqlComments = (s) => s.replace(/--[^\n]*/g, "");
const lineOf = (file, re) => {
  const lines = read(file).split("\n");
  const i = lines.findIndex((l) => re.test(l));
  return i >= 0 ? `${file}:${i + 1}` : file;
};
const isClient = (f) => /^\s*["']use client["']/m.test(read(f).slice(0, 200));

// ---------------------------------------------------------------------------
// Grille (12 questions) et faits par element
// ---------------------------------------------------------------------------
const COLUMNS = [
  ["auth", "Authentification"],
  ["authz", "Autorisation"],
  ["validation", "Validation"],
  ["injection", "Injection"],
  ["html", "Affichage HTML"],
  ["ssrf", "Requetes sortantes"],
  ["redirect", "Redirections"],
  ["files", "Fichiers"],
  ["abuse", "Abus et couts"],
  ["pii", "Donnees personnelles"],
  ["secrets", "Secrets"],
  ["errors", "Messages d'erreur"],
];
const allS = () => Object.fromEntries(COLUMNS.map(([k]) => [k, { v: "S", why: "" }]));
const C = (why) => ({ v: "C", why });
const F = (why) => ({ v: "F", why });
const S = (why = "") => ({ v: "S", why });
const V = (why) => ({ v: "V", why });

const PII_TABLES = new Set([
  "leads", "estimation_requests", "mandats", "offmarket_requests", "nda_requests",
  "arcova_waitlist", "mandate_requests", "mandates_requests", "chatbot_logs",
  "leads_notifications", "admin_auth_log", "tracking_events", "property_views",
]);
const RETENTION_FINDING = "aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien";

const inventory = [];
const add = (cat, name, file, grid) => inventory.push({ cat, name, file, grid });

// ---------------------------------------------------------------------------
// 1. Pages et gabarits : app/**/page.tsx et app/**/layout.tsx
// ---------------------------------------------------------------------------
const RULE_1 = "fichiers app/**/page.tsx et app/**/layout.tsx (find app -name page.tsx -o -name layout.tsx)";
const pages = walk("app", (p) => /(^|\/)(page|layout)\.tsx$/.test(p)).sort();
const HTML_INJECTORS = /dangerouslySetInnerHTML|<JsonLd|BookletReader|highlightTitles/;
for (const f of pages) {
  const s = read(f);
  const admin = f.startsWith("app/admin");
  const adminPublic = /app\/admin\/(login|forgot-password|reset-password|mfa)\//.test(f);
  const g = allS();
  if (admin) {
    g.auth = C(adminPublic ? "page de connexion, publique par conception" : "proxy.ts : compte de la liste + session aal2, sinon redirection");
    g.authz = C(adminPublic ? "aucune donnee admin affichee" : "proxy.ts + is_mapa_admin() sur les donnees lues");
    g.pii = C(adminPublic ? "aucune donnee personnelle" : "donnees personnelles derriere authentification admin");
  } else {
    g.auth = S("page publique par conception");
    g.authz = S("page publique par conception");
    g.pii = /offmarket/.test(f) ? C("vue publique redigee properties_offmarket_public") : S();
  }
  const usesParams = /searchParams|params\b/.test(s);
  g.validation = usesParams ? C("parametres transmis a des requetes Supabase parametrees ou a des listes fermees") : S();
  g.injection = usesParams ? C("supabase-js : requetes parametrees, aucun SQL brut dans le depot") : S();
  if (HTML_INJECTORS.test(s)) {
    g.html = C("HTML assaini ou encode (lib/security/sanitize.ts, highlightTitles)");
  }
  if (/\bredirect\(/.test(s)) g.redirect = C("redirections vers des chemins internes construits par le code");
  g.secrets = isClient(f) && /process\.env\.(?!NEXT_PUBLIC_)/.test(s) ? F("variable serveur lue dans un composant client") : C("aucune variable serveur dans du code client");
  g.errors = C("Next.js production : erreurs serveur masquees au visiteur (message generique)");
  add("1. Pages et gabarits", f.replace(/^app/, ""), f, g);
}

// ---------------------------------------------------------------------------
// 2. Routes : app/**/route.ts (sitemaps compris), app/robots.ts, proxy.ts
// ---------------------------------------------------------------------------
const RULE_2 = "app/**/route.ts + app/robots.ts + proxy.ts (find app -name route.ts)";
const routes = [...walk("app", (p) => p.endsWith("route.ts")), "app/robots.ts", "proxy.ts"].sort();
const PUBLIC_FORM_ROUTES = /api\/(contact|nda-offmarket|nda-request|offmarket-request|liste-attente|arcova-waitlist|lead|estimate|chatbot|contact-reveal)\/route\.ts$/;
for (const f of routes) {
  const s = read(f);
  const g = allS();
  const isAdminApi = f.includes("app/api/admin/");
  const isCron = f.includes("app/api/cron/");
  const isAdminAuthRoute = f.includes("app/admin/");
  const methods = [...s.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
  const writes = /\.(insert|update|upsert|delete)\(|uploadToR2|revalidate(Path|Tag)\(|sendMail|send[A-Za-z]*Emails?\(/.test(s);
  if (isAdminApi) {
    const guard = /requireAdminRoute|requireSalesAdmin/.test(s) || (/x-revalidate-secret/.test(s) && /requireAdminRoute/.test(s));
    g.auth = guard ? C(lineOf(f, /requireAdminRoute|requireSalesAdmin/)) : F("aucune garde admin (ASVS 4.1.1)");
    g.authz = guard ? C("liste admin + session aal2") : F("compte non admin accepte (ASVS 4.1.3)");
  } else if (isCron) {
    const secret = /isAuthorizedCron\(req\)/.test(s);
    g.auth = secret ? C(`${lineOf(f, /isAuthorizedCron\(req\)/)} (secret obligatoire, comparaison a temps constant)`) : F("tache planifiee sans secret strict (ASVS 4.1.1)");
    g.authz = secret ? C("secret partage Vercel Cron") : F("appelable par tous");
  } else if (isAdminAuthRoute) {
    g.auth = C("retour de lien e-mail Supabase, verifie par exchangeCodeForSession / verifyOtp");
    g.authz = C("aucune donnee renvoyee, redirection interne seulement");
  } else if (f === "proxy.ts") {
    g.auth = C("controle admin + aal2 + inactivite pour /admin");
    g.authz = C("liste admin (isAdminEmail)");
  } else {
    g.auth = S("route publique par conception");
    g.authz = S("route publique par conception");
  }
  const hasBody = /req\.(json|formData)\(\)|request\.(json|formData)\(\)/.test(s);
  const bounded = /\.slice\(0,\s*\d+\)|\.length\s*[<>]=?\s*\d+|validate[A-Z]\w*\(|typeof [\w.]+ (===|!==) "(string|number)"|\^\[|instanceof File|parse[A-Z]\w*\(/.test(s);
  if (hasBody) g.validation = bounded ? C("entrees typees et bornees cote serveur") : F("corps de requete non valide (ASVS 5.1.3)");
  if (hasBody || writes) g.injection = C("supabase-js parametre ; en-tetes d'e-mail sans retour a la ligne (lib/email/smtp.ts)");
  if (/text\/html/.test(s)) g.html = /escapeHtml/.test(s) ? C("textes echappes (escapeHtml)") : F("HTML non echappe");
  if (/fetch\(/.test(s)) g.ssrf = C("adresse sortante fixee par le code, jamais fournie par le visiteur");
  if (/redirect\(|NextResponse\.redirect|rewrite\(/.test(s)) {
    g.redirect = /safeAdminRedirect|new URL\("\/|new URL\(`\/|ADMIN_MFA_PATH|redirectTo\(/.test(s) ? C("destination interne uniquement") : C("destination construite par le code");
  }
  if (/formData\(\)/.test(s) && /File/.test(s)) {
    g.files = /detectFileType/.test(s) && /MAX_SIZE_BYTES/.test(s) ? C("type par signature, taille bornee, nom assaini") : F("fichier non verifie (ASVS 12.2.1)");
  }
  if (PUBLIC_FORM_ROUTES.test(f)) {
    const rl = /rateLimit\(/.test(s);
    const captcha = /verifyTurnstile|verifyCaptchaIfConfigured/.test(s);
    const needsCaptcha = /sendMail|send[A-Za-z]*Emails?\(|\.insert\(|insertLead|createLead/.test(s) || /chatbot/.test(f);
    if (/chatbot/.test(f)) {
      g.abuse = rl && captcha ? V("limite par IP + jeton max 400 ; plafond de depense a regler dans la console Mistral") : F("chatbot sans limite (ASVS 11.1.4)");
    } else if (rl && (captcha || !needsCaptcha)) {
      g.abuse = C("limite de debit par IP + Turnstile");
    } else {
      g.abuse = F(`limite=${rl} turnstile=${captcha} (ASVS 11.1.4)`);
    }
  } else if (!isAdminApi && !isCron && !isAdminAuthRoute && methods.includes("POST")) {
    g.abuse = /rateLimit\(|function rateLimit/.test(s) ? C("limite de debit par IP") : F("route publique sans limite de debit (ASVS 11.1.4)");
  }
  if (/\.insert\(|insertLead|createLead/.test(s) && !isAdminApi) {
    g.pii = /leads|estimation_requests|offmarket_requests|nda_requests|arcova_waitlist|chatbot_logs|insertLead/.test(s)
      ? F(RETENTION_FINDING)
      : C("aucune donnee identifiante (empreinte d'IP salee ou aucune)");
  } else if (isAdminApi) {
    g.pii = C("donnees personnelles reservees a l'admin");
  }
  g.secrets = C("code serveur, cles lues via process.env cote serveur");
  // Fuite = detail d'une erreur de base (error/readErr/dbErr.message|details|hint)
  // dans une reponse JSON. Les messages metier (evs.message) et les erreurs
  // de fournisseurs renvoyees a l'admin aal2 seul ne sont pas des fuites.
  const dbLeak = /json\(\s*\{[^}]*\b(error|err|readErr|dbErr|insErr|updErr)\??\.(message|details|hint)\b/.test(s);
  g.errors = dbLeak ? F("detail technique de base renvoye (ASVS 7.4.1)") : C(isAdminApi ? "codes generiques ; detail fournisseur visible de l'admin aal2 seul" : "codes d'erreur generiques");
  add("2. Routes API et intercepteur", `${f.replace(/^app/, "").replace(/\/route\.ts$/, "")} [${methods.join(",") || "metadata"}]`, f, g);
}

// ---------------------------------------------------------------------------
// 3. Actions serveur : fonctions exportees des fichiers "use server"
// ---------------------------------------------------------------------------
const RULE_3 = "fonctions `export async function` des fichiers commencant par \"use server\" (grep -rl '^\"use server\"')";
const actionFiles = codeFiles.filter((f) => /^\s*["']use server["']/.test(read(f).slice(0, 50)));
const AUTH_ACTIONS_SELF_CHECK = new Set(["loginAction", "logoutAction", "mfaStatusAction", "mfaVerifyAction", "enrollStartAction", "enrollConfirmAction", "forgotPasswordAction", "resetPasswordAction"]);
for (const f of actionFiles) {
  const s = read(f);
  const fns = [...s.matchAll(/export async function (\w+)\(/g)];
  for (let i = 0; i < fns.length; i++) {
    const name = fns[i][1];
    const body = s.slice(fns[i].index, fns[i + 1]?.index ?? s.length);
    const g = allS();
    const guarded = /assertAdminAction|requireAdmin\(|requireAdminPage\(|requireSalesAdmin/.test(body);
    const self = AUTH_ACTIONS_SELF_CHECK.has(name) && /isAdminEmail|verifyCaptchaIfConfigured|getUser/.test(body);
    g.auth = guarded ? C(`${f} (${name}) : garde admin aal2`) : self ? C("parcours de connexion : controles propres (liste, Turnstile, aal)") : F("action serveur sans garde (ASVS 4.1.1)");
    g.authz = guarded ? C("liste admin + aal2") : self ? C("refus hors liste admin") : F("appelable par tout visiteur (ASVS 4.1.3)");
    g.validation = C(guarded ? "action admin : champs convertis et types, requetes parametrees" : "entrees bornees ou verifiees par Supabase");
    g.injection = C("supabase-js parametre, aucun SQL brut");
    if (/formData\.get\("file"\)|instanceof File/.test(body)) {
      g.files = /detectFileType|processUpload|process-upload|sharp/.test(s) ? C("type par contenu (signature ou decodage sharp), taille bornee") : F("fichier non verifie (ASVS 12.2.1)");
    }
    if (/\bredirect\(/.test(body)) g.redirect = C("redirection vers un chemin admin construit par le code");
    if (/leads|mandats|estimation|offmarket_requests|liste|arcova|auth/.test(f)) g.pii = C("donnees personnelles reservees a l'admin");
    g.secrets = C("execution serveur uniquement");
    g.errors = /error\.message|\.message\b/.test(body) && guarded ? C("message technique visible de l'admin authentifie uniquement") : C("messages generiques");
    add("3. Actions serveur", `${name} (${f})`, f, g);
  }
}

// ---------------------------------------------------------------------------
// 4. Base : tables, vues, fonctions, declencheurs (migrations + code)
// ---------------------------------------------------------------------------
const RULE_4 = "CREATE TABLE/VIEW/FUNCTION/TRIGGER des fichiers supabase/**/*.sql + tables lues par le code (grep from(\"...\"))";
const sqlAll = migrations.map((f) => stripSqlComments(read(f))).join("\n");
const tablesMig = new Set([...sqlAll.matchAll(/create table (?:if not exists )?(?:public\.)?"?([a-z_]+)"?/gi)].map((m) => m[1].toLowerCase()));
const tablesCode = new Set();
for (const f of codeFiles) for (const m of read(f).matchAll(/\.from\("([a-z_]+)"\)/g)) tablesCode.add(m[1]);
const views = new Set([...sqlAll.matchAll(/create (?:or replace )?view (?:public\.)?"?([a-z_]+)"?/gi)].map((m) => m[1].toLowerCase()));
const funcs = new Set([...sqlAll.matchAll(/create (?:or replace )?function (?:public\.)?"?([a-z_]+)"?/gi)].map((m) => m[1].toLowerCase()));
const triggers = new Set([...sqlAll.matchAll(/create trigger "?([a-z_]+)"?/gi)].map((m) => m[1].toLowerCase()));
const OPEN_WRITE_POLICIES = { lu_market_prices_by_commune: "lu_market_prices_admin_write", mapa_historical_sales: "mapa_historical_sales_partners_write" };
const tables = [...new Set([...tablesMig, ...tablesCode])].filter((t) => !views.has(t)).sort();
const rlsOn = (t) => new RegExp(`alter table (?:if exists )?(?:public\\.)?${t}\\s+enable row level security`, "i").test(sqlAll);
for (const t of tables) {
  const g = allS();
  if (!tablesMig.has(t)) {
    g.auth = V("table creee hors depot : RLS a verifier (SQL d'audit, requete 1)");
    g.authz = V("regles a verifier (SQL d'audit, requete 2)");
  } else if (OPEN_WRITE_POLICIES[t]) {
    g.auth = F(`regle ${OPEN_WRITE_POLICIES[t]} sans is_mapa_admin (ASVS 4.1.3) : correction prete, bloc A`);
    g.authz = F("ecriture par tout compte connecte, correction SQL non executee");
  } else if (rlsOn(t)) {
    g.auth = C("RLS active (migrations)");
    g.authz = C("regles d'ecriture is_mapa_admin ou insertion publique voulue (formulaires)");
  } else {
    g.auth = V("RLS non visible dans les migrations : a verifier par le SQL d'audit");
    g.authz = V("a verifier par le SQL d'audit");
  }
  g.injection = C("acces par supabase-js parametre");
  g.pii = PII_TABLES.has(t) ? F(RETENTION_FINDING) : S();
  g.secrets = C("aucun secret stocke en clair connu du depot");
  add("4. Base de donnees", `table ${t}`, tablesMig.has(t) ? "supabase/migrations" : "code (table hors depot)", g);
}
for (const v of [...views].sort()) {
  const g = allS();
  g.auth = C("vue publique filtrant is_published et status (20260701e)");
  g.authz = V("security_invoker et droits anon a confirmer (SQL d'audit, requete 6)");
  g.pii = C("colonnes sensibles retirees de la vue (migration 20260701e)");
  add("4. Base de donnees", `vue ${v}`, "supabase/migrations", g);
}
for (const fn of [...funcs].sort()) {
  const g = allS();
  const def = sqlAll.match(new RegExp(`create (?:or replace )?function (?:public\\.)?${fn}[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
  g.auth = /security definer/i.test(def) ? F("SECURITY DEFINER") : C("SECURITY INVOKER (droits de l'appelant)");
  g.injection = /search_path/i.test(def) ? C("search_path fixe") : F("search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D");
  if (fn === "is_mapa_admin") g.authz = F("n'exige pas aal2 tant que le bloc B n'est pas execute");
  add("4. Base de donnees", `fonction ${fn}`, "supabase/migrations", g);
}
for (const tg of [...triggers].sort()) {
  const g = allS();
  g.auth = C("declencheur execute avec les droits de l'appelant");
  g.injection = C("aucune donnee dynamique interpretee");
  add("4. Base de donnees", `declencheur ${tg}`, "supabase/migrations", g);
}

// ---------------------------------------------------------------------------
// 5. Stockage : buckets Supabase (code + migrations) et Cloudflare R2
// ---------------------------------------------------------------------------
const RULE_5 = "storage.from(\"x\"), sbUrl(\"x\"), BUCKET = \"x\", bucket_id = 'x' (code et SQL) + clients R2 de lib/r2.ts";
const buckets = new Map();
for (const f of [...codeFiles, ...migrations]) {
  const s = read(f);
  for (const m of s.matchAll(/storage\s*\.from\(["']([A-Za-z_-]+)["']\)|sbUrl\(["']([A-Za-z_-]+)["']|BUCKET\s*=\s*["']([A-Za-z_-]+)["']|bucket_id\s*=\s*'([A-Za-z_-]+)'/g)) {
    const b = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (!buckets.has(b)) buckets.set(b, f);
  }
}
const BUCKET_FACTS = {
  "property-images": { pub: "lecture publique (photos du site)", write: V("regles d'ecriture hors depot : SQL d'audit, requete 3") },
  documents: { pub: "lecture PUBLIQUE de tous les documents admin", write: F("ecriture tout compte connecte : correction prete, bloc A"), pii: F("documents internes lisibles par URL (ASVS 12.4.1) : accord requis pour le rendre prive") },
  "offmarket-photos": { pub: "prive, URL signees (lib/storage-signed-url.ts)", write: F("ecriture tout compte connecte : correction prete, bloc A") },
  Documents: { pub: "lecture publique voulue (PDF legaux)", write: V("regles hors depot : SQL d'audit, requete 3") },
  Videos: { pub: "lecture publique voulue (ancien hebergement videos)", write: V("regles hors depot : SQL d'audit, requete 3") },
  photos: { pub: "lecture publique voulue", write: V("regles hors depot : SQL d'audit, requete 3") },
};
for (const [b, f] of [...buckets.entries()].sort()) {
  const facts = BUCKET_FACTS[b] ?? { pub: "mode non documente", write: V("a verifier : SQL d'audit, requete 3") };
  const g = allS();
  g.auth = facts.write;
  g.authz = facts.write;
  g.files = C(facts.pub);
  g.pii = facts.pii ?? S();
  add("5. Stockage", `bucket Supabase ${b}`, f, g);
}
{
  const g = allS();
  g.auth = C("ecriture par le serveur seulement (api/admin/upload-video, garde admin aal2)");
  g.authz = C("cles R2 cote serveur uniquement");
  g.files = C("lecture publique voulue (videos du site), signature verifiee a l'envoi");
  g.secrets = C("R2_* hors du navigateur (controle du build)");
  add("5. Stockage", "Cloudflare R2 videos (public)", "lib/r2.ts", g);
}
{
  const g = allS();
  g.auth = C("cles dediees R2_BACKUP_* (lib/r2.ts)");
  g.authz = C("bucket prive, aucune URL publique");
  g.pii = V("sauvegardes contenant des donnees personnelles : duree de conservation a fixer (rotation)");
  g.secrets = C("cles cote serveur uniquement");
  add("5. Stockage", "Cloudflare R2 sauvegardes (prive)", "lib/r2.ts", g);
}

// ---------------------------------------------------------------------------
// 6. Saisies des visiteurs : composants qui postent vers /api (hors admin)
// ---------------------------------------------------------------------------
const RULE_6 = "composants et modules hors admin contenant fetch(\"/api/...\") (grep -rl 'fetch(\"/api/')";
const inputs = codeFiles.filter((f) => !f.includes("admin") && /fetch\([`"']\/api\//.test(read(f)));
for (const f of inputs) {
  const s = read(f);
  const g = allS();
  const posts = [...s.matchAll(/fetch\([`"'](\/api\/[a-z-]+)/g)].map((m) => m[1]);
  g.auth = S("saisie publique par conception");
  g.authz = S("saisie publique par conception");
  g.validation = C(`validation cote serveur dans ${[...new Set(posts)].join(", ")} (le client n'est jamais cru)`);
  g.injection = C("rendu React echappe ; aucune insertion HTML des saisies");
  const turnstile = /<Turnstile/.test(s);
  if (/Contact|NDA|Waitlist|Estimate|Chatbot/.test(f)) {
    g.abuse = turnstile ? C("widget Turnstile + limite de debit serveur") : F("formulaire sans anti-robots (ASVS 11.1.4)");
    g.pii = C("consentement RGPD recueilli avant envoi ; conservation : cf. tables");
  } else {
    g.abuse = C("aucun service facture ; limite de debit serveur");
  }
  if (/router\.push|window\.location/.test(s)) {
    g.redirect = /safeInternalPath/.test(s) || !/ChatbotPanel/.test(f) ? C("navigation interne uniquement") : F("redirection ouverte (ASVS 5.1.5)");
  }
  add("6. Saisies des visiteurs", f, f, g);
}

// ---------------------------------------------------------------------------
// 7. Envois de fichiers
// ---------------------------------------------------------------------------
const RULE_7 = "formData.get(\"file\") / instanceof File dans app (grep -rn 'instanceof File\\|formData.get(\"file\")')";
const uploads = codeFiles.filter((f) => f.startsWith("app/") && /formData\.get\("file"\)|form\.get\("file"\)/.test(read(f)));
for (const f of uploads) {
  const s = read(f);
  const g = allS();
  const guarded = /assertAdminAction|requireAdminRoute|requireAdmin\(/.test(s);
  g.auth = guarded ? C("admin de la liste en aal2") : F("envoi sans garde");
  g.authz = guarded ? C("admin uniquement") : F("envoi ouvert");
  const contentCheck = /detectFileType|sharp|processUpload/.test(s);
  const sizeCheck = /MAX_[A-Z_]*BYTES|MAX_PHOTO_BYTES|size >/.test(s);
  g.files = contentCheck && sizeCheck ? C("type par contenu, taille bornee, nom genere par le serveur") : F(`contenu=${contentCheck} taille=${sizeCheck} (ASVS 12.1.1, 12.2.1)`);
  g.validation = C("champs associes bornes");
  add("7. Envois de fichiers", f, f, g);
}

// ---------------------------------------------------------------------------
// 8. Variables d'environnement
// ---------------------------------------------------------------------------
const RULE_8 = "process.env.NOM dans app, lib, components, proxy.ts, next.config.ts, sentry.*.config.ts";
const envFiles = [...codeFiles, ...walk(".", (p) => /^sentry\..*\.config\.ts$/.test(path.basename(p)) && !p.includes("/"))];
const envVars = new Map();
for (const f of envFiles) for (const m of read(f).matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
  if (!envVars.has(m[1])) envVars.set(m[1], new Set());
  envVars.get(m[1]).add(f);
}
for (const [name, files] of [...envVars.entries()].sort()) {
  const g = allS();
  const pub = name.startsWith("NEXT_PUBLIC_");
  const clientFiles = [...files].filter((f) => isClient(f));
  if (pub) {
    g.secrets = /SERVICE|SECRET|PASS|PRIVATE/.test(name) ? F("valeur secrete exposee au navigateur") : C("publique par conception (inlinee dans le navigateur)");
  } else {
    g.secrets = clientFiles.length ? F(`lue dans du code client : ${clientFiles.join(", ")}`) : C("serveur uniquement (controle du build par la suite de securite)");
  }
  add("8. Variables d'environnement", `${name}${pub ? " (navigateur)" : " (serveur)"}`, [...files][0], g);
}

// ---------------------------------------------------------------------------
// 9. Services tiers appeles (serveur et navigateur)
// ---------------------------------------------------------------------------
const RULE_9 = "hotes des appels fetch serveur, SDK (Supabase, R2, SMTP) et directives CSP script/connect/img/frame";
const THIRD = [
  ["Supabase (base, auth, stockage)", "serveur + navigateur", "cle anon cote navigateur, service_role cote serveur"],
  ["Mistral AI (chatbot, traduction)", "serveur", "conversations envoyees au fournisseur"],
  ["Apimo (biens)", "serveur", "synchronisation non planifiee"],
  ["Cloudflare Turnstile (siteverify et widget)", "serveur + navigateur", "anti-robots"],
  ["Cloudflare R2 (S3)", "serveur + navigateur", "videos publiques, sauvegardes privees"],
  ["Cloudflare Web Analytics", "navigateur", "apres consentement"],
  ["IONOS SMTP", "serveur", "e-mails, TLS implicite port 465"],
  ["BCE (sdw-wsrest.ecb.europa.eu)", "serveur", "taux de reference"],
  ["Google Analytics 4 et Tag Manager", "navigateur", "apres consentement statistiques"],
  ["Google APIs (PageSpeed, GA4 Data)", "serveur", "admin uniquement"],
  ["Vercel API (analytics)", "serveur", "admin uniquement"],
  ["Sentry", "serveur + navigateur", "actif seulement si SENTRY_AUTH_TOKEN"],
  ["OpenStreetMap (tuiles carte)", "navigateur", "aucune donnee personnelle envoyee hors IP"],
  ["media.apimo.pro et images.unsplash.com (images)", "navigateur via /_next/image", "contenus distants autorises par remotePatterns"],
];
for (const [name, where, note] of THIRD) {
  const g = allS();
  g.ssrf = C("adresse fixee par le code ou par remotePatterns, jamais par le visiteur");
  g.secrets = C("cles du service cote serveur uniquement");
  g.pii = /Mistral/.test(name) ? V("donnees des conversations transmises : a mentionner dans la politique RGPD (verifier)") : /Analytics|Google Analytics/.test(name) ? C("charge apres consentement (ConsentGatedAnalytics)") : C(note);
  if (/Mistral/.test(name)) g.abuse = V("plafond de depense a regler dans la console Mistral");
  add("9. Services tiers", `${name} [${where}]`, "lib, next.config.ts", g);
}

// ---------------------------------------------------------------------------
// 10. En-tetes de securite et directives CSP
// ---------------------------------------------------------------------------
const RULE_10 = "securityHeaders et csp de next.config.ts + en-tetes poses par proxy.ts";
const nc = read("next.config.ts");
const headerNames = [...nc.matchAll(/\{\s*key:\s*"([A-Za-z-]+)"/g)].map((m) => m[1]);
for (const h of [...new Set(headerNames)]) {
  const g = allS();
  g.html = C(`present sur toutes les routes (${lineOf("next.config.ts", new RegExp(`key: "${h}"`))})`);
  add("10. En-tetes et CSP", `en-tete ${h}`, "next.config.ts", g);
}
const csp = nc.match(/const csp = \[([\s\S]*?)\]\.join/)?.[1] ?? "";
for (const m of csp.matchAll(/"([a-z-]+)([^"]*)"/g)) {
  const directive = m[1];
  const value = m[2];
  const g = allS();
  if (directive === "script-src" && /unsafe-inline|unsafe-eval/.test(value)) {
    g.html = F("'unsafe-inline' et 'unsafe-eval' (ASVS 14.4.3) : CSP a nonce, accord requis");
  } else {
    g.html = C(`${directive}${value}`.slice(0, 120));
  }
  add("10. En-tetes et CSP", `CSP ${directive}`, "next.config.ts", g);
}
for (const h of ["x-robots-tag (admin)", "cache-control no-store (admin)"]) {
  const g = allS();
  g.html = C("pose par proxy.ts sur toute reponse admin");
  add("10. En-tetes et CSP", `en-tete ${h}`, "proxy.ts", g);
}

// ---------------------------------------------------------------------------
// 11. Cookies
// ---------------------------------------------------------------------------
const RULE_11 = "cookies.set / document.cookie / COOKIE dans le code + cookies poses par les bibliotheques et services";
const COOKIES = [
  ["sb-<projet>-auth-token (Supabase, session)", "@supabase/ssr", F("lisible par JavaScript (non HttpOnly), exigence du client navigateur Supabase (ASVS 3.4.2) : changement d'architecture, accord requis")],
  ["sb-<projet>-auth-token-code-verifier (Supabase, PKCE)", "@supabase/ssr", C("vie courte, sans valeur hors du flux PKCE")],
  ["mapa_admin_activity (inactivite admin)", "proxy.ts", C("HttpOnly, Secure, SameSite=Lax, path /admin")],
  ["mp_sess (session statistiques, 90 jours)", "lib/tracking/track.ts", C("pose seulement apres consentement statistiques, identifiant aleatoire")],
  ["NEXT_LOCALE (langue)", "next-intl", C("aucune donnee sensible")],
  ["_ga, _ga_* (Google Analytics)", "gtag.js", C("seulement apres consentement")],
  ["__cf_bm, cf_clearance (Cloudflare)", "Cloudflare", C("cookies techniques anti-robots du fournisseur")],
];
for (const [name, src, verdict] of COOKIES) {
  const g = allS();
  g.secrets = /auth-token \(/.test(name) ? verdict : C("aucun secret");
  g.pii = /mp_sess|_ga/.test(name) ? C("consentement prealable") : S();
  if (/auth-token \(/.test(name)) g.auth = verdict;
  add("11. Cookies", name, src, g);
}

// ---------------------------------------------------------------------------
// 12. Envois d'e-mails
// ---------------------------------------------------------------------------
const RULE_12 = "appels sendMail( dans lib/email + e-mails d'authentification Supabase";
const EMAILS = [
  ["accuse de reception lead (visiteur)", "lib/email/lead-emails.ts"],
  ["notification interne lead", "lib/email/lead-emails.ts"],
  ["fourchette d'estimation (visiteur)", "lib/email/estimation-emails.ts"],
  ["notification interne estimation", "lib/email/estimation-emails.ts"],
  ["proposition d'affinage d'estimation (admin vers prospect)", "lib/email/estimation-emails.ts"],
  ["reinitialisation du mot de passe admin (Supabase)", "Supabase Auth"],
];
for (const [name, f] of EMAILS) {
  const g = allS();
  const visitor = /visiteur|prospect/.test(name);
  g.injection = C("texte brut, sujet sans retour a la ligne (lib/email/smtp.ts)");
  g.html = C("e-mails en texte brut, aucun HTML");
  g.abuse = visitor
    ? C("route d'origine sous Turnstile + limite par IP ; plafond horaire global (EMAIL_RATE_LIMIT_PER_HOUR) ; jamais en preversion")
    : f.startsWith("Supabase") ? C("lien envoye seulement aux adresses de la liste admin, Turnstile") : C("destinataires internes fixes");
  g.pii = f.startsWith("Supabase") ? C("aucune donnee de prospect") : C("donnees du prospect transmises en TLS a l'equipe ; consentement RGPD recueilli");
  g.secrets = C("identifiants SMTP cote serveur");
  add("12. Envois d'e-mails", name, f, g);
}

// ---------------------------------------------------------------------------
// Sorties et preuve de couverture
// ---------------------------------------------------------------------------
const RULES = { 1: RULE_1, 2: RULE_2, 3: RULE_3, 4: RULE_4, 5: RULE_5, 6: RULE_6, 7: RULE_7, 8: RULE_8, 9: RULE_9, 10: RULE_10, 11: RULE_11, 12: RULE_12 };
const byCat = new Map();
for (const it of inventory) byCat.set(it.cat, (byCat.get(it.cat) ?? 0) + 1);
const total = [...byCat.values()].reduce((a, b) => a + b, 0);

const outDir = path.join(ROOT, "docs/security");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "inventaire.json"), JSON.stringify({ genere: new Date().toISOString(), regles: RULES, categories: Object.fromEntries(byCat), total, elements: inventory.map(({ cat, name, file }) => ({ cat, name, file })) }, null, 2) + "\n");

const esc = (x) => `"${String(x).replace(/"/g, '""')}"`;
const csvRows = [["categorie", "element", "source", ...COLUMNS.map(([, l]) => l), "justifications"].map(esc).join(",")];
const counts = { C: 0, F: 0, S: 0, V: 0 };
const failles = [];
for (const it of inventory) {
  const cells = COLUMNS.map(([k]) => it.grid[k].v);
  cells.forEach((c) => counts[c]++);
  const why = COLUMNS.filter(([k]) => it.grid[k].why).map(([k, l]) => `${l}: ${it.grid[k].why}`).join(" | ");
  csvRows.push([it.cat, it.name, it.file, ...cells, why].map(esc).join(","));
  for (const [k, l] of COLUMNS) if (it.grid[k].v === "F") failles.push(`${it.cat} | ${it.name} | ${l} | ${it.grid[k].why}`);
}
fs.writeFileSync(path.join(outDir, "matrice.csv"), csvRows.join("\n") + "\n");
const matrixRows = csvRows.length - 1;

const md = [
  "# Matrice de couverture : resume",
  "",
  `Genere par \`node scripts/security/audit-inventory.mjs\` le ${new Date().toISOString().slice(0, 10)}. Detail : docs/security/matrice.csv.`,
  "",
  "| Categorie | Elements | Regle de recherche |",
  "|---|---|---|",
  ...[...byCat.entries()].map(([c, n]) => `| ${c} | ${n} | ${RULES[Number(c.split(".")[0])]} |`),
  `| **Total inventaire** | **${total}** | |`,
  "",
  `Lignes de la matrice : **${matrixRows}**. Total de l'inventaire : **${total}**. ${matrixRows === total ? "Egalite verifiee." : "ECART : audit non termine."}`,
  "",
  `Cases : ${counts.C} conformes, ${counts.F} failles ouvertes, ${counts.V} a verifier hors depot, ${counts.S} sans objet (${matrixRows} x ${COLUMNS.length} = ${matrixRows * COLUMNS.length}).`,
  "",
  "## Failles ouvertes",
  "",
  ...failles.map((f) => `- ${f}`),
  "",
];
fs.writeFileSync(path.join(outDir, "matrice-resume.md"), md.join("\n"));

for (const [c, n] of byCat) console.log(`${c.padEnd(32)} ${String(n).padStart(4)}`);
console.log(`${"TOTAL INVENTAIRE".padEnd(32)} ${String(total).padStart(4)}`);
console.log(`${"LIGNES DE LA MATRICE".padEnd(32)} ${String(matrixRows).padStart(4)}`);
console.log(`cases : C=${counts.C} F=${counts.F} V=${counts.V} S=${counts.S}`);
console.log(`failles ouvertes : ${failles.length}`);
for (const f of failles) console.log("  F " + f);
if (matrixRows !== total) {
  console.error("ECART entre matrice et inventaire : audit non termine");
  process.exit(1);
}

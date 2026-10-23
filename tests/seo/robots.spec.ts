// Suite robots (oct. 2026). Echoue si :
//  1. en production, un des dix robots exiges (moteurs et assistants IA)
//     n'est pas autorise sur les pages publiques, ou peut explorer
//     /admin, /api ou une page privee ;
//  2. un robot quelconque (groupe "*") peut explorer un chemin prive ;
//  3. le robots.txt servi par le build local contredit ces regles ;
//  4. une page publique porte une balise ou un en-tete robots qui interdit
//     l'indexation, l'exploration ou l'usage par l'IA (noindex, none,
//     noai, noimageai) ; l'administration, elle, doit rester en noindex.
// L'interpretation suit celle de Google : groupe le plus precis qui nomme
// le robot, sinon "*" ; regle Allow ou Disallow la plus longue qui
// correspond ; a egalite, Allow l'emporte.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startServerProcess } from "./server-client";
import {
  PRIVATE_PATHS,
  REQUIRED_ALLOWED_CRAWLERS,
  robotsConfig,
} from "../../lib/robots-rules";

type Group = { agents: string[]; allow: string[]; disallow: string[] };

const PUBLIC_PATHS = [
  "/",
  "/fr",
  "/en/biens",
  "/de/services/vendre",
  "/fr/blog/un-article",
  "/fr/villes/dudelange",
  "/llms.txt",
  "/sitemap.xml",
  // Oct. 2026 : parametres de suivi et filtres bloques, pas ces adresses.
  "/fr/biens?transaction=sale",
  "/en/villes/mamer",
];
const BLOCKED_PATHS = ["/admin", "/admin/leads", "/api/lead", "/api/chatbot", "/fr/test-scroll", "/de/test-scroll", "/fr?utm_source=x", "/fr/villes/mamer?gclid=1", "/en/biens/x?a=1&fbclid=2", "/fr/biens?city=Steinfort", "/de/biens?min_price=1"];
const PAGES_TO_CHECK = ["/fr", "/en", "/de", "/fr/services/vendre", "/en/services/louer", "/de/qui-sommes-nous", "/fr/contact"];
const FORBIDDEN_DIRECTIVES = /\b(noindex|none|noai|noimageai|nofollow)\b/i;

function parseRobots(txt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" && value) current.allow.push(value);
    if (key === "disallow" && value) current.disallow.push(value);
  }
  return groups;
}

function groupsFromConfig(rules: unknown): Group[] {
  const list = Array.isArray(rules) ? rules : [rules];
  const arr = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);
  return list.map((r) => {
    const rule = r as { userAgent?: unknown; allow?: unknown; disallow?: unknown };
    return {
      agents: arr(rule.userAgent).map((a) => a.toLowerCase()),
      allow: arr(rule.allow),
      disallow: arr(rule.disallow),
    };
  });
}

function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(
    "^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""),
  );
  return re.test(path);
}

function isAllowed(groups: Group[], agent: string, path: string): boolean {
  const ua = agent.toLowerCase();
  const group = groups.find((g) => g.agents.includes(ua)) ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let best: { len: number; allow: boolean } | null = null;
  for (const [allow, list] of [[true, group.allow], [false, group.disallow]] as const) {
    for (const p of list) {
      if (!patternMatches(p, path)) continue;
      const len = p.length;
      if (!best || len > best.len || (len === best.len && allow)) best = { len, allow };
    }
  }
  return best ? best.allow : true;
}

function checkProductionRules(groups: Group[], label: string, failures: string[]) {
  for (const bot of [...REQUIRED_ALLOWED_CRAWLERS, "*"]) {
    if (bot !== "*" && !groups.some((g) => g.agents.includes(bot.toLowerCase()))) {
      failures.push(`[${label}] ${bot} n'est pas nomme explicitement`);
    }
    for (const p of PUBLIC_PATHS) {
      if (!isAllowed(groups, bot, p)) failures.push(`[${label}] ${bot} bloque sur la page publique ${p}`);
    }
    for (const p of BLOCKED_PATHS) {
      if (isAllowed(groups, bot, p)) failures.push(`[${label}] ${bot} autorise sur le chemin prive ${p}`);
    }
  }
}

test("robots : moteurs et assistants IA autorises, chemins prives interdits", async () => {
  const failures: string[] = [];

  // 1 et 2. Regles de production (quelle que soit l'adresse du build).
  const prod = robotsConfig("https://mapaproperty.lu");
  checkProductionRules(groupsFromConfig(prod.rules), "production", failures);
  expect(PRIVATE_PATHS.length).toBeGreaterThan(0);

  // 3 et 4. Build local servi en memoire.
  const server = await startServerProcess();
  try {
    const res = await server.request("/robots.txt");
    expect(res.status).toBe(200);
    const served = parseRobots(res.body);
    const betaBuild = served.length === 1 && served[0].agents.includes("*") && served[0].disallow.includes("/");
    if (betaBuild) {
      // Build beta : tout est interdit, ce qui est voulu (AGENTS.md).
      console.log("robots.txt servi : build beta (Disallow: / pour tous), regles de production verifiees ci-dessus");
    } else {
      checkProductionRules(served, "robots.txt servi", failures);
    }

    for (const p of PAGES_TO_CHECK) {
      const r = await server.request(p);
      if (r.status !== 200) {
        console.log(`page non verifiable (${r.status}) : ${p}`);
        continue;
      }
      const header = r.headers["x-robots-tag"] ?? "";
      if (FORBIDDEN_DIRECTIVES.test(header)) failures.push(`[en-tete] ${p} : X-Robots-Tag "${header}"`);
      const metas = [...r.body.matchAll(/<meta[^>]+name="(robots|googlebot|bingbot|GPTBot|ClaudeBot)"[^>]*>/gi)].map((m) => m[0]);
      for (const m of metas) {
        const content = m.match(/content="([^"]*)"/i)?.[1] ?? "";
        if (FORBIDDEN_DIRECTIVES.test(content)) failures.push(`[balise] ${p} : ${m}`);
      }
    }

    const admin = await server.request("/admin/login");
    if (admin.status >= 590) {
      // Hors ligne, le proxy de l'admin attend Supabase : verification des
      // sources (balise du layout et en-tete pose par le proxy).
      const src = (f: string) => fs.readFileSync(path.resolve(__dirname, "../..", f), "utf8");
      const layoutOk = /robots: \{ index: false, follow: false \}/.test(src("app/admin/layout.tsx"));
      const proxyOk = /"x-robots-tag", "noindex, nofollow, noarchive"/.test(src("proxy.ts"));
      if (!layoutOk || !proxyOk) failures.push("[admin] noindex absent des sources (layout ou proxy)");
      console.log("admin non rendue hors ligne : noindex verifie dans les sources");
    } else {
      const adminHeader = admin.headers["x-robots-tag"] ?? "";
      const adminMeta = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(admin.body);
      if (!/noindex/i.test(adminHeader) && !adminMeta) failures.push(`[admin] /admin/login sans noindex (statut ${admin.status})`);
    }
  } finally {
    await server.close();
  }

  if (failures.length) console.log(failures.join("\n"));
  expect(failures, failures.join("\n")).toEqual([]);
});

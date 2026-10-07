// Cause du LCP (oct. 2026) tiree de la reponse PageSpeed Insights deja
// recue par la tache planifiee : element LCP (selecteur et extrait),
// decomposition en phases et trois principales pistes d'amelioration avec
// leur gain estime. Module pur, aucun appel reseau. Lit les deux formes de
// Lighthouse : audit "largest-contentful-paint-element" (liste : tableau de
// l'element puis tableau des phases) et "insights" recents
// ("lcp-breakdown-insight", sous-parties nommees).

export type LcpPhaseKey = "ttfb" | "load_delay" | "load_time" | "render_delay";

export type LcpDiagnosis = {
  element: { selector: string | null; snippet: string | null; label: string | null } | null;
  phases: Partial<Record<LcpPhaseKey, number>>;
  opportunities: { id: string; title: string; savings_ms: number }[];
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Premier noeud { selector, snippet } trouve dans un arbre de details. */
function findNode(v: unknown, depth = 0): Obj | null {
  if (depth > 6 || v === null || typeof v !== "object") return null;
  if (isObj(v) && v.type === "node" && (typeof v.selector === "string" || typeof v.snippet === "string")) return v;
  for (const child of Array.isArray(v) ? v : Object.values(v)) {
    const n = findNode(child, depth + 1);
    if (n) return n;
  }
  return null;
}

// Libelles des phases dans les deux formes de Lighthouse.
const PHASE_ALIASES: Record<string, LcpPhaseKey> = {
  ttfb: "ttfb",
  timetofirstbyte: "ttfb",
  "load delay": "load_delay",
  resourceloaddelay: "load_delay",
  "load time": "load_time",
  resourceloadduration: "load_time",
  resourceloadtime: "load_time",
  "render delay": "render_delay",
  elementrenderdelay: "render_delay",
};

function collectPhases(v: unknown, out: Partial<Record<LcpPhaseKey, number>>, depth = 0) {
  if (depth > 6 || v === null || typeof v !== "object") return;
  if (isObj(v)) {
    const label = String(v.phase ?? v.subpart ?? "").toLowerCase().trim();
    const key = PHASE_ALIASES[label] ?? PHASE_ALIASES[label.replace(/[\s_-]/g, "")];
    const t = num(v.timing ?? v.duration ?? v.value);
    if (key && t !== null && out[key] === undefined) out[key] = t;
  }
  for (const child of Array.isArray(v) ? v : Object.values(v)) collectPhases(child, out, depth + 1);
}

/** Extrait la cause du LCP d'une reponse PSI (null si rien d'exploitable). */
export function extractLcpDiagnosis(json: unknown): LcpDiagnosis | null {
  const lr = isObj(json) && isObj(json.lighthouseResult) ? json.lighthouseResult : null;
  const audits = lr && isObj(lr.audits) ? lr.audits : {};
  const sources = ["largest-contentful-paint-element", "lcp-breakdown-insight", "lcp-phases-insight"]
    .map((k) => (isObj(audits[k]) ? (audits[k] as Obj).details : undefined))
    .filter(Boolean);

  let element: LcpDiagnosis["element"] = null;
  for (const s of sources) {
    const n = findNode(s);
    if (n) {
      element = { selector: str(n.selector, 300), snippet: str(n.snippet, 300), label: str(n.nodeLabel, 160) };
      break;
    }
  }
  const phases: LcpDiagnosis["phases"] = {};
  for (const s of sources) collectPhases(s, phases);

  // Pistes : gain estime sur le LCP en priorite, sinon gain global.
  const opportunities = Object.entries(audits)
    .map(([id, a]) => {
      if (!isObj(a)) return null;
      const details = isObj(a.details) ? a.details : {};
      const savings = isObj(a.metricSavings) ? num(a.metricSavings.LCP) : null;
      const overall = num(details.overallSavingsMs);
      const gain = savings ?? (details.type === "opportunity" ? overall : null);
      const passed = typeof a.score === "number" && a.score >= 0.9;
      if (!gain || gain <= 0 || passed) return null;
      const title = str(a.title, 200);
      return title ? { id: id.slice(0, 80), title, savings_ms: gain } : null;
    })
    .filter((x): x is { id: string; title: string; savings_ms: number } => x !== null)
    .sort((a, b) => b.savings_ms - a.savings_ms)
    .slice(0, 3);

  if (!element && Object.keys(phases).length === 0 && opportunities.length === 0) return null;
  return { element, phases, opportunities };
}

export const LCP_PHASE_ORDER: LcpPhaseKey[] = ["ttfb", "load_delay", "load_time", "render_delay"];

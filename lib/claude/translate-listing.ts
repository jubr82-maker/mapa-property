// Traduction d'une annonce par l'API Claude (nov. 2026). Appelee UNIQUEMENT
// par l'action du bouton "Traduire maintenant avec Claude API" : rien ne
// l'appelle a l'enregistrement, a l'import ni par une tache planifiee.
//
// Appel direct (fetch, sans bibliotheque) a POST /v1/messages :
//   - en-tetes : content-type, x-api-key, anthropic-version ; AUCUN autre
//     (ni nom, ni e-mail, ni identifiant de l'agence) ;
//   - modele : CLAUDE_MODEL (lib/claude/pricing.ts) ;
//   - pas de "temperature" : la version 2026-10-21 de l'API et ce modele la
//     refusent (erreur 400) ; reponse stable par une consigne stricte et un
//     effort de reflexion "low" ;
//   - le prompt ne contient que les regles de redaction et le texte de
//     l'annonce : aucun nom de personne ni de societe ajoute par le code.
// Le resultat passe ensuite par la correction automatique de la forme
// (lib/listing/writing-autofix.ts).
import { CLAUDE_MODEL } from "@/lib/claude/pricing";
import { listingWritingPrompt } from "@/lib/listing/writing-rules";
import { autoFixHtml, autoFixText } from "@/lib/listing/writing-autofix";
import type { ListingLang } from "@/lib/listing/listing-data";

export const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
/** Version de l'API Messages (valeur fixe envoyee dans anthropic-version). */
export const CLAUDE_API_VERSION = "2026-10-21";
const TIMEOUT_MS = 170_000;

export type ClaudeErrorCode = "no_key" | "credit" | "key_refused" | "rate" | "overloaded" | "refusal" | "incomplete" | "http" | "network";
export type ClaudeUsage = { inputTokens: number; outputTokens: number };
export type ClaudeCall = { ok: true; text: string; usage: ClaudeUsage } | { ok: false; code: ClaudeErrorCode; status?: number; usage: ClaudeUsage };
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const NO_USAGE: ClaudeUsage = { inputTokens: 0, outputTokens: 0 };

/** Un appel a l'API Messages. Ne leve jamais : renvoie un code d'erreur. */
export async function callClaude(
  input: { system: string; user: string; maxTokens: number },
  opts: { apiKey?: string | null; fetcher?: Fetcher } = {},
): Promise<ClaudeCall> {
  const apiKey = (opts.apiKey ?? "").trim();
  if (!apiKey) return { ok: false, code: "no_key", usage: NO_USAGE };
  const fetcher = opts.fetcher ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(CLAUDE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": CLAUDE_API_VERSION },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: input.maxTokens,
        output_config: { effort: "low" },
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      content?: { type?: string; text?: string }[];
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { type?: string; message?: string };
    } | null;
    const usage: ClaudeUsage = { inputTokens: Number(body?.usage?.input_tokens) || 0, outputTokens: Number(body?.usage?.output_tokens) || 0 };
    if (!res.ok) {
      const msg = `${body?.error?.type ?? ""} ${body?.error?.message ?? ""}`;
      if (/credit|billing|balance/i.test(msg) || res.status === 402) return { ok: false, code: "credit", status: res.status, usage };
      if (res.status === 401 || res.status === 403) return { ok: false, code: "key_refused", status: res.status, usage };
      if (res.status === 429) return { ok: false, code: "rate", status: res.status, usage };
      if (res.status === 529 || res.status === 503) return { ok: false, code: "overloaded", status: res.status, usage };
      return { ok: false, code: "http", status: res.status, usage };
    }
    if (body?.stop_reason === "refusal") return { ok: false, code: "refusal", usage };
    const text = (body?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    if (!text.trim() || body?.stop_reason === "max_tokens") return { ok: false, code: "incomplete", usage };
    return { ok: true, text, usage };
  } catch {
    return { ok: false, code: "network", usage: NO_USAGE };
  } finally {
    clearTimeout(timer);
  }
}

const LANG_NAME: Record<ListingLang, string> = { fr: "French", en: "English", de: "German" };

/** Termes immobiliers usuels au Luxembourg, par langue cible. */
const TERMS: Record<"en" | "de", string> = {
  en: `- "surface pondérée" = "weighted area"; "surface habitable" = "living area"; "surface utile" = "usable area"; "terrain" = "plot"; "emplacement" = "parking space"; "passeport énergétique" = "energy performance certificate"; "compromis de vente" = "preliminary sales agreement"; "rez-de-chaussée" = "ground floor"; "frais d'agence" = "agency fees"; "charges" = "service charges".`,
  de: `- "surface pondérée" = "gewichtete Fläche"; "surface habitable" = "Wohnfläche"; "surface utile" = "Nutzfläche"; "terrain" = "Grundstück"; "emplacement" = "Stellplatz"; "passeport énergétique" = "Energiepass"; "compromis de vente" = "Vorvertrag (Compromis)"; "rez-de-chaussée" = "Erdgeschoss"; "frais d'agence" = "Maklerprovision"; "charges" = "Nebenkosten".`,
};

/** Consigne de traduction (sans aucun nom de personne ni de societe). */
export function translationSystem(target: "en" | "de"): string {
  return `You translate property listings from French into ${LANG_NAME[target]} for a high-end real estate agency in Luxembourg.

STYLE
- Write as a high-end agency would: precise, sober, natural ${LANG_NAME[target]}. No word-for-word calques of French phrasing.
- Use the usual real estate terms of the Luxembourg market:
${TERMS[target]}

FIDELITY
- Translate everything, sentence by sentence. Never summarise, never add information.
- Keep every number, unit, amount, date, proper noun, address, phone number, e-mail address and URL exactly as written.
- Keep exactly the same line breaks, paragraphs and lists as the French: each "- " list line stays a "- " list line.
- The description is HTML: keep every tag exactly as it is (<p>, <br>, <strong>, <em>, <ul>, <li>...), translate only the text between tags.
${listingWritingPrompt(target)}

OUTPUT
Return only one JSON object, with no text before or after it and no Markdown fence:
{"title": "...", "description": "...", "short": "..."}
Use an empty string for a field whose French text is empty.`;
}

export type ListingSource = { title: string; description: string; short: string };
export type ListingTranslation = { title: string; description: string; short: string };

/** Lecture tolerante de l'objet JSON renvoye. */
export function parseTranslation(text: string): ListingTranslation | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
    return { title: s("title"), description: s("description"), short: s("short") };
  } catch {
    return null;
  }
}

/** Correction automatique de la forme (meme code que l'enregistrement). */
export function fixTranslation(t: ListingTranslation, lang: "en" | "de"): ListingTranslation {
  return {
    // Pas de regle "titre" ici : elle mettrait en minuscules les noms de
    // lieux ("Luxembourg City") ; la consigne demande deja la casse de phrase.
    title: t.title ? autoFixText(t.title, lang).text : "",
    description: t.description ? autoFixHtml(t.description, lang).text : "",
    short: t.short ? autoFixText(t.short, lang).text : "",
  };
}

export type LangOutcome = { lang: "en" | "de"; call: ClaudeCall; translation: ListingTranslation | null };

/** Traduction anglaise et allemande (deux appels en parallele). */
export async function translateListing(source: ListingSource, opts: { apiKey?: string | null; fetcher?: Fetcher } = {}): Promise<LangOutcome[]> {
  const user = JSON.stringify({ title: source.title, description: source.description, short: source.short });
  // Sortie : environ 1,2 fois le texte source, plus la marge du JSON.
  const maxTokens = Math.min(32000, Math.max(1024, Math.ceil((user.length / 3) * 1.6) + 512));
  return Promise.all(
    (["en", "de"] as const).map(async (lang) => {
      const call = await callClaude({ system: translationSystem(lang), user, maxTokens }, opts);
      if (!call.ok) return { lang, call, translation: null };
      const parsed = parseTranslation(call.text);
      if (!parsed) return { lang, call: { ok: false as const, code: "incomplete" as const, usage: call.usage }, translation: null };
      return { lang, call, translation: fixTranslation(parsed, lang) };
    }),
  );
}

// Sprint I18N-Mistral — Helper de traduction automatique FR -> EN/DE via
// Mistral AI (model mistral-small-latest). Pattern fetch identique au
// chatbot Elena (app/api/chatbot/route.ts) pour la coherence.
//
// Usage type cote server action :
//   import { translateBatch } from "@/lib/translate";
//   const en = await translateBatch({ title, description, short_pitch }, "EN");
//   const de = await translateBatch({ title, description, short_pitch }, "DE");
//
// Garde-fous :
// - text vide / null / undefined -> retourne "" (translateText) ou skip (Batch)
// - text < 3 caracteres -> retourne text tel quel (pas la peine de traduire)
// - Erreur Mistral (rate limit, network, 500) -> throw Error explicite.
//   Les callers (server actions) doivent wrap en try/catch pour ne pas
//   bloquer le save FR si la traduction echoue (cf. C2).
//
// Cible : luxury real estate (Luxembourg). Prompt force "Return ONLY the
// translation, no explanations" pour eviter les wrappers Markdown que
// Mistral ajoute parfois.
//
// Note : pas de `import "server-only"` ici car ce helper est consomme aussi
// par scripts/translate-existing-offmarket.mjs (tsx Node standalone, hors
// contexte Next). MISTRAL_API_KEY est lu via process.env exclusivement —
// jamais expose au bundle client (le helper n'est appele que cote serveur
// dans les server actions admin).

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

type TargetLang = "EN" | "DE";
type SourceLang = "FR" | "EN" | "DE";

const LANG_NAME: Record<TargetLang | SourceLang, string> = {
  FR: "French",
  EN: "English",
  DE: "German",
};

/**
 * Traduit un texte unique via Mistral.
 *
 * @param text Le texte source (FR par defaut). HTML preserve si present.
 * @param targetLang Langue cible ("EN" | "DE").
 * @param sourceLang Langue source (defaut "FR").
 * @returns Le texte traduit. Strip eventuels wrappers Markdown.
 * @throws Error si la cle MISTRAL_API_KEY manque OU si fetch echoue.
 */
export async function translateText(
  text: string,
  targetLang: TargetLang,
  sourceLang: SourceLang = "FR",
): Promise<string> {
  // Garde-fous : entrees vides / triviales -> pas d'appel API.
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.length < 3) return text;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("[translate] MISTRAL_API_KEY missing in environment");
  }

  // Sprint OPTIM-1B C1 : prompt renforce FIDELITE LITTERALE STRICTE.
  // Probleme constate sur OFF-2026-001 : Mistral resumait la description
  // FR (30 lignes : processus 5 etapes, contacts, multilingue, www) en
  // EN/DE de ~10 lignes — processus/contacts/www SUPPRIMES. Cause : prompt
  // precedent (Sprint HTML-RENDERING) focalise HTML uniquement, aucune
  // instruction de longueur/fidelite -> Mistral defaut "smart summarize".
  //
  // Regle business Julien : FR = source de verite, EN/DE doivent etre
  // une traduction LITTERALE phrase par phrase, meme nombre de paragraphes,
  // longueur ~equivalente (+/-15%).
  const systemPrompt = `You are a professional translator specialized in luxury real estate.
Translate the given ${LANG_NAME[sourceLang]} text to ${LANG_NAME[targetLang]}.

CRITICAL RULES — STRICT LITERAL TRANSLATION:
1. Translate LITERALLY, sentence by sentence. DO NOT summarize. DO NOT condense. DO NOT paraphrase. DO NOT abridge.
2. Preserve EVERY paragraph, EVERY line, EVERY bullet point, EVERY sentence in the EXACT same order.
3. The translated text MUST have the same number of paragraphs as the input.
4. The translated text MUST have approximately the same length as the input (within 15% tolerance).
5. DO NOT omit any information, even if it seems redundant or repetitive.
6. DO NOT invent or add content not present in the input.
7. Preserve all proper nouns exactly (names, brands, places, URLs, email addresses, phone numbers).

HTML PRESERVATION (if input contains HTML tags):
8. Preserve EVERY HTML tag exactly as-is: <p>, </p>, <br>, <strong>, </strong>, <em>, </em>, <ul>, </ul>, <ol>, </ol>, <li>, </li>, <b>, </b>, <i>, </i>.
9. DO NOT add new HTML tags. DO NOT remove existing ones.
10. Translate ONLY the text content between tags.

OUTPUT:
11. Return ONLY the translation. No preamble, no quotes, no markdown, no explanations, no 'Here is the translation' prefix.`;

  const res = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[translate] Mistral HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    throw new Error("[translate] Mistral response missing choices[0].message.content");
  }

  // Strip wrappers Markdown si Mistral en ajoute malgre le prompt
  // (ex. backticks autour du texte, guillemets francais, etc.)
  return raw
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/^["«»]+|["«»]+$/g, "")
    .trim();
}

/**
 * Traduit en parallele un set de champs (Promise.all). Ignore les valeurs
 * vides / null / undefined. Pratique pour traduire title + description +
 * short_pitch d'un coup.
 *
 * @param texts Objet { fieldKey: textFR }. Les valeurs falsy sont skip.
 * @param targetLang Langue cible.
 * @returns Objet { fieldKey: textTranslated } — meme structure, valeurs
 *          traduites. Les cles avec source vide N'APPARAISSENT PAS dans
 *          le retour (le caller fait `Object.assign(payload, result)`).
 * @throws Error si UNE traduction echoue (Promise.all fail-fast). Le
 *          caller doit wrap en try/catch (cf. C2).
 */
export async function translateBatch(
  texts: Record<string, string | null | undefined>,
  targetLang: TargetLang,
): Promise<Record<string, string>> {
  const entries = Object.entries(texts).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  ) as [string, string][];

  if (entries.length === 0) return {};

  const translations = await Promise.all(
    entries.map(([, text]) => translateText(text, targetLang)),
  );

  const out: Record<string, string> = {};
  entries.forEach(([key], i) => {
    out[key] = translations[i];
  });
  return out;
}

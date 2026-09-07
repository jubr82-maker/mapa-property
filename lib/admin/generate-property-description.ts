// Sprint BRIQUE-IA-1 — Traduction des descriptions (EN/DE) à partir du
// texte FRANÇAIS déjà rédigé par l'utilisateur, via Groq.
//
// Changement d'approche (2026-09) : la version précédente REDIGEAIT les
// 3 langues depuis une fiche de faits structurés. Nouvelle exigence :
// l'utilisateur écrit lui-même le FR, l'IA se contente de le TRADUIRE en
// EN/DE — fidèle au sens et au ton, jamais une nouvelle rédaction depuis
// les caractéristiques du bien. Le FR n'est plus régénéré (déjà connu).
//
// Distinct de lib/translate.ts (Mistral, traduction littérale stricte
// phrase par phrase, historiquement pour l'off-market) : ici la
// traduction est native et soignée plutôt que mot à mot, mais reste
// strictement fidèle au sens — jamais une réécriture libre.
//
// Plomberie : même endpoint/clé que le fallback Groq du chatbot Eléna
// (app/api/chatbot/route.ts) — endpoint OpenAI-compatible, GROQ_API_KEY
// (confirmée présente en Production Vercel), JSON Object Mode
// (response_format json_object, documenté par Groq comme supporté par
// tous les modèles).
//
// Modèle : qwen/qwen3.6-27b (llama-3.3-70b-versatile est déprécié sur le
// tier gratuit/développeur depuis le 16/08/2026, cf. commit précédent).
//
// IMPORTANT — format de requête : Qwen sur Groq exige au moins un message
// role:"user" ("No user query found in messages" sinon). La version
// précédente de ce fichier n'envoyait QUE un message system — c'était le
// bug. Le texte FR à traduire est maintenant le message user ; le prompt
// système ne contient que les instructions.

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen/qwen3.6-27b";

export interface TranslatedTexts {
  en: string;
  de: string;
}

// Bloc d'exigence linguistique — l'allemand est la langue la plus
// risquée pour un modèle non spécialisé (déclinaisons, registre
// commercial soutenu), donc la seule sur laquelle on détaille le niveau
// d'exigence attendu plutôt que de se contenter d'un "traduis bien".
const LANGUAGE_QUALITY_RULES = `EXIGENCE DE QUALITÉ LINGUISTIQUE — NON NÉGOCIABLE :
Chaque langue est une traduction NATIVE et soignée, jamais mot à mot ni mécanique : un traducteur natif expert reformulerait naturellement dans sa langue tout en restant strictement fidèle au sens du texte source.
- Anglais : registre international premium ("luxury real estate"), fluide et naturel, pas de calque du français.
- Allemand : attention particulière — cas et déclinaisons rigoureusement corrects (nominatif/accusatif/datif/génitif), accords adjectifs/articles corrects, registre commercial soutenu (vouvoiement implicite, style "Sie"), vocabulaire immobilier allemand idiomatique (ex. "Wohnfläche", "hochwertige Ausstattung", "gehobene Preislage", "gepflegter Zustand"). L'allemand ne doit JAMAIS être une traduction mot à mot calquée sur la structure française — la syntaxe (ordre des mots, subordonnées) doit être authentiquement allemande.`;

function buildTranslatePrompt(): string {
  return `Tu es traducteur professionnel senior spécialisé en immobilier de prestige pour MAPA Property (Luxembourg), clientèle premium trilingue. L'utilisateur va te fournir, dans le message suivant, un texte français déjà rédigé. Ta seule tâche : le traduire fidèlement en anglais et en allemand.

RÈGLES DE FIDÉLITÉ — NON NÉGOCIABLES :
1. Traduis le SENS et le TON du texte fourni, rien de plus, rien de moins. Ne résume pas, n'enrichis pas, ne raccourcis pas, ne développe pas. N'ajoute et ne retire aucune information, aucun chiffre, aucun fait par rapport au texte source.
2. Conserve le ton commercial (premium, sobre, élégant, ou autre) déjà présent dans le texte source — tu ne le rends ni plus, ni moins valorisant.
3. Si le texte contient des balises HTML (<p>, <br>, <strong>, <em>, <ul>, <li>...), préserve-les exactement, dans le même ordre, en ne traduisant que le texte entre les balises. N'ajoute ni ne retire aucune balise.
4. Ne renvoie PAS le texte français — il est déjà connu de l'utilisateur.

${LANGUAGE_QUALITY_RULES}

FORMAT DE SORTIE STRICT :
Réponds UNIQUEMENT avec un objet JSON valide de la forme exacte :
{"en": "<traduction anglaise>", "de": "<traduction allemande>"}
Aucun texte avant ou après le JSON. Pas de markdown, pas de backticks.`;
}

// Groq applique aussi des limites de débit (RPM/RPD/TPM, publiées par
// modèle sur console.groq.com/docs/rate-limits) — un 429 reste possible
// en cas de pic de trafic (Eléna partage le même modèle). Retry avec
// backoff exponentiel, borné pour ne jamais boucler indéfiniment.
const RETRY_DELAYS_MS = [2000, 4000, 8000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RATE_LIMIT_MESSAGE =
  "Le service de traduction est momentanément saturé (limite du plan gratuit Groq). Réessayez dans une minute.";

/**
 * Un essai initial + jusqu'à RETRY_DELAYS_MS.length réessais UNIQUEMENT
 * sur 429 (les autres erreurs HTTP échouent immédiatement, pas de retry
 * aveugle). Message system (instructions) + message user (texte FR à
 * traduire) — Qwen exige un message user, sinon "No user query found in
 * messages". Retourne le contenu brut de la réponse.
 */
async function fetchGroqCompletion(
  systemPrompt: string,
  userText: string,
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        // Traduction fidèle : température plus basse que pour une
        // rédaction libre (0.6 avant), pour limiter la dérive de sens
        // tout en gardant une formulation native (pas 0 = mot à mot).
        temperature: 0.4,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json?.choices?.[0]?.message?.content;
      if (typeof raw !== "string" || raw.trim().length === 0) {
        throw new Error("Réponse Groq vide.");
      }
      return raw;
    }

    if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (res.status === 429) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
    const body = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status} : ${body.slice(0, 200)}`);
  }
}

async function callGroqForTranslation(
  textFr: string,
  maxTokens: number,
): Promise<TranslatedTexts> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Traduction IA indisponible (clé Groq non configurée).");
  }
  const trimmed = textFr.trim();
  if (!trimmed) {
    throw new Error("Le texte français est vide — rien à traduire.");
  }

  const raw = await fetchGroqCompletion(buildTranslatePrompt(), trimmed, maxTokens, apiKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Réponse Groq non conforme (JSON invalide).");
  }

  const obj = parsed as Record<string, unknown>;
  const en = typeof obj.en === "string" ? obj.en.trim() : "";
  const de = typeof obj.de === "string" ? obj.de.trim() : "";
  if (!en || !de) {
    throw new Error("Réponse Groq incomplète (en/de manquant).");
  }
  return { en, de };
}

/** Traduit la description complète FR -> EN/DE. Un seul appel Groq. */
export async function translateDescriptionToEnDe(
  textFr: string,
): Promise<TranslatedTexts> {
  return callGroqForTranslation(textFr, 1400);
}

/** Traduit le pitch court FR -> EN/DE. Un seul appel Groq. */
export async function translateShortPitchToEnDe(
  textFr: string,
): Promise<TranslatedTexts> {
  return callGroqForTranslation(textFr, 300);
}

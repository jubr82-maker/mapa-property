// Appel Mistral partage (nov. 2026) : MEME modele et MEME cle que le chatbot
// (aucun nouveau service). Utilise seulement pour RECONNAITRE (JSON strict,
// temperature 0) : jamais pour rediger une reponse affichee. Sans cle, en
// cas d'erreur ou de reponse invalide : null, l'appelant continue sans lui.
// Serveur seulement.

/** Modele verifie sur la documentation officielle Mistral (cf. app/api/chatbot/route.ts). */
export const MISTRAL_MODEL = "ministral-3b-2512";
const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const TIMEOUT_MS = 6000;

export type MistralMessage = { role: "system" | "user" | "assistant"; content: string };

/** Objet JSON renvoye par Mistral (temperature 0, json_object), ou null. */
export async function mistralJson(messages: MistralMessage[], maxTokens = 200): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MISTRAL_MODEL, messages, max_tokens: maxTokens, temperature: 0, response_format: { type: "json_object" } }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error("[mistral] reponse", { status: res.status });
      return null;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Reconnaissance de la question du visiteur (nov. 2026). Mistral (meme
// modele, meme cle que le chatbot, temperature 0, JSON strict) choisit
// SEULEMENT l'identifiant d'une entree de la liste fermee : {"id": "E0xx"}
// ou {"id": null}. Il ne redige jamais rien. Un identifiant inconnu, une
// reponse invalide ou Mistral indisponible valent null.
import { mistralJson } from "@/lib/mistral";
import type { ElenaEntry } from "./qa";

const SYSTEM = `Tu es un classifieur. Tu ne rediges JAMAIS de reponse.
On te donne une liste FERMEE de questions numerotees (identifiant | question FR | EN | DE | autres formulations) et le message d'un visiteur (francais, anglais ou allemand).
Reponds UNIQUEMENT par un objet JSON : {"id": "<identifiant de la question qui a le meme sens>"} ou {"id": null} si aucune ne correspond vraiment.
N'invente jamais d'identifiant. En cas de doute, {"id": null}.`;

/** Liste envoyee au modele : entrees hors modeles de recherche. */
export function recognitionList(entries: ElenaEntry[]): string {
  return entries
    .filter((e) => !e.isTemplate)
    .map((e) => [e.id, e.question.fr, e.question.en, e.question.de, e.variants.join(" ; ")].filter(Boolean).join(" | "))
    .join("\n");
}

/** Identifiant valide (entree existante, hors modele), sinon null. */
export function validRecognizedId(raw: unknown, entries: ElenaEntry[]): string | null {
  const id = raw && typeof raw === "object" ? (raw as { id?: unknown }).id : undefined;
  if (typeof id !== "string" || !/^E\d{3}$/.test(id)) return null;
  return entries.some((e) => e.id === id && !e.isTemplate) ? id : null;
}

export async function recognizeEntry(text: string, entries: ElenaEntry[]): Promise<string | null> {
  const r = await mistralJson(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Questions :\n${recognitionList(entries)}\n\nMessage du visiteur : ${text.slice(0, 600)}` },
    ],
    30,
  );
  return validRecognizedId(r, entries);
}

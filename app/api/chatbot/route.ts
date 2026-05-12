import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/components/chatbot/chatbot-knowledge";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages?: Message[];
  locale?: string;
  pageContext?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/;

const callMistral = async (messages: Message[]) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages,
        max_tokens: 400,
        temperature: 0.6,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content as string | null;
  } catch {
    return null;
  }
};

const callGroq = async (messages: Message[]) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 400,
          temperature: 0.6,
        }),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content as string | null;
  } catch {
    return null;
  }
};

const fallbackReply = (locale: string, lastUser: string): string => {
  const lower = lastUser.toLowerCase();
  if (locale === "en") {
    if (/(off.?market|nda)/.test(lower))
      return "Off-market access requires a contractual NDA and verified financial capacity. I'd be glad to put you in touch with Julien — please use the contact buttons on the site.";
    if (/(fee|honor|price|cost)/.test(lower))
      return "Sale mandates: Exclusive 3%, Semi-Exclusive 4%, Simple 5%, Autonomous 1% (excl. VAT). Search mandate 1-3%. Full details on the Fees page.";
    if (/(mandat|exclusive|search)/.test(lower))
      return "We offer 4 sale mandates (Exclusive, Semi, Simple, Autonomous) and a Search mandate. Each defines the engagement and fees.";
    return "Thank you for your message. The chatbot AI is not yet active here — for an immediate response, contact Julien via the contact buttons available on the site.";
  }
  if (locale === "de") {
    if (/(off.?market|nda)/.test(lower))
      return "Der Off-Market-Zugang erfordert eine vertragliche NDA und geprüfte Finanzkraft. Ich kann Sie gerne mit Julien verbinden — nutzen Sie bitte die Kontakt-Buttons auf der Website.";
    if (/(honorar|preis|kost)/.test(lower))
      return "Verkaufsmandate: Exklusiv 3 %, Halb-Exklusiv 4 %, Einfach 5 %, Autonom 1 % (zzgl. MwSt.). Suchmandat 1-3 %. Details auf der Honorare-Seite.";
    return "Danke für Ihre Nachricht. Der KI-Chatbot ist hier noch nicht aktiv — für eine sofortige Antwort kontaktieren Sie bitte Julien über die Kontakt-Buttons auf der Website.";
  }
  if (/(off.?market|nda)/.test(lower))
    return "L'accès off-market nécessite un NDA contractuel et une capacité financière vérifiée. Je vous mets volontiers en relation avec Julien — utilisez les boutons de contact disponibles sur le site.";
  if (/(honorair|prix|tarif|coût|cout)/.test(lower))
    return "Mandats de vente : Exclusif 3 %, Semi-Exclusif 4 %, Simple 5 %, Autonome 1 % (HT). Mandat de recherche 1-3 %. Détails sur la page Honoraires.";
  if (/(mandat|exclusif|recherche)/.test(lower))
    return "Nous proposons 4 mandats de vente (Exclusif, Semi, Simple, Autonome) et un mandat de recherche. Chacun définit l'engagement et les honoraires.";
  if (/(estim|valeur|prix|combien)/.test(lower))
    return "Notre estimateur en ligne vous donne une fourchette en moins de 2 minutes : /services/estimer. La visite la rend juste.";
  return "Merci pour votre message. Le chatbot IA n'est pas encore activé ici — pour une réponse immédiate, contactez Julien via les boutons de contact disponibles sur le site.";
};

const tryAutoLead = async (
  conversation: Message[],
  locale: string,
  pageContext: string,
) => {
  const userText = conversation
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const email = userText.match(EMAIL_RE)?.[0];
  const phone = userText.match(PHONE_RE)?.[0];
  if (!email && !phone) return;
  try {
    const sb = supabaseServer();
    await sb.from("leads").insert({
      email: email ?? "no-email@chatbot.mapaproperty.lu",
      phone: phone ?? undefined,
      message: userText.slice(0, 2000),
      type: "chatbot",
      source: `chatbot:${pageContext || "home"}`,
      lang: locale,
    });
  } catch {
    // silent fail — chatbot continues even if insert fails
  }
};

export async function POST(req: Request) {
  const limit = rateLimit(req, {
    windowMs: 60_000,
    max: 30,
    namespace: "chatbot",
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_in_ms: limit.resetIn },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const { messages = [], locale = "fr", pageContext = "" } = body;

  if (messages.length === 0) {
    return NextResponse.json({ error: "missing_messages" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(locale, pageContext);
  const fullMessages: Message[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let reply = await callMistral(fullMessages);
  if (!reply) reply = await callGroq(fullMessages);

  if (!reply) {
    const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    reply = fallbackReply(locale, lastUser);
  }

  // Auto-lead detection (background, fire-and-forget)
  void tryAutoLead(messages, locale, pageContext);

  return NextResponse.json({ reply });
}

export const dynamic = "force-dynamic";

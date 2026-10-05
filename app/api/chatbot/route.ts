import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/security/sanitize";
import { createHash } from "crypto";
import { getTranslations } from "next-intl/server";
import { buildSystemPrompt } from "@/components/chatbot/chatbot-knowledge";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { sendLeadEmails } from "@/lib/email/lead-emails";
import { insertLeadWithConsent } from "@/lib/lead-insert";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { getLockedTopicsReply } from "@/lib/chatbot/locked-topics";

const CHATBOT_MAX_MESSAGES = 20;
const CHATBOT_MAX_MESSAGE_CHARS = 2000;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  action?: "consent";
  messages?: Message[];
  locale?: string;
  pageContext?: string;
  // Sprint ELENA-REFONTE — action de consentement explicite (point 5).
  decision?: "accept" | "decline";
  email?: string;
  phone?: string;
  transcript?: string;
  turnstileToken?: string;
}

interface NavigateIntent {
  action: "navigate";
  url: string;
}

// Sprint ELENA-NAV C2 — parse la reponse LLM en JSON strict {message, intent}.
// Robuste : si parse fail OR structure invalide -> retourne le texte tel
// quel comme message + intent=null. Validation URL : doit etre un path
// relatif (commence par "/") pour eviter open redirect.
function parseAssistantReply(
  raw: string,
): { message: string; intent: NavigateIntent | null } {
  if (!raw) return { message: "", intent: null };
  let parsed: unknown;
  try {
    // Tolere les wrappers markdown ```json ... ``` que Mistral ajoute
    // parfois malgre le system prompt.
    const stripped = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(stripped);
  } catch {
    return { message: raw, intent: null };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { message?: unknown }).message !== "string"
  ) {
    return { message: raw, intent: null };
  }
  const obj = parsed as { message: string; intent?: unknown };
  let intent: NavigateIntent | null = null;
  if (
    obj.intent &&
    typeof obj.intent === "object" &&
    (obj.intent as { action?: unknown }).action === "navigate" &&
    safeInternalPath((obj.intent as { url?: unknown }).url)
  ) {
    // Chemin interne uniquement (OWASP ASVS 5.1.5) : "//site", "/\site",
    // schemas et caracteres de controle refuses.
    intent = {
      action: "navigate",
      url: safeInternalPath((obj.intent as { url?: unknown }).url) as string,
    };
  }
  return { message: obj.message, intent };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/;

// Sprint ELENA-REFONTE point 6 — limite quotidienne par visiteur, en plus
// du limiteur en memoire existant (30 req/min, cf. lib/rate-limit.ts qui
// couvre les rafales mais repart a zero a chaque redemarrage du process).
// 40 messages/jour : une session legitime tourne autour de 5 a 10 echanges
// sur un sujet ; 40 laisse la place a plusieurs sessions dans la journee
// (le visiteur revient apres reflexion) tout en bornant tres largement le
// cout API et le risque d'abus scripte, qui envoie generalement des
// centaines de requetes, pas quelques dizaines.
const CHATBOT_DAILY_LIMIT = 40;

function hashVisitor(ip: string): string {
  const salt = process.env.TRACKING_IP_SALT ?? "mapa_default_salt_change_me_2026";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

function isMissingTable(error: { code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205";
}

// Verifie la limite quotidienne via chatbot_logs (persistante des que la
// migration supabase/migrations/20260930_chatbot_logs.sql est appliquee).
// Degrade gracieusement si la table est absente : le limiteur en memoire
// (rateLimit ci-dessus) reste la seule protection active dans ce cas.
async function checkDailyLimit(visitorHash: string): Promise<boolean> {
  try {
    const sb = supabaseService();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error } = await sb
      .from("chatbot_logs")
      .select("id", { count: "exact", head: true })
      .eq("visitor_hash", visitorHash)
      .gte("created_at", startOfDay.toISOString());
    if (error) {
      if (!isMissingTable(error)) {
        console.error("[api/chatbot] daily limit check echoue", { code: error.code });
      }
      return true;
    }
    return (count ?? 0) < CHATBOT_DAILY_LIMIT;
  } catch (e) {
    console.error("[api/chatbot] daily limit check exception", {
      code: (e as { code?: string })?.code ?? "unknown_error",
    });
    return true;
  }
}

// Journalisation best-effort d'un echange (point 8). Ne bloque jamais la
// reponse au visiteur. Aucune donnee personnelle non volontairement
// transmise : question/reponse sont le texte tel que saisi/genere, jamais
// enrichi (pas d'IP en clair, uniquement son empreinte hachee).
async function logChatbotInteraction(entry: {
  locale: string;
  pageContext: string;
  engine: "mistral" | "fallback" | "locked" | "consent_accept" | "consent_decline";
  question: string;
  answer: string;
  leadCreated: boolean;
  visitorHash?: string;
}): Promise<void> {
  try {
    const sb = supabaseService();
    const { error } = await sb.from("chatbot_logs").insert({
      locale: entry.locale,
      page_context: entry.pageContext || "home",
      engine: entry.engine,
      question: entry.question.slice(0, 2000),
      answer: entry.answer.slice(0, 2000),
      lead_created: entry.leadCreated,
      visitor_hash: entry.visitorHash,
    });
    if (error && !isMissingTable(error)) {
      console.error("[api/chatbot] log echoue", { code: error.code });
    }
  } catch (e) {
    console.error("[api/chatbot] log exception", {
      code: (e as { code?: string })?.code ?? "unknown_error",
    });
  }
}

// Sprint MODELE-DEBIT — modele change de mistral-small-latest (plafond
// compte : 20 000 jetons/min, 1 req/s, PROUVE epuise en 2-3 echanges vu le
// prompt systeme complet a chaque appel) vers ministral-3b-2512 (meme
// compte : 1 300 000 jetons/min, 12,5 req/s). Nom exact verifie sur la
// documentation officielle Mistral (docs.mistral.ai/models/ministral-3-3b-25-12,
// qui cite litteralement "ministral-3b-2512" comme identifiant d'API),
// jamais devine.
const MISTRAL_MODEL = "ministral-3b-2512";
const MISTRAL_RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callMistralOnce(
  apiKey: string,
  messages: Message[],
): Promise<{ text: string | null; failureCode: string | null }> {
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.6,
        // Sprint ELENA-NAV phase 2 : fiabilise le JSON strict attendu par
        // parseAssistantReply. Ministral 3B supporte aussi json_object.
        // parseAssistantReply reste filet en cas de drift inattendu.
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { text: null, failureCode: `mistral_http_${res.status}` };
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content as string | null;
    if (!text) return { text: null, failureCode: "mistral_empty_response" };
    return { text, failureCode: null };
  } catch {
    return { text: null, failureCode: "mistral_exception" };
  }
}

// Une seule nouvelle tentative, uniquement sur 429 (plafond de debit
// depasse), apres 1 seconde d'attente. Toute autre erreur (cle absente,
// 4xx/5xx non lie au debit, exception reseau) tombe directement sur le
// repli heuristique, sans attendre inutilement le visiteur.
const callMistral = async (
  messages: Message[],
): Promise<{ text: string | null; failureCode: string | null }> => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return { text: null, failureCode: "no_api_key" };

  const first = await callMistralOnce(apiKey, messages);
  if (first.text || first.failureCode !== "mistral_http_429") return first;

  console.warn("[api/chatbot] mistral 429, nouvelle tentative dans 1s", {
    code: first.failureCode,
  });
  await sleep(MISTRAL_RETRY_DELAY_MS);
  const retry = await callMistralOnce(apiKey, messages);
  if (!retry.text) {
    console.error("[api/chatbot] mistral 429 persiste apres nouvelle tentative", {
      code: retry.failureCode,
    });
  }
  return retry;
};

// Sprint ELENA-REFONTE point 4 — repli professionnel. Les reponses
// specifiques (off-market, honoraires, mandats, estimation) restent
// utiles et exactes ; seul le message generique changeait de ton avant
// cette passe ("chatbot non active", faux et pejoratif). Toutes les
// chaines passent desormais par next-intl (namespace chatbot), 3 langues.
async function fallbackReply(locale: string, lastUser: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: "chatbot" });
  const lower = lastUser.toLowerCase();
  if (/(off.?market|nda)/.test(lower)) return t("fallback_offmarket");
  if (/(fee|honor|price|cost|honorair|prix|tarif|coût|cout)/.test(lower))
    return t("fallback_fees");
  if (/(mandat|exclusive|search|exclusif|recherche)/.test(lower))
    return t("fallback_mandate");
  if (/(estim|valeur|value|combien|how much)/.test(lower))
    return t("fallback_estimate");
  return t("fallback_reply");
}

// Sprint ELENA-REFONTE point 5 — detection de coordonnees, SANS creation
// de lead. Retourne les coordonnees detectees pour que le client propose
// explicitement le consentement ; la creation reste conditionnee a un
// accord explicite (cf. action:"consent" ci-dessous).
function detectContact(conversation: Message[]): { email?: string; phone?: string } | null {
  const userText = conversation
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const email = userText.match(EMAIL_RE)?.[0];
  const phone = userText.match(PHONE_RE)?.[0];
  if (!email && !phone) return null;
  return { email, phone };
}

async function handleConsent(req: Request, body: RequestBody): Promise<Response> {
  const locale = body.locale ?? "fr";
  const pageContext = body.pageContext ?? "";

  if (body.decision !== "accept") {
    await logChatbotInteraction({
      locale,
      pageContext,
      engine: "consent_decline",
      question: "[consentement refuse]",
      answer: "[aucun lead cree]",
      leadCreated: false,
    });
    return NextResponse.json({ ok: true });
  }

  // Turnstile verifie uniquement au moment de la creation effective du
  // lead (point 6) : aucune friction sur les messages ordinaires, un seul
  // controle au moment ou une donnee personnelle quitte reellement le
  // chatbot, comme sur les autres formulaires du site.
  const turnstileOk = await verifyTurnstile(body.turnstileToken, clientIp(req));
  if (!turnstileOk) {
    return NextResponse.json({ ok: false, error: "turnstile_failed" }, { status: 403 });
  }

  if (!body.email && !body.phone) {
    return NextResponse.json({ ok: false, error: "missing_contact" }, { status: 400 });
  }

  const consentAt = new Date().toISOString();
  const sb = supabaseService();
  const res = await insertLeadWithConsent(
    sb,
    "leads",
    {
      email: body.email ?? "no-email@chatbot.mapaproperty.lu",
      phone: body.phone ?? undefined,
      message: (body.transcript ?? "").slice(0, 2000),
      type: "chatbot",
      source: `chatbot:${pageContext || "home"}`,
      lang: locale,
    },
    consentAt,
  );

  if (!res.ok) {
    console.error("[api/chatbot] consent lead insert echoue", {
      code: res.error?.code,
    });
    await logChatbotInteraction({
      locale,
      pageContext,
      engine: "consent_accept",
      question: "[consentement accepte]",
      answer: "[echec insertion lead]",
      leadCreated: false,
    });
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  // Meme chemin que les formulaires : couche d'envoi existante, aucun
  // mecanisme d'envoi parallele.
  await sendLeadEmails({
    contactEmail: body.email,
    phone: body.phone,
    subject: "Conversation Eléna",
    message: (body.transcript ?? "").slice(0, 2000),
    type: "chatbot",
    source: `chatbot:${pageContext || "home"}`,
    locale,
  });

  await logChatbotInteraction({
    locale,
    pageContext,
    engine: "consent_accept",
    question: "[consentement accepte]",
    answer: "[lead cree]",
    leadCreated: true,
  });

  return NextResponse.json({ ok: true });
}

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

  if (body.action === "consent") {
    return handleConsent(req, body);
  }

  // Audit oct. 2026 (OWASP ASVS 5.1.3, 11.1.4) : seuls les roles user et
  // assistant (jamais system, reserve au serveur), les 20 derniers
  // messages, 2000 caracteres chacun : cout Mistral par appel borne.
  const messages: Message[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is Message =>
        Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .slice(-CHATBOT_MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, CHATBOT_MAX_MESSAGE_CHARS) }));
  const locale = typeof body.locale === "string" && ["fr", "en", "de"].includes(body.locale) ? body.locale : "fr";
  const pageContext = typeof body.pageContext === "string" ? body.pageContext.slice(0, 200) : "";

  if (messages.length === 0) {
    return NextResponse.json({ error: "missing_messages" }, { status: 400 });
  }

  const ip = clientIp(req);
  const visitorHash = ip ? hashVisitor(ip) : undefined;
  if (visitorHash) {
    const withinDailyLimit = await checkDailyLimit(visitorHash);
    if (!withinDailyLimit) {
      const t = await getTranslations({ locale, namespace: "chatbot" });
      return NextResponse.json({
        reply: t("rate_limit_reached"),
        intent: null,
        contactDetected: null,
      });
    }
  }

  const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";

  let reply: string;
  let engine: "mistral" | "fallback" | "locked";
  let intent: NavigateIntent | null = null;

  // Mission "chiffres verrouilles" : sujets a fort risque (frais
  // d'acquisition, Bëllegen Akt, TVA, taux de mandats, avance sur frais,
  // durees de mandat) : reponse figee construite depuis les sources
  // uniques, jamais transmise au modele pour reformulation. Court-circuite
  // entierement l'appel a Mistral pour ce tour (cf. commentaire dans
  // lib/chatbot/locked-topics.ts pour le cas d'un message mixte).
  const lockedReply = getLockedTopicsReply(lastUser, locale);

  if (lockedReply) {
    reply = lockedReply;
    engine = "locked";
  } else {
    const systemPrompt = buildSystemPrompt(locale, pageContext);
    const fullMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const { text: mistralText, failureCode } = await callMistral(fullMessages);

    if (mistralText) {
      const parsed = parseAssistantReply(mistralText);
      reply = parsed.message;
      intent = parsed.intent;
      engine = "mistral";
    } else {
      // Point 4 — la vraie cause de l'echec est journalisee cote serveur,
      // sans donnee personnelle (code technique uniquement, jamais le texte
      // de l'utilisateur ni sa reponse). Lecture : cf. rapport de mission
      // (Vercel Runtime Logs du projet, filtre "[api/chatbot] mistral").
      console.error("[api/chatbot] mistral indisponible, repli heuristique", {
        code: failureCode ?? "unknown",
      });
      reply = await fallbackReply(locale, lastUser);
      engine = "fallback";
    }
  }

  // Point 5 — detection sans creation silencieuse. Le client affiche la
  // demande de consentement explicite ; rien n'est ecrit en base ici.
  const contactDetected = detectContact(messages);
  const message = reply;

  await logChatbotInteraction({
    locale,
    pageContext,
    engine,
    question: lastUser,
    answer: message,
    leadCreated: false,
    visitorHash,
  });

  return NextResponse.json({ reply: message, intent, contactDetected });
}

export const dynamic = "force-dynamic";

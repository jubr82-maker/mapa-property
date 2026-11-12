import { attributionColumns } from "@/lib/pilotage/attribution";
import { recordFormEvent } from "@/lib/pilotage/form-events";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getTranslations } from "next-intl/server";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { sendLeadEmails } from "@/lib/email/lead-emails";
import { insertLeadWithConsent } from "@/lib/lead-insert";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { getLockedTopicsReply } from "@/lib/chatbot/locked-topics";
import { fetchAllPropertiesWithCover, type PropertyWithCover } from "@/lib/data";
import { loadElenaEntries } from "@/lib/elena/qa";
import { recognizeEntry } from "@/lib/elena/recognize";
import { elenaRespond, type ElenaReply } from "@/lib/elena/respond";
import { bannerOf } from "@/lib/property-banner";
import { formatPrice } from "@/lib/format/numbers";

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
  attribution?: unknown;
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
  engine: "qa" | "default" | "search" | "locked" | "consent_accept" | "consent_decline";
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
    await recordFormEvent("chatbot_consent", "captcha", 403);
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
      ...attributionColumns(body.attribution),
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
    await recordFormEvent("chatbot_consent", "db_error", 500);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  await recordFormEvent("chatbot_consent", "ok", 200);

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

  // Nov. 2026 : Elena sans aucune liberte (lib/elena/respond.ts). Sujets
  // verrouilles d'abord (inchanges), puis recherche de biens (analyseur et
  // regles du site), puis reconnaissance de l'entree (Mistral : identifiant
  // seulement), sinon l'entree par defaut et la prise de contact. La reponse
  // affichee est TOUJOURS le texte exact d'une entree validee (table faqs,
  // page 'elena', ou docs/elena/elena-qa.json), jamais un texte du modele.
  const tBanner = await getTranslations({ locale, namespace: "status_banner" });
  const tChat = await getTranslations({ locale, namespace: "chatbot" });
  const [{ entries }, properties] = await Promise.all([loadElenaEntries(), fetchAllPropertiesWithCover()]);
  const answer: ElenaReply = await elenaRespond<PropertyWithCover>(lastUser, locale, {
    entries,
    properties,
    recognize: recognizeEntry,
    locked: getLockedTopicsReply,
    priceLabel: (p) => {
      const b = bannerOf(p);
      if (b?.kind === "sold") return tBanner("sold_price");
      if (b?.kind === "rented") return tBanner("rented_price");
      if (!p.price) return tChat("price_on_request");
      const v = formatPrice(p.price, locale);
      return p.transaction === "rent" ? tChat("price_per_month", { price: v }) : v;
    },
  });
  const reply = answer.reply;
  const engine = answer.engine;

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

  return NextResponse.json({
    reply: message,
    intent: null,
    button: answer.button,
    properties: answer.properties,
    offerContact: answer.offerContact,
    contactDetected,
  });
}

export const dynamic = "force-dynamic";

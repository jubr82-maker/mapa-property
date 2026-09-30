// Couche d'envoi email unique, par SMTP IONOS. Remplace Resend.
// Utilisee par tous les flux publics (lib/email/lead-emails.ts,
// lib/email/estimation-emails.ts) et donc par toutes les routes qui
// les appellent.
//
// Connexion : port 465, TLS implicite (secure: true), authentification
// PLAIN via SMTP_USER/SMTP_PASSWORD. Verifie manuellement par Julien
// avant cette mission, voir rapport.
//
// Regles :
//   - Ne bloque jamais la reponse au visiteur : ne throw jamais, retourne
//     toujours un resultat { ok, error? }.
//   - Une nouvelle tentative apres un court delai si le premier envoi
//     echoue, puis abandon journalise.
//   - Limite de debit best effort en memoire (par instance serverless,
//     donc non garantie de facon globale entre toutes les instances
//     Vercel : voir le rapport de mission pour le detail de la limite).
//   - Aucune donnee personnelle dans les journaux : uniquement des
//     compteurs, codes de statut/erreur techniques, jamais d'adresse,
//     de nom ou de contenu de message.

import nodemailer, { type Transporter } from "nodemailer";

const FROM_NAME = "MAPA Property";
const FROM_ADDRESS = "site@mapagroup.org";
// Adresse de reponse (Reply-To) : volontairement fixe, inchangee par la
// configuration des destinataires internes ci-dessous — une reponse du
// prospect part toujours vers cette adresse, quel que soit le nombre de
// personnes notifiees en interne.
export const SMTP_REPLY_TO = "j.brebion@mapagroup.org";

// Destinataires des notifications internes (lead recu), pour tous les
// flux qui utilisent cette couche d'envoi (formulaires, chatbot, liste
// d'attente, estimations). Configurable via la variable d'environnement
// MAPA_NOTIFICATION_EMAILS (plusieurs adresses separees par des virgules).
// Absente ou vide -> repli sur l'adresse historique, pour ne rien casser
// avant que la variable soit renseignee dans Vercel.
const DEFAULT_INTERNAL_RECIPIENT = "j.brebion@mapagroup.org";

/** Nettoie une liste d'adresses : espaces superflus, entrees vides, doublons
 * (comparaison insensible a la casse, casse de la premiere occurrence conservee). */
function parseRecipients(raw: string | undefined, fallback: string[]): string[] {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const email = part.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(email);
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

export const INTERNAL_NOTIFICATION_RECIPIENTS: string[] = parseRecipients(
  process.env.MAPA_NOTIFICATION_EMAILS,
  [DEFAULT_INTERNAL_RECIPIENT],
);

// Retenu : 50 emails/heure la premiere semaine d'usage du serveur IONOS,
// puis 500/heure ensuite. Ajustable sans redeploiement de code via la
// variable d'environnement EMAIL_RATE_LIMIT_PER_HOUR (Vercel), pour que
// Julien puisse relever la limite lui-meme apres la premiere semaine
// sans repasser par une session de code.
const DEFAULT_RATE_LIMIT_PER_HOUR = 50;
const RETRY_DELAY_MS = 2000;

let cachedTransporter: Transporter | null = null;
let cachedConfigKey = "";

function configKey(): string {
  return [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
  ].join("|");
}

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !pass) return null;

  const key = configKey();
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass },
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

let windowStartedAt = Date.now();
let windowSentCount = 0;

function withinRateLimit(): boolean {
  const limit =
    Number(process.env.EMAIL_RATE_LIMIT_PER_HOUR) || DEFAULT_RATE_LIMIT_PER_HOUR;
  const now = Date.now();
  if (now - windowStartedAt > 60 * 60 * 1000) {
    windowStartedAt = now;
    windowSentCount = 0;
  }
  if (windowSentCount >= limit) return false;
  windowSentCount += 1;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ne remonte jamais le message brut d'une erreur SMTP dans les journaux :
// certaines reponses serveur (ex. destinataire rejete) peuvent contenir
// l'adresse email fautive. On ne journalise que le code technique fourni
// par nodemailer, ou un libelle generique sinon.
function errorCode(e: unknown): string {
  const withCode = e as { code?: string; responseCode?: number };
  if (withCode?.code) return String(withCode.code);
  if (withCode?.responseCode) return `smtp_${withCode.responseCode}`;
  return "unknown_error";
}

export interface SendMailArgs {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
}

async function attemptSend(
  transporter: Transporter,
  args: SendMailArgs,
): Promise<SendMailResult> {
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to: args.to,
      replyTo: args.replyTo ?? SMTP_REPLY_TO,
      subject: args.subject,
      text: args.text,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorCode(e) };
  }
}

/**
 * Envoie un email via le serveur SMTP IONOS. Best effort : ne throw
 * jamais. Une tentative, puis une seconde apres un court delai si la
 * premiere echoue, puis abandon journalise (code technique uniquement,
 * jamais d'adresse ni de contenu).
 */
export async function sendMail(args: SendMailArgs): Promise<SendMailResult> {
  const recipients = Array.isArray(args.to) ? args.to.length : 1;
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email/smtp] configuration SMTP absente", { recipients });
    return { ok: false, error: "smtp_not_configured" };
  }
  if (!withinRateLimit()) {
    console.error("[email/smtp] limite horaire atteinte", { recipients });
    return { ok: false, error: "rate_limit_exceeded" };
  }

  let result = await attemptSend(transporter, args);
  if (!result.ok) {
    console.error("[email/smtp] premier envoi echoue, nouvelle tentative", {
      recipients,
      error: result.error,
    });
    await sleep(RETRY_DELAY_MS);
    result = await attemptSend(transporter, args);
  }

  if (!result.ok) {
    console.error("[email/smtp] envoi abandonne apres deux tentatives", {
      recipients,
      error: result.error,
    });
  } else {
    console.log("[email/smtp] envoi reussi", { recipients });
  }
  return result;
}

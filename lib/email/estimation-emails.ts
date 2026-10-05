// MAPA Property — emails du formulaire d'estimation public (/api/estimate).
//
// Deux emails envoyés en parallèle via lib/email/smtp.ts (IONOS) :
//   1. CLIENT : accusé de réception + fourchette indicative, dans la
//      langue du visiteur, sans promesse de délai autre que celle déjà
//      affichée sur le site. Envoyé si contactEmail + fourchette valide.
//   2. INTERNE : notification complète aux destinataires configurés via
//      MAPA_NOTIFICATION_EMAILS (cf. lib/email/smtp.ts).
//
// Best effort : ne throw jamais, ne bloque jamais la réponse au visiteur.

import { sendMail, INTERNAL_NOTIFICATION_RECIPIENTS } from "./smtp";
import { receivedAtLine } from "@/lib/email/received-at";
import { formatNumber, formatSurface } from "@/lib/format/numbers";

type Locale = "fr" | "en" | "de";

type Range = { low: number; mid: number; high: number };

interface SendEstimationEmailsArgs {
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  message?: string;
  commune?: string;
  type?: string;
  surfaceLiving?: number;
  range: Range;
  engine: string;
  locale?: Locale | string;
  leadId?: string;
}

// Bug corrige (mission "surfaces decimales, formats de nombres...") :
// cette fonction ignorait la locale du destinataire, si bien qu'un client
// anglophone recevait des chiffres au format francais (espace insecable).
function fmtEur(n: number, locale: string): string {
  return formatNumber(Math.round(n), locale);
}

function pickLocale(input: string | undefined): Locale {
  if (input === "en" || input === "de") return input;
  return "fr";
}

function footer(locale: Locale): string {
  switch (locale) {
    case "en":
      return "MAPA Property, a brand of MAPA Synergy Sàrl.\nLuxembourg.";
    case "de":
      return "MAPA Property, eine Marke der MAPA Synergy Sàrl.\nLuxemburg.";
    default:
      return "MAPA Property, une marque de MAPA Synergy Sàrl.\nLuxembourg.";
  }
}

function clientSubject(locale: Locale, commune: string | undefined): string {
  const c = commune ?? "Luxembourg";
  switch (locale) {
    case "en":
      return `Your MAPA Property valuation, ${c}`;
    case "de":
      return `Ihre MAPA Property Bewertung, ${c}`;
    default:
      return `Votre estimation MAPA Property, ${c}`;
  }
}

function clientBody(args: {
  locale: Locale;
  name: string;
  commune: string;
  range: Range;
}): string {
  const { name, commune, range, locale } = args;
  const low = fmtEur(range.low, locale);
  const mid = fmtEur(range.mid, locale);
  const high = fmtEur(range.high, locale);
  switch (locale) {
    case "en":
      return [
        `Hello ${name},`,
        ``,
        `Thank you for using our online valuation tool. Based on the information you provided, your property in ${commune} is estimated between:`,
        ``,
        `   ${low} € and ${high} € (midpoint: ${mid} €)`,
        ``,
        `This indicative range is calculated by our proprietary EVS engine (Estimation de Valeur Sécurisée).`,
        ``,
        `Our team will follow up with a detailed expertise report, fine tuned based on real comparable sales in your municipality and current Luxembourg market dynamics, within the timeframe indicated on our site.`,
        ``,
        `For an in-person assessment with one of our advisors, simply reply to this email or visit https://mapaproperty.lu/contact.`,
        ``,
        `Best regards,`,
        `MAPA Property team`,
        ``,
        footer(locale),
      ].join("\n");
    case "de":
      return [
        `Guten Tag ${name},`,
        ``,
        `vielen Dank, dass Sie unseren Online-Bewertungsrechner genutzt haben. Basierend auf Ihren Angaben wird Ihre Immobilie in ${commune} geschätzt zwischen:`,
        ``,
        `   ${low} € und ${high} € (Mittelwert: ${mid} €)`,
        ``,
        `Diese indikative Bandbreite wird von unserer hauseigenen EVS-Engine berechnet (Estimation de Valeur Sécurisée).`,
        ``,
        `Unser Team meldet sich mit einem ausführlichen Gutachten-Bericht, verfeinert anhand realer Vergleichsverkäufe in Ihrer Gemeinde und der aktuellen Luxemburger Marktdynamik, innerhalb der auf unserer Website angegebenen Frist.`,
        ``,
        `Für eine persönliche Begutachtung mit einem unserer Berater antworten Sie einfach auf diese E-Mail oder besuchen Sie https://mapaproperty.lu/contact.`,
        ``,
        `Mit freundlichen Grüßen,`,
        `MAPA Property Team`,
        ``,
        footer(locale),
      ].join("\n");
    default:
      return [
        `Bonjour ${name},`,
        ``,
        `Merci d'avoir utilisé notre simulateur d'estimation en ligne. Sur la base des informations transmises, votre bien à ${commune} est estimé entre :`,
        ``,
        `   ${low} € et ${high} € (valeur médiane : ${mid} €)`,
        ``,
        `Cette fourchette indicative est calculée par notre moteur propriétaire EVS (Estimation de Valeur Sécurisée).`,
        ``,
        `Notre équipe vous enverra un rapport d'expertise détaillé, affiné sur la base des ventes comparables réelles dans votre commune et de la dynamique actuelle du marché luxembourgeois, dans le délai indiqué sur notre site.`,
        ``,
        `Pour une évaluation en personne avec l'un de nos conseillers, répondez simplement à ce mail ou rendez-vous sur https://mapaproperty.lu/contact.`,
        ``,
        `Bien cordialement,`,
        `L'équipe MAPA Property`,
        ``,
        footer(locale),
      ].join("\n");
  }
}

function internalSubject(args: { commune?: string; type?: string }): string {
  const c = args.commune ?? "—";
  const t = args.type ?? "—";
  return `Nouveau lead estimation, ${c}, ${t}`;
}

function internalBody(args: SendEstimationEmailsArgs, receivedLine: string): string {
  const lines: string[] = [
    `Nouveau lead estimation via le simulateur public.`,
    receivedLine,
    ``,
    `= PROSPECT =`,
    `Nom         : ${args.contactName ?? "—"}`,
    `Email       : ${args.contactEmail ?? "—"}`,
    `Téléphone   : ${args.contactPhone ?? "—"}`,
    `Locale      : ${args.locale ?? "fr"}`,
    ``,
    `= BIEN =`,
    `Type        : ${args.type ?? "—"}`,
    `Commune     : ${args.commune ?? "—"}`,
    `Surface     : ${args.surfaceLiving ? formatSurface(args.surfaceLiving, "fr") : "—"}`,
    ``,
    `= ESTIMATION CLIENT (${args.engine}) =`,
    `Low         : ${fmtEur(args.range.low, "fr")} €`,
    `Mid         : ${fmtEur(args.range.mid, "fr")} €`,
    `High        : ${fmtEur(args.range.high, "fr")} €`,
    ``,
  ];
  if (args.message) {
    lines.push(`= MESSAGE DU PROSPECT =`, args.message, ``);
  }
  if (args.leadId) {
    lines.push(
      `= ADMIN =`,
      `Détail   : https://mapaproperty.lu/admin/estimations/${args.leadId}`,
    );
  }
  return lines.join("\n");
}

/**
 * Envoie en parallèle :
 *   - 1 email au client (si email + nom + fourchette > 0).
 *   - 1 email interne (toujours, dès qu'une fourchette existe).
 *
 * Best effort : ne throw jamais.
 */
export async function sendEstimationEmails(
  args: SendEstimationEmailsArgs,
): Promise<void> {
  const locale = pickLocale(args.locale);
  const commune = args.commune ?? "Luxembourg";
  const name =
    args.contactName ??
    (locale === "en"
      ? "there"
      : locale === "de"
        ? "geehrte/r Interessent/in"
        : "Madame, Monsieur");

  const tasks: Promise<{ ok: boolean; error?: string }>[] = [];

  if (args.contactEmail && args.range.mid > 0) {
    tasks.push(
      sendMail({
        to: args.contactEmail,
        subject: clientSubject(locale, commune),
        text: clientBody({ locale, name, commune, range: args.range }),
      }),
    );
  }

  tasks.push(
    sendMail({
      to: INTERNAL_NOTIFICATION_RECIPIENTS,
      subject: internalSubject({ commune, type: args.type }),
      text: internalBody(args, await receivedAtLine()),
    }),
  );

  await Promise.allSettled(tasks);
}

// ============================================================================
// Mail d'affinage déclenché manuellement par l'admin depuis
// /admin/estimations/[id]. Proposition d'un Avis de Valeur détaillé offert
// dans le cadre d'un mandat exclusif ou semi-exclusif. Uniquement au
// client (pas de copie interne, l'admin sait déjà qu'il l'envoie).
// Signature Julien Brebion seul, pas de mention Frédéric Mannis.
// ============================================================================

interface SendRefinementArgs {
  contactEmail: string;
  contactName?: string;
  locale?: Locale | string;
}

function refinementSubject(locale: Locale): string {
  switch (locale) {
    case "en":
      return "Your MAPA Property valuation, let's go further together";
    case "de":
      return "Ihre MAPA Property-Schätzung, gehen wir gemeinsam weiter";
    default:
      return "Votre estimation MAPA Property, allons plus loin ensemble";
  }
}

function refinementBody(locale: Locale, contactName: string | undefined): string {
  const salutation = contactName?.trim() ? `Bonjour ${contactName.trim()},` : "Bonjour,";
  switch (locale) {
    case "en": {
      const sal = contactName?.trim() ? `Hello ${contactName.trim()},` : "Hello,";
      return [
        sal,
        ``,
        `You recently valued your property on our website, thank you. The`,
        `estimate you received is indicative: it relies on market data and our`,
        `algorithm, but it does not capture everything that makes your`,
        `property truly valuable, its precise condition, its strengths, its`,
        `exact location, the context of your neighbourhood.`,
        ``,
        `I would like to take this further: a detailed Valuation Report, drawn`,
        `up personally by me, which refines this initial estimate and gives`,
        `you a reliable, argued, actionable price range to sell at the right`,
        `value. This Valuation Report is offered free of charge as part of an`,
        `exclusive or semi-exclusive mandate.`,
        ``,
        `If you would like to discuss it, simply reply to this email or call me.`,
        ``,
        `Kind regards,`,
        `Julien Brebion, Real Estate Director, Exclusive Sourcing Specialist`,
        `+352 691 620 127 · j.brebion@mapagroup.org`,
      ].join("\n");
    }
    case "de": {
      const sal = contactName?.trim() ? `Guten Tag ${contactName.trim()},` : "Guten Tag,";
      return [
        sal,
        ``,
        `Sie haben kürzlich Ihre Immobilie auf unserer Website bewertet,`,
        `ich danke Ihnen. Die erhaltene Schätzung ist indikativ: sie stützt`,
        `sich auf Marktdaten und unseren Algorithmus, berücksichtigt aber`,
        `nicht alles, was den wahren Wert Ihrer Immobilie ausmacht, den`,
        `genauen Zustand, die Vorzüge, die exakte Lage, das Umfeld Ihres`,
        `Stadtteils.`,
        ``,
        `Ich schlage Ihnen vor, weiterzugehen: eine ausführliche`,
        `Wertermittlung (Avis de Valeur), persönlich von mir erstellt, die`,
        `diese erste Schätzung verfeinert und Ihnen eine verlässliche,`,
        `begründete, verwendbare Preisspanne liefert, um zum richtigen Preis`,
        `zu verkaufen. Diese Wertermittlung ist kostenlos im Rahmen eines`,
        `exklusiven oder semi-exklusiven Mandats.`,
        ``,
        `Wenn Sie möchten, melden Sie sich einfach, per E-Mail oder`,
        `Telefon, und wir sprechen darüber.`,
        ``,
        `Mit freundlichen Grüßen,`,
        `Julien Brebion, Real Estate Director, Exclusive Sourcing Specialist`,
        `+352 691 620 127 · j.brebion@mapagroup.org`,
      ].join("\n");
    }
    default:
      return [
        salutation,
        ``,
        `Vous avez récemment estimé votre bien sur notre site, et je vous en`,
        `remercie. L'estimation que vous avez reçue est indicative : elle`,
        `s'appuie sur les données de marché et notre algorithme, mais elle ne`,
        `tient pas compte de tout ce qui fait la vraie valeur de votre bien,`,
        `son état précis, ses atouts, son emplacement exact, le contexte de`,
        `votre quartier.`,
        ``,
        `Je vous propose d'aller plus loin : un Avis de Valeur détaillé,`,
        `établi par mes soins, qui affine cette première estimation et vous`,
        `donne une fourchette fiable, argumentée, exploitable pour vendre au`,
        `juste prix. Cet Avis de Valeur est offert dans le cadre d'un mandat`,
        `exclusif ou semi-exclusif.`,
        ``,
        `Si vous le souhaitez, recontactez-moi simplement, par retour de`,
        `mail ou par téléphone, et nous en parlons.`,
        ``,
        `Bien à vous,`,
        `Julien Brebion, Real Estate Director, Exclusive Sourcing Specialist`,
        `+352 691 620 127 · j.brebion@mapagroup.org`,
      ].join("\n");
  }
}

/**
 * Envoie UN mail au client (pas de copie interne) proposant un Avis de
 * Valeur détaillé. Best effort : ne throw jamais.
 */
export async function sendEstimationRefinementEmail(
  args: SendRefinementArgs,
): Promise<void> {
  const locale = pickLocale(args.locale);
  await sendMail({
    to: args.contactEmail,
    subject: refinementSubject(locale),
    text: refinementBody(locale, args.contactName),
  });
}

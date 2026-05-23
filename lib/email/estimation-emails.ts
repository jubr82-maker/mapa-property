// MAPA Property — Emails Sprint B1 (formulaire estimation public).
//
// Helper unique pour envoyer 2 emails apres une soumission /api/estimate :
//   1. CLIENT : confirmation + fourchette indicative + promesse rapport
//      EVS detaille sous 24h. Envoye si contactEmail + rgpdConsent.
//   2. INTERNE : notification lead a j.brebion@mapagroup.org +
//      f.frederic@mapagroup.org (variable d'env optionnelle).
//
// Pattern : meme strategie que app/api/nda-request/route.ts :
//   - Si RESEND_API_KEY absent → log warn + no-op (jamais de throw).
//   - From : "MAPA Property <noreply@mapaproperty.lu>"
//   - Templates textuels FR/EN/DE inline (pas de templating externe).
//
// Ne JAMAIS bloquer la reponse API : ces envois sont best-effort, awaitable
// mais leurs erreurs sont swallowed + logguees uniquement.

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

const INTERNAL_TO_DEFAULT = "j.brebion@mapagroup.org";
const FROM = "MAPA Property <noreply@mapaproperty.lu>";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

function pickLocale(input: string | undefined): Locale {
  if (input === "en" || input === "de") return input;
  return "fr";
}

function clientSubject(locale: Locale, commune: string | undefined): string {
  const c = commune ?? "Luxembourg";
  switch (locale) {
    case "en":
      return `Your MAPA Property valuation — ${c}`;
    case "de":
      return `Ihre MAPA Property Bewertung — ${c}`;
    default:
      return `Votre estimation MAPA Property — ${c}`;
  }
}

function clientBody(args: {
  locale: Locale;
  name: string;
  commune: string;
  range: Range;
}): string {
  const { name, commune, range } = args;
  const low = fmtEur(range.low);
  const mid = fmtEur(range.mid);
  const high = fmtEur(range.high);
  switch (args.locale) {
    case "en":
      return [
        `Hello ${name},`,
        ``,
        `Thank you for using our online valuation tool. Based on the information you provided, your property in ${commune} is estimated between:`,
        ``,
        `   ${low} € — ${high} € (midpoint: ${mid} €)`,
        ``,
        `This indicative range is calculated by our proprietary EVS engine (Estimation de Valeur Sécurisée).`,
        ``,
        `Within 24 hours, our team will send you a detailed expertise report — fine-tuned based on real comparable sales in your municipality and the current Luxembourg market dynamics.`,
        ``,
        `For an in-person assessment with one of our advisors, simply reply to this email or visit https://mapaproperty.lu/nous-contacter.`,
        ``,
        `Best regards,`,
        `MAPA Property team`,
        ``,
        `— — —`,
        `MAPA SYNERGY Sàrl · LBR B241974 · TVA LU 31988923`,
        `Independent real estate boutique — Luxembourg`,
      ].join("\n");
    case "de":
      return [
        `Guten Tag ${name},`,
        ``,
        `vielen Dank, dass Sie unseren Online-Bewertungsrechner genutzt haben. Basierend auf Ihren Angaben wird Ihre Immobilie in ${commune} geschätzt zwischen:`,
        ``,
        `   ${low} € — ${high} € (Mittelwert: ${mid} €)`,
        ``,
        `Diese indikative Bandbreite wird von unserer hauseigenen EVS-Engine berechnet (Estimation de Valeur Sécurisée).`,
        ``,
        `Innerhalb von 24 Stunden sendet Ihnen unser Team einen detaillierten Gutachten-Bericht, verfeinert anhand realer Vergleichsverkäufe in Ihrer Gemeinde und der aktuellen Luxemburger Marktdynamik.`,
        ``,
        `Für eine persönliche Begutachtung mit einem unserer Berater antworten Sie einfach auf diese E-Mail oder besuchen Sie https://mapaproperty.lu/nous-contacter.`,
        ``,
        `Mit freundlichen Grüßen,`,
        `MAPA Property Team`,
        ``,
        `— — —`,
        `MAPA SYNERGY Sàrl · LBR B241974 · TVA LU 31988923`,
        `Unabhängige Immobilien-Boutique — Luxemburg`,
      ].join("\n");
    default:
      return [
        `Bonjour ${name},`,
        ``,
        `Merci d'avoir utilisé notre simulateur d'estimation en ligne. Sur la base des informations transmises, votre bien à ${commune} est estimé entre :`,
        ``,
        `   ${low} € — ${high} € (valeur médiane : ${mid} €)`,
        ``,
        `Cette fourchette indicative est calculée par notre moteur propriétaire EVS (Estimation de Valeur Sécurisée).`,
        ``,
        `Sous 24h, notre équipe vous enverra un rapport d'expertise détaillé — affiné sur la base des ventes comparables réelles dans votre commune et de la dynamique actuelle du marché luxembourgeois.`,
        ``,
        `Pour une évaluation en personne avec l'un de nos conseillers, répondez simplement à ce mail ou rendez-vous sur https://mapaproperty.lu/nous-contacter.`,
        ``,
        `Bien cordialement,`,
        `L'équipe MAPA Property`,
        ``,
        `— — —`,
        `MAPA SYNERGY Sàrl · LBR B241974 · TVA LU 31988923`,
        `Boutique immobilière indépendante — Luxembourg`,
      ].join("\n");
  }
}

function internalSubject(args: {
  commune?: string;
  type?: string;
}): string {
  const c = args.commune ?? "—";
  const t = args.type ?? "—";
  return `🔔 Nouveau lead estimation — ${c} — ${t}`;
}

function internalBody(args: SendEstimationEmailsArgs): string {
  const lines: string[] = [
    `Nouveau lead estimation via le simulateur public.`,
    ``,
    `═ PROSPECT ═`,
    `Nom         : ${args.contactName ?? "—"}`,
    `Email       : ${args.contactEmail ?? "—"}`,
    `Téléphone   : ${args.contactPhone ?? "—"}`,
    `Locale      : ${args.locale ?? "fr"}`,
    ``,
    `═ BIEN ═`,
    `Type        : ${args.type ?? "—"}`,
    `Commune     : ${args.commune ?? "—"}`,
    `Surface     : ${args.surfaceLiving ? `${args.surfaceLiving} m²` : "—"}`,
    ``,
    `═ ESTIMATION CLIENT (${args.engine}) ═`,
    `Low         : ${fmtEur(args.range.low)} €`,
    `Mid         : ${fmtEur(args.range.mid)} €`,
    `High        : ${fmtEur(args.range.high)} €`,
    ``,
  ];
  if (args.message) {
    lines.push(`═ MESSAGE DU PROSPECT ═`, args.message, ``);
  }
  if (args.leadId) {
    lines.push(
      `═ ADMIN ═`,
      `Détail   : https://mapaproperty.lu/admin/estimations/${args.leadId}`,
    );
  }
  return lines.join("\n");
}

async function sendOne(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[email/estimation] Resend non configuré — email stub:",
      args.subject,
      "→",
      args.to,
    );
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: args.subject,
        text: args.text,
      }),
    });
    if (!res.ok) {
      console.error("[email/estimation] Resend HTTP", res.status, args.subject);
    }
  } catch (e) {
    console.error("[email/estimation] Resend error", (e as Error).message);
  }
}

/**
 * Envoie en parallele :
 *   - 1 email au client (si email + nom + range.mid > 0)
 *   - 1 email interne a Julien (toujours, des qu'on a un range)
 *
 * Best-effort : ne throw jamais. Logs uniquement.
 */
export async function sendEstimationEmails(
  args: SendEstimationEmailsArgs,
): Promise<void> {
  const locale = pickLocale(args.locale);
  const commune = args.commune ?? "Luxembourg";
  const name = args.contactName ?? (locale === "en" ? "there" : locale === "de" ? "geehrte/r Interessent/in" : "Madame, Monsieur");

  const internalTo = process.env.ESTIMATION_INTERNAL_TO ?? INTERNAL_TO_DEFAULT;

  const tasks: Promise<void>[] = [];

  if (args.contactEmail && args.range.mid > 0) {
    tasks.push(
      sendOne({
        to: args.contactEmail,
        subject: clientSubject(locale, commune),
        text: clientBody({ locale, name, commune, range: args.range }),
      }),
    );
  }

  tasks.push(
    sendOne({
      to: internalTo,
      subject: internalSubject({ commune, type: args.type }),
      text: internalBody(args),
    }),
  );

  await Promise.allSettled(tasks);
}

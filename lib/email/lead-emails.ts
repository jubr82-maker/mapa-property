// MAPA Property — Emails Sprint C3 (lead /api/lead).
//
// Helper unique pour envoyer 2 emails apres un POST /api/lead reussi :
//   1. CLIENT : confirmation reception + promesse rappel sous 48h
//      ouvrees + signature MAPA Property. Envoye si email present.
//   2. INTERNE : notification a j.brebion@mapagroup.org (var
//      LEAD_INTERNAL_TO surcharge possible) avec tous les champs +
//      lien admin /admin/leads.
//
// Pattern identique a lib/email/estimation-emails.ts :
//   - Si RESEND_API_KEY absent → log warn + no-op (jamais de throw).
//   - From : "MAPA Property <noreply@mapaproperty.lu>"
//   - Templates textuels FR/EN/DE inline.
//   - Promise.allSettled : 2 envois en parallele, erreurs swallowed.

type Locale = "fr" | "en" | "de";

interface SendLeadEmailsArgs {
  contactEmail?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  subject?: string;
  message?: string;
  type?: string;
  source?: string;
  propertyRef?: string;
  locale?: string;
}

const INTERNAL_TO_DEFAULT = "j.brebion@mapagroup.org";
const FROM = "MAPA Property <noreply@mapaproperty.lu>";

function pickLocale(input: string | undefined): Locale {
  if (input === "en" || input === "de") return input;
  return "fr";
}

// Mapping subject → libelle humain pour les 6 sujets pre-cadres du
// formulaire /contact (sprint B3). Fallback : la valeur brute si subject
// hors enumeration (formulaires NDA/mandat/etc.).
const SUBJECT_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    mandat_vente: "Mandat de vente",
    mandat_recherche: "Mandat de recherche",
    estimation: "Estimation",
    mise_en_location: "Mettre en location",
    informations: "Demande d'informations",
    offmarket_arcova: "Off-Market — ARCOVA",
  },
  en: {
    mandat_vente: "Sale mandate",
    mandat_recherche: "Search mandate",
    estimation: "Valuation",
    mise_en_location: "Put up for rent",
    informations: "Information request",
    offmarket_arcova: "Off-Market — ARCOVA",
  },
  de: {
    mandat_vente: "Verkaufsmandat",
    mandat_recherche: "Suchmandat",
    estimation: "Schätzung",
    mise_en_location: "Zur Vermietung anbieten",
    informations: "Informationsanfrage",
    offmarket_arcova: "Off-Market — ARCOVA",
  },
};

function subjectLabel(subject: string | undefined, locale: Locale): string {
  if (!subject) return locale === "en" ? "Contact" : locale === "de" ? "Kontakt" : "Contact";
  return SUBJECT_LABELS[locale][subject] ?? subject;
}

function clientSubject(locale: Locale): string {
  switch (locale) {
    case "en":
      return "Request received — MAPA Property";
    case "de":
      return "Anfrage erhalten — MAPA Property";
    default:
      return "Demande reçue — MAPA Property";
  }
}

function clientBody(args: {
  locale: Locale;
  firstName: string;
  subjectStr: string;
}): string {
  const { firstName, subjectStr } = args;
  switch (args.locale) {
    case "en":
      return [
        `Hello ${firstName},`,
        ``,
        `We have received your request regarding "${subjectStr}".`,
        ``,
        `The MAPA Property team will get back to you personally within`,
        `48 business hours.`,
        ``,
        `For any urgent matter, you can also reach us via`,
        `https://mapaproperty.lu/contact.`,
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
        `Guten Tag ${firstName},`,
        ``,
        `wir haben Ihre Anfrage zu „${subjectStr}" erhalten.`,
        ``,
        `Das MAPA Property Team wird Sie persönlich innerhalb von`,
        `48 Werkstunden kontaktieren.`,
        ``,
        `Bei dringenden Anliegen erreichen Sie uns auch über`,
        `https://mapaproperty.lu/contact.`,
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
        `Bonjour ${firstName},`,
        ``,
        `Nous avons bien reçu votre demande concernant « ${subjectStr} ».`,
        ``,
        `L'équipe MAPA Property vous recontactera personnellement sous`,
        `48 heures ouvrées.`,
        ``,
        `Pour toute urgence, vous pouvez également nous joindre via`,
        `https://mapaproperty.lu/contact.`,
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

function internalSubject(args: { subjectStr: string; name: string }): string {
  return `🔔 Nouveau lead contact — ${args.subjectStr} — ${args.name}`;
}

function internalBody(args: SendLeadEmailsArgs & { locale: Locale; subjectStr: string }): string {
  const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ") || "—";
  const lines: string[] = [
    `Nouveau lead recu via /api/lead (formulaire ${args.source ?? "website"}).`,
    ``,
    `═ PROSPECT ═`,
    `Nom         : ${fullName}`,
    `Email       : ${args.contactEmail ?? "—"}`,
    `Téléphone   : ${args.phone ?? "—"}`,
    `Locale      : ${args.locale}`,
    ``,
    `═ DEMANDE ═`,
    `Objet       : ${args.subjectStr}`,
    `Type form   : ${args.type ?? "—"}`,
    `Source      : ${args.source ?? "—"}`,
  ];
  if (args.propertyRef) {
    lines.push(`Bien réf.   : ${args.propertyRef}`);
  }
  if (args.message) {
    lines.push(``, `═ MESSAGE ═`, args.message);
  }
  lines.push(``, `═ ADMIN ═`, `Liste leads : https://mapaproperty.lu/admin/leads`);
  return lines.join("\n");
}

async function sendOne(args: { to: string; subject: string; text: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[email/lead] Resend non configuré — email stub:",
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
      console.error("[email/lead] Resend HTTP", res.status, args.subject);
    }
  } catch (e) {
    console.error("[email/lead] Resend error", (e as Error).message);
  }
}

/**
 * Envoie en parallele :
 *   - 1 email au client (si email present) avec confirmation 48h ouvrees
 *   - 1 email interne a Julien (toujours)
 *
 * Best-effort : ne throw jamais. Logs uniquement.
 */
export async function sendLeadEmails(args: SendLeadEmailsArgs): Promise<void> {
  const locale = pickLocale(args.locale);
  const subjectStr = subjectLabel(args.subject, locale);
  const firstName =
    args.firstName ??
    (locale === "en" ? "there" : locale === "de" ? "geehrte/r Interessent/in" : "Madame, Monsieur");
  const internalTo = process.env.LEAD_INTERNAL_TO ?? INTERNAL_TO_DEFAULT;
  const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ") || "Prospect";

  const tasks: Promise<void>[] = [];

  if (args.contactEmail) {
    tasks.push(
      sendOne({
        to: args.contactEmail,
        subject: clientSubject(locale),
        text: clientBody({ locale, firstName, subjectStr }),
      }),
    );
  }

  tasks.push(
    sendOne({
      to: internalTo,
      subject: internalSubject({ subjectStr, name: fullName }),
      text: internalBody({ ...args, locale, subjectStr }),
    }),
  );

  await Promise.allSettled(tasks);
}

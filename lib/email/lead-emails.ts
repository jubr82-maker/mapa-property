// MAPA Property — emails partages pour tous les flux "formulaire simple"
// (nom, email, telephone, message) : lead generique, contact, demande de
// bien, NDA off-market, demande off-market, inscription liste d'attente,
// inscription ARCOVA, lead chatbot.
//
// Deux emails envoyes en parallele via lib/email/smtp.ts (IONOS) :
//   1. CLIENT : accusé de réception sobre, dans la langue du visiteur,
//      sans promesse de délai autre que celle déjà affichée sur le site.
//      Envoyé si un email est présent.
//   2. INTERNE : notification complète à j.brebion@mapagroup.org (ou une
//      liste de destinataires fournie), avec tous les champs transmis.
//
// Best effort : ne throw jamais. Aucune donnée personnelle dans les
// journaux (compteurs et codes de statut uniquement, cf. lib/email/smtp.ts).

import { sendMail, SMTP_INTERNAL_TO } from "./smtp";

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
  /** Override des destinataires internes (liste d'attente : Julien + admin). */
  internalTo?: string | string[];
}

function pickLocale(input: string | undefined): Locale {
  if (input === "en" || input === "de") return input;
  return "fr";
}

// Libellé humain pour les sujets pré-cadrés du formulaire /contact.
// Fallback : la valeur brute si le sujet est hors énumération (NDA,
// mandat, off-market, ARCOVA, liste d'attente, etc.).
const SUBJECT_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    mandat_vente: "Mandat de vente",
    mandat_recherche: "Mandat de recherche",
    estimation: "Estimation",
    mise_en_location: "Mettre en location",
    informations: "Demande d'informations",
    offmarket_arcova: "Off-Market, ARCOVA",
  },
  en: {
    mandat_vente: "Sale mandate",
    mandat_recherche: "Search mandate",
    estimation: "Valuation",
    mise_en_location: "Put up for rent",
    informations: "Information request",
    offmarket_arcova: "Off-Market, ARCOVA",
  },
  de: {
    mandat_vente: "Verkaufsmandat",
    mandat_recherche: "Suchmandat",
    estimation: "Schätzung",
    mise_en_location: "Zur Vermietung anbieten",
    informations: "Informationsanfrage",
    offmarket_arcova: "Off-Market, ARCOVA",
  },
};

function subjectLabel(subject: string | undefined, locale: Locale): string {
  if (!subject) return locale === "de" ? "Kontakt" : "Contact";
  return SUBJECT_LABELS[locale][subject] ?? subject;
}

// Pied de page commun : jamais de RCS, de TVA, ni d'adresse complète.
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

function clientSubject(locale: Locale): string {
  switch (locale) {
    case "en":
      return "Request received, MAPA Property";
    case "de":
      return "Anfrage erhalten, MAPA Property";
    default:
      return "Demande reçue, MAPA Property";
  }
}

function clientBody(args: {
  locale: Locale;
  firstName: string;
  subjectStr: string;
}): string {
  const { firstName, subjectStr, locale } = args;
  switch (locale) {
    case "en":
      return [
        `Hello ${firstName},`,
        ``,
        `We have received your request regarding "${subjectStr}".`,
        ``,
        `The MAPA Property team will get back to you personally, within the`,
        `timeframe indicated on our site for this type of request.`,
        ``,
        `For any urgent matter, you can also reach us via`,
        `https://mapaproperty.lu/contact.`,
        ``,
        `Best regards,`,
        `MAPA Property team`,
        ``,
        footer(locale),
      ].join("\n");
    case "de":
      return [
        `Guten Tag ${firstName},`,
        ``,
        `wir haben Ihre Anfrage zu „${subjectStr}" erhalten.`,
        ``,
        `Das MAPA Property Team wird sich persönlich bei Ihnen melden,`,
        `innerhalb der auf unserer Website für diese Anfrageart angegebenen Frist.`,
        ``,
        `Bei dringenden Anliegen erreichen Sie uns auch über`,
        `https://mapaproperty.lu/contact.`,
        ``,
        `Mit freundlichen Grüßen,`,
        `MAPA Property Team`,
        ``,
        footer(locale),
      ].join("\n");
    default:
      return [
        `Bonjour ${firstName},`,
        ``,
        `Nous avons bien reçu votre demande concernant « ${subjectStr} ».`,
        ``,
        `L'équipe MAPA Property vous recontactera personnellement, dans le`,
        `délai indiqué sur notre site pour ce type de demande.`,
        ``,
        `Pour toute urgence, vous pouvez également nous joindre via`,
        `https://mapaproperty.lu/contact.`,
        ``,
        `Bien cordialement,`,
        `L'équipe MAPA Property`,
        ``,
        footer(locale),
      ].join("\n");
  }
}

function internalSubject(args: { subjectStr: string; name: string }): string {
  return `Nouveau lead, ${args.subjectStr}, ${args.name}`;
}

function internalBody(
  args: SendLeadEmailsArgs & { locale: Locale; subjectStr: string },
): string {
  const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ") || "—";
  const lines: string[] = [
    `Nouveau lead reçu via le site (formulaire ${args.source ?? "website"}).`,
    ``,
    `= PROSPECT =`,
    `Nom         : ${fullName}`,
    `Email       : ${args.contactEmail ?? "—"}`,
    `Téléphone   : ${args.phone ?? "—"}`,
    `Locale      : ${args.locale}`,
    ``,
    `= DEMANDE =`,
    `Objet       : ${args.subjectStr}`,
    `Type form   : ${args.type ?? "—"}`,
    `Source      : ${args.source ?? "—"}`,
  ];
  if (args.propertyRef) {
    lines.push(`Bien réf.   : ${args.propertyRef}`);
  }
  if (args.message) {
    lines.push(``, `= MESSAGE =`, args.message);
  }
  lines.push(``, `= ADMIN =`, `Liste leads : https://mapaproperty.lu/admin/leads`);
  return lines.join("\n");
}

/**
 * Envoie en parallèle :
 *   - 1 email au client (si email présent), accusé de réception sobre.
 *   - 1 email interne (toujours), notification complète.
 *
 * Best effort : ne throw jamais. Ne bloque jamais la réponse au visiteur.
 */
export async function sendLeadEmails(args: SendLeadEmailsArgs): Promise<void> {
  const locale = pickLocale(args.locale);
  const subjectStr = subjectLabel(args.subject, locale);
  const firstName =
    args.firstName ??
    (locale === "en"
      ? "there"
      : locale === "de"
        ? "geehrte/r Interessent/in"
        : "Madame, Monsieur");
  const internalTo: string | string[] = args.internalTo ?? SMTP_INTERNAL_TO;
  const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ") || "Prospect";

  console.log("[lead-emails] start", {
    hasClientEmail: Boolean(args.contactEmail),
    internalRecipients: Array.isArray(internalTo) ? internalTo.length : 1,
  });

  const tasks: Array<Promise<{ ok: boolean; error?: string }>> = [];
  const labels: string[] = [];

  if (args.contactEmail) {
    labels.push("client_email_result");
    tasks.push(
      sendMail({
        to: args.contactEmail,
        subject: clientSubject(locale),
        text: clientBody({ locale, firstName, subjectStr }),
      }),
    );
  }

  labels.push("internal_email_result");
  tasks.push(
    sendMail({
      to: internalTo,
      subject: internalSubject({ subjectStr, name: fullName }),
      text: internalBody({ ...args, locale, subjectStr }),
    }),
  );

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[lead-emails] ${labels[i]}`, {
        ok: r.value.ok,
        error: r.value.error,
      });
    } else {
      console.error(`[lead-emails] ${labels[i]} rejected`);
    }
  });
}

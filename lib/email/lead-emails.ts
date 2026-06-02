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
  /** Sprint waitlist : override des destinataires internes. Si array, Resend
   *  envoie UN email avec plusieurs To. Si undefined, fallback env vars +
   *  INTERNAL_TO_DEFAULT (retro-compat /api/lead, /api/nda-request). */
  internalTo?: string | string[];
}

const INTERNAL_TO_DEFAULT = "j.brebion@mapagroup.org";
// Sprint C5 : compat env vars Vercel. RESEND_FROM_EMAIL peut etre defini
// avec un sender deja verifie (ex: 'onboarding@resend.dev' tant que le
// domaine mapaproperty.lu n'est pas verifie en DNS Resend). Fallback :
// 'onboarding@resend.dev' qui est toujours accepte par Resend sans
// verification de domaine.
function resolveFrom(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (raw) {
    // Si la var contient deja un nom + email (ex: 'MAPA <x@y>'), on garde.
    // Sinon on l'enveloppe avec le nom de la marque.
    return raw.includes("<") ? raw : `MAPA Property <${raw}>`;
  }
  return "MAPA Property <onboarding@resend.dev>";
}

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

async function sendOne(args: {
  to: string | string[];
  subject: string;
  text: string;
  from: string;
}): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const toList = Array.isArray(args.to) ? args.to : [args.to];
  const toLog = toList.join(", ");
  if (!key) {
    console.warn(
      "[lead-emails] RESEND_API_KEY absent — email stub:",
      args.subject,
      "→",
      toLog,
    );
    return { ok: false, error: "no_api_key" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: toList,
        subject: args.subject,
        text: args.text,
      }),
    });
    const bodyText = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(
        "[lead-emails] Resend HTTP",
        res.status,
        "→",
        toLog,
        "|",
        bodyText.slice(0, 300),
      );
      return { ok: false, status: res.status, body: bodyText.slice(0, 300) };
    }
    return { ok: true, status: res.status, body: bodyText.slice(0, 200) };
  } catch (e) {
    const err = (e as Error).message;
    console.error("[lead-emails] Resend exception", err, "→", toLog);
    return { ok: false, error: err };
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
  // Sprint C5 : fallback cascade pour compat avec env vars existantes
  // (MAPA_NOTIFICATION_EMAIL deploye depuis le 15 mai).
  // Sprint waitlist : args.internalTo (string | string[]) prime sur env vars.
  const internalTo: string | string[] =
    args.internalTo ??
    (process.env.LEAD_INTERNAL_TO?.trim() ||
      process.env.MAPA_NOTIFICATION_EMAIL?.trim() ||
      INTERNAL_TO_DEFAULT);
  const from = resolveFrom();
  const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ") || "Prospect";

  console.log("[lead-emails] start", {
    to: internalTo,
    from,
    hasApiKey: !!process.env.RESEND_API_KEY,
    clientEmail: args.contactEmail ?? "(none)",
    subject: subjectStr,
  });

  const tasks: Array<Promise<{ ok: boolean; status?: number; body?: string; error?: string }>> = [];
  const labels: string[] = [];

  if (args.contactEmail) {
    labels.push("client_email_result");
    tasks.push(
      sendOne({
        to: args.contactEmail,
        from,
        subject: clientSubject(locale),
        text: clientBody({ locale, firstName, subjectStr }),
      }),
    );
  }

  labels.push("internal_email_result");
  tasks.push(
    sendOne({
      to: internalTo,
      from,
      subject: internalSubject({ subjectStr, name: fullName }),
      text: internalBody({ ...args, locale, subjectStr }),
    }),
  );

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[lead-emails] ${labels[i]}`, r.value);
    } else {
      console.error(`[lead-emails] ${labels[i]} rejected`, r.reason);
    }
  });
}

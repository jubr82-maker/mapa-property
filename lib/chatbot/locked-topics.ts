// lib/chatbot/locked-topics.ts : mission "chiffres verrouilles et
// corrections factuelles du chatbot" (point 5).
//
// Pour les sujets a fort risque reputationnel (chiffres facilement
// reformules ou fusionnes de travers par un modele de petite taille),
// l'intention est detectee ICI, par du code, et la reponse est une phrase
// FIGEE construite depuis les sources uniques du site, jamais transmise
// au modele pour reformulation. Le modele garde la main sur toute la
// conversation qui ne declenche aucun de ces motifs.
//
// Sujets verrouilles (6, cf. rapport de mission) :
//   1. Frais d'acquisition (droits d'enregistrement, transcription, notaire)
//   2. Bëllegen Akt
//   3. TVA
//   4. Taux des mandats (commissions MAPA Property)
//   5. Avance sur frais de recherche
//   6. Durée des mandats de vente
//
// Cas d'un message qui melange un sujet verrouille et autre chose : le
// verrou est prioritaire et repond ENTIEREMENT avec la ou les phrases
// figees des sujets detectes (court-circuit total de l'appel au modele
// pour ce tour). Consequence assumee : si le meme message contient aussi
// une question sans rapport, elle n'est pas traitee ce tour-ci : l'action
// prudente a semble preferable a un mecanisme hybride qui laisserait la
// main au modele sur une partie du message contenant deja un chiffre
// sensible. A reevaluer si ce compromis s'avere genant en usage reel.

import { honoraires } from "@/lib/legal/honoraires";
import { LEGAL_FEES } from "@/lib/legal-fees";
import { cgv } from "@/lib/legal/cgv";
import messagesFr from "@/messages/fr.json";
import messagesEn from "@/messages/en.json";
import messagesDe from "@/messages/de.json";

type Locale = "fr" | "en" | "de";

function normalizeLocale(locale: string): Locale {
  return locale === "en" || locale === "de" ? locale : "fr";
}

const MESSAGES: Record<Locale, typeof messagesFr> = {
  fr: messagesFr,
  en: messagesEn as typeof messagesFr,
  de: messagesDe as typeof messagesFr,
};

/** Premier pourcentage trouve dans une chaine ("... 17 % ...") -> 17. */
function firstPercent(text: string): number | null {
  const m = text.match(/(\d+)\s*%/);
  return m ? Number(m[1]) : null;
}

/** Premier entier suivi de "mois"/"months"/"Monaten" dans une chaine. */
function firstMonthsNumber(text: string): number | null {
  const m = text.match(/(\d+)\s*(mois|months?|Monaten)/i);
  return m ? Number(m[1]) : null;
}

/** Paragraphe d'une section CGV reperee par son numero ("10. ..."),
 * quelle que soit la langue de l'intitule. Lit lib/legal/cgv.ts (source
 * unique du document contractuel), jamais recopie. */
function cgvParagraph(
  locale: Locale,
  sectionNumberPrefix: string,
  paragraphIndex: number,
): string | null {
  const content = cgv[locale];
  const section = content.sections.find((s) =>
    (s.heading ?? "").startsWith(sectionNumberPrefix),
  );
  return section?.paragraphs?.[paragraphIndex] ?? null;
}

// ---------------------------------------------------------------------------
// 1. Frais d'acquisition : formulation retenue par Julien, jamais de
// total fusionnant taxes et honoraires de notaire. Chiffres lus depuis
// lib/legal-fees.ts (LU), jamais recopies.
// ---------------------------------------------------------------------------
function buildAcquisitionFeesReply(locale: Locale): string {
  const lu = LEGAL_FEES.LU;
  const reg = Math.round((lu.registration_duty_pct ?? 0) * 100);
  const transcription = Math.round((lu.transcription_duty_pct ?? 0) * 100);
  const tax = reg + transcription;
  const notary = Math.round(lu.notary_fees_pct * 100);
  const bellegen = lu.aids.find((a) => a.name === "Bëllegen Akt");
  const amount = bellegen?.amount_per_person ?? 0;
  const conditions =
    bellegen?.conditions_i18n?.[locale] ?? bellegen?.conditions ?? "";

  if (locale === "en") {
    return `In Luxembourg, registration duty is ${reg}% and transcription duty is ${transcription}%, for ${tax}% in taxes, to which notary fees are added separately, approximately ${notary}%. The Bëllegen Akt is a tax credit of up to €${amount.toLocaleString("en-US")} per buyer, for a ${conditions}.`;
  }
  if (locale === "de") {
    return `In Luxemburg betragen die Eintragungsgebühr ${reg} % und die Übertragungsgebühr ${transcription} %, zusammen ${tax} % Steuern, wozu getrennt die Notarkosten hinzukommen, etwa ${notary} %. Der Bëllegen Akt ist eine Steuergutschrift von bis zu ${amount.toLocaleString("de-DE")} € pro Erwerber, für einen ${conditions}.`;
  }
  return `Au Luxembourg, les droits d'enregistrement sont de ${reg} % et le droit de transcription de ${transcription} %, soit ${tax} % de taxes, auxquels s'ajoutent les honoraires de notaire, environ ${notary} %. Le Bëllegen Akt est un crédit d'impôt jusqu'à ${amount.toLocaleString("fr-FR")} € par acquéreur, pour une ${conditions}.`;
}

// ---------------------------------------------------------------------------
// 2. Bëllegen Akt seul (question ciblee, sans le reste des frais).
// ---------------------------------------------------------------------------
function buildBellegenAktReply(locale: Locale): string {
  const bellegen = LEGAL_FEES.LU.aids.find((a) => a.name === "Bëllegen Akt");
  const amount = bellegen?.amount_per_person ?? 0;
  const conditions =
    bellegen?.conditions_i18n?.[locale] ?? bellegen?.conditions ?? "";
  if (locale === "en") {
    return `The Bëllegen Akt is a tax credit of up to €${amount.toLocaleString("en-US")} per buyer, for a ${conditions}.`;
  }
  if (locale === "de") {
    return `Der Bëllegen Akt ist eine Steuergutschrift von bis zu ${amount.toLocaleString("de-DE")} € pro Erwerber, für einen ${conditions}.`;
  }
  return `Le Bëllegen Akt est un crédit d'impôt jusqu'à ${amount.toLocaleString("fr-FR")} € par acquéreur, pour une ${conditions}.`;
}

// ---------------------------------------------------------------------------
// 3. TVA : taux lu depuis l'intro de lib/legal/honoraires.ts (seul
// pourcentage present dans ce paragraphe, verifie dans les 3 langues).
// ---------------------------------------------------------------------------
function buildVatReply(locale: Locale): string {
  const intro = (honoraires[locale].intro ?? []).join(" ");
  const rate = firstPercent(intro) ?? 17;
  if (locale === "en") return `Luxembourg VAT is ${rate}%.`;
  if (locale === "de") return `Die luxemburgische MwSt. beträgt ${rate} %.`;
  return `La TVA luxembourgeoise est de ${rate} %.`;
}

// ---------------------------------------------------------------------------
// 4. Taux des mandats : lu depuis les sections "Mandats de vente" et
// "Mandats de Recherche" de lib/legal/honoraires.ts (meme source que la
// page /legal/honoraires), jamais recopie.
// ---------------------------------------------------------------------------
function buildMandateRatesReply(locale: Locale): string {
  const sections = honoraires[locale].sections;
  const sale = sections.find((s) => (s.heading ?? "").toLowerCase().includes(
    locale === "en" ? "sale mandate" : locale === "de" ? "verkaufsmandat" : "mandats de vente",
  ));
  const search = sections.find((s) => (s.heading ?? "").toLowerCase().includes(
    locale === "en" ? "search mandate" : locale === "de" ? "suchmandat" : "mandats de recherche",
  ));
  const parts = [...(sale?.paragraphs ?? []), ...(search?.paragraphs ?? [])];
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// 5. Avance sur frais de recherche : lue depuis CGV §10, paragraphe 3
// (index 2), le document contractuel de reference.
// ---------------------------------------------------------------------------
function buildSearchAdvanceReply(locale: Locale): string {
  const paragraph = cgvParagraph(locale, "10.", 2);
  if (paragraph) return paragraph;
  // Repli si la structure des CGV change un jour : jamais de chiffre
  // invente, on redirige plutot que de deviner.
  if (locale === "en") return "Please see our General Terms of Sale for the exact search fee advance amounts, or contact us.";
  if (locale === "de") return "Die genauen Beträge des Vorschusses auf Suchkosten finden Sie in unseren AGB, oder kontaktieren Sie uns.";
  return "Le montant exact de l'avance sur frais de recherche figure dans nos CGV, ou contactez-nous.";
}

// ---------------------------------------------------------------------------
// 6. Duree des mandats de vente : lue depuis messages/*.json (meme cle
// utilisee par la fiche mandat exclusif publique), jamais recopiee.
// ---------------------------------------------------------------------------
function buildMandateDurationReply(locale: Locale): string {
  const text =
    (MESSAGES[locale] as { mandate_exclusive?: { exclusive_text?: string } })
      .mandate_exclusive?.exclusive_text ?? "";
  const months = firstMonthsNumber(text);
  if (months == null) {
    if (locale === "en") return "Please see the mandate page for the exact term, or contact us.";
    if (locale === "de") return "Die genaue Laufzeit finden Sie auf der Mandatsseite, oder kontaktieren Sie uns.";
    return "La durée exacte figure sur la page du mandat, ou contactez-nous.";
  }
  if (locale === "en") return `Our sale mandates run for a minimum term of ${months} months, renewable.`;
  if (locale === "de") return `Unsere Verkaufsmandate haben eine Laufzeit ab ${months} Monaten, verlängerbar.`;
  return `Nos mandats de vente ont une durée à partir de ${months} mois, reconductibles.`;
}

interface LockedTopic {
  id: string;
  pattern: RegExp;
  build: (locale: Locale) => string;
}

// Un seul jeu de motifs, couvrant les 3 langues a la fois : un visiteur
// peut taper dans une langue differente de celle de l'interface.
const LOCKED_TOPICS: LockedTopic[] = [
  {
    id: "acquisition_fees",
    pattern: /notaire|enregistrement|transcription|frais d.acquisition|droits? d.acquisition|acquisition (cost|fee)|notary|registration (duty|fee)|\bnotar\b|eintragung|erwerbsnebenkosten|übertragungsgebühr/i,
    build: buildAcquisitionFeesReply,
  },
  {
    id: "bellegen_akt",
    pattern: /b[eë]llegen/i,
    build: buildBellegenAktReply,
  },
  {
    id: "vat",
    pattern: /\btva\b|\bvat\b|mwst/i,
    build: buildVatReply,
  },
  {
    id: "mandate_rates",
    pattern: /honoraires?\b|commission\b|tarifs?\b|combien.*(prenez|coûte|coute)|what.*(charge|fee|commission)|ihre (honorare|provision|tarife)|was kostet/i,
    build: buildMandateRatesReply,
  },
  {
    id: "search_advance",
    pattern: /avance sur frais|avance de recherche|search fee advance|advance fee|vorschuss (auf|für)/i,
    build: buildSearchAdvanceReply,
  },
  {
    id: "mandate_duration",
    pattern: /durée.*mandat|duree.*mandat|mandate duration|how long.*mandate|mandatsdauer|laufzeit.*mandat/i,
    build: buildMandateDurationReply,
  },
];

/**
 * Detecte si le dernier message de l'utilisateur touche un sujet
 * verrouille, et si oui retourne la ou les phrases figees correspondantes
 * (jointes si plusieurs sujets sont detectes dans le meme message). Ne
 * retourne null QUE si aucun sujet verrouille n'est detecte : dans ce cas
 * la conversation suit son cours normal (appel au modele).
 */
export function getLockedTopicsReply(
  userText: string,
  locale: string,
): string | null {
  const loc = normalizeLocale(locale);
  const matched = LOCKED_TOPICS.filter((t) => t.pattern.test(userText));
  if (matched.length === 0) return null;
  return matched.map((t) => t.build(loc)).join(" ");
}

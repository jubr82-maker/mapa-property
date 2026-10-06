// Coordonnees revelees au clic (ContactReveal), source unique (oct. 2026).
// Anti-collecte : les valeurs sont stockees en morceaux et assemblees dans
// le navigateur, apres le clic du visiteur ; aucune chaine complete
// ("+352 ...", "...@...") n'est ecrite dans ce fichier ni dans le HTML
// servi. Module pur, sans React : lu par le composant et par
// pnpm test:security (section M).
//
// Ordre affiche (decision de Julien, oct. 2026) :
//   1. telephone de Julien Brebion
//   2. e-mail de Julien Brebion
//   3. second telephone, sans nom ni libelle
//   4. e-mail du site, sous le second telephone, meme mise en forme que
//      l'e-mail de Julien
// L'adresse du compte administrateur n'apparait jamais sur le site public.

const PHONE_JULIEN_PARTS = ["+352", "691", "620", "127"];
const PHONE_SECONDARY_PARTS = ["+352", "691", "113", "018"];
const EMAIL_JULIEN_USER = ["j", "brebion"];
const EMAIL_SITE_USER = ["site"];
const EMAIL_DOMAIN = ["mapagroup", "org"];

export type RevealLine = {
  kind: "phone" | "email";
  /** Cle de libelle accessible (namespace next-intl "contact"). */
  ariaKey: "aria_call_julien" | "aria_email_julien" | "aria_call_secondary" | "aria_email_secondary";
  /** Evenement de suivi (lib/tracking). */
  trackTarget: string;
  display: string;
  href: string;
};

const phoneDisplay = (parts: string[]) => parts.join(" ");
const phoneTel = (parts: string[]) => parts.join("");
// "@" produit par fromCharCode(64) : aucune adresse complete dans la source.
const email = (user: string[]) => `${user.join(".")}${String.fromCharCode(64)}${EMAIL_DOMAIN.join(".")}`;

/** Lignes revelees, dans l'ordre d'affichage. A appeler apres le clic. */
export function revealLines(): RevealLine[] {
  return [
    { kind: "phone", ariaKey: "aria_call_julien", trackTarget: "call_julien", display: phoneDisplay(PHONE_JULIEN_PARTS), href: `tel:${phoneTel(PHONE_JULIEN_PARTS)}` },
    { kind: "email", ariaKey: "aria_email_julien", trackTarget: "email", display: email(EMAIL_JULIEN_USER), href: `mailto:${email(EMAIL_JULIEN_USER)}` },
    { kind: "phone", ariaKey: "aria_call_secondary", trackTarget: "call_secondary", display: phoneDisplay(PHONE_SECONDARY_PARTS), href: `tel:${phoneTel(PHONE_SECONDARY_PARTS)}` },
    { kind: "email", ariaKey: "aria_email_secondary", trackTarget: "email_secondary", display: email(EMAIL_SITE_USER), href: `mailto:${email(EMAIL_SITE_USER)}` },
  ];
}

/** Coordonnees de Julien seul (carte conseiller de la version imprimee). */
export function advisorContactLines(): { phone: string; email: string } {
  return { phone: phoneDisplay(PHONE_JULIEN_PARTS), email: email(EMAIL_JULIEN_USER) };
}

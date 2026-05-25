// Sprint C9 — Validation stricte contact (nom + email + telephone).
//
// 3 validateurs purs reutilisables cote client (EstimateForm Step 3,
// ContactForm, NDAForm) et cote serveur (app/api/estimate/route.ts +
// app/api/lead/route.ts). Retour uniforme : { valid: boolean; error?: code }
// ou` `error` est une cle i18n cote UI (estimate_form.validation.<error>).
//
// Telephone : validation officielle via libphonenumber-js (parseur E.164
// + regles nationales). Couvre les 65 pays du dropdown (UE 27 + Europe
// hors UE + International HNW). Si le numero est saisi avec son indicatif
// (chaine combinee "+352 691 620 127"), le pays sert de fallback.
//
// Email : regex format + whitelist domaines reconnus (gmail, outlook,
// FAI europeens, providers internationaux) OU domaine custom avec label
// >= 3 chars (filtre "j.lu" mais accepte "mapaproperty.lu" / "mapagroup.org").

import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js";

// ------------------------------------------------------------------------
// Domaines email trustes — providers grand public + FAI Europe + Asie.
// Sources : penetration marche + retour terrain Julien (LU/FR/BE/DE).
// Ordre indicatif (international -> regional). 100+ entrees.
// ------------------------------------------------------------------------
const TRUSTED_EMAIL_DOMAINS = new Set<string>([
  // Internationaux majeurs
  "gmail.com", "googlemail.com",
  "hotmail.com", "outlook.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me", "tutanota.com", "tuta.io",
  "aol.com", "mail.com", "zoho.com", "gmx.com", "fastmail.com",
  // Luxembourg
  "pt.lu", "internet.lu", "vo.lu", "tango.lu",
  "hotmail.lu", "outlook.lu", "yahoo.lu",
  // France
  "hotmail.fr", "outlook.fr", "yahoo.fr", "live.fr", "msn.fr",
  "free.fr", "sfr.fr", "wanadoo.fr", "orange.fr",
  "laposte.net", "numericable.fr", "neuf.fr", "aliceadsl.fr",
  "bbox.fr", "club-internet.fr", "noos.fr",
  // Belgique
  "hotmail.be", "outlook.be", "live.be", "yahoo.be",
  "skynet.be", "telenet.be", "proximus.be", "scarlet.be",
  "belgacom.net", "voo.be",
  // Allemagne / Autriche / Suisse
  "hotmail.de", "outlook.de", "yahoo.de", "live.de",
  "t-online.de", "web.de", "gmx.de", "gmx.net", "gmx.at", "gmx.ch",
  "freenet.de", "arcor.de", "1und1.de", "aon.at", "a1.net",
  "bluewin.ch", "hispeed.ch", "sunrise.ch", "green.ch",
  // Italie
  "libero.it", "virgilio.it", "tin.it", "tiscali.it", "alice.it",
  "hotmail.it", "outlook.it", "yahoo.it", "live.it",
  "fastwebnet.it", "email.it",
  // Espagne
  "hotmail.es", "outlook.es", "yahoo.es", "live.es",
  "terra.es", "telefonica.net", "movistar.es", "ya.com",
  // Portugal
  "sapo.pt", "meo.pt", "iol.pt", "clix.pt",
  "hotmail.pt", "outlook.pt", "yahoo.pt",
  // UK / Irlande
  "hotmail.co.uk", "outlook.co.uk", "yahoo.co.uk", "live.co.uk",
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net",
  "ntlworld.com", "tiscali.co.uk", "plus.net",
  "eircom.net", "iol.ie",
  // Pays-Bas
  "hotmail.nl", "outlook.nl", "yahoo.nl", "live.nl",
  "kpnmail.nl", "planet.nl", "ziggo.nl", "home.nl", "xs4all.nl",
  // Pays nordiques
  "hotmail.dk", "outlook.dk", "yahoo.dk",
  "hotmail.se", "outlook.se", "yahoo.se",
  "hotmail.no", "outlook.no", "yahoo.no", "online.no",
  "hotmail.fi", "outlook.fi", "yahoo.fi",
  // Europe centrale & Est
  "wp.pl", "onet.pl", "op.pl", "interia.pl", "gazeta.pl",
  "seznam.cz", "centrum.cz", "volny.cz",
  "freemail.hu", "citromail.hu", "index.hu",
  "mail.ru", "yandex.ru", "rambler.ru",
  "abv.bg", "mail.bg",
  // International cible
  "qq.com", "163.com", "126.com", "sina.com",
  "naver.com", "daum.net",
  "rediffmail.com",
  // Mexique
  "hotmail.com.mx", "outlook.com.mx", "yahoo.com.mx", "live.com.mx",
  "prodigy.net.mx", "telmex.com",
  // Bresil
  "hotmail.com.br", "outlook.com.br", "yahoo.com.br", "uol.com.br",
  "bol.com.br", "terra.com.br", "globo.com",
]);

// ------------------------------------------------------------------------
// TLDs reconnus — gTLDs majeurs + nouveaux gTLDs pro + ccTLDs des 65
// pays cibles (UE 27 + Europe hors UE + International HNW) + qq autres.
// Filtre les extensions inventees ("scam", "fake", etc.). Liste fermee
// pour une politique stricte ; ajouter ici si un client legitime
// utilise un TLD absent.
// ------------------------------------------------------------------------
const VALID_TLDS = new Set<string>([
  // gTLDs majeurs
  "com", "net", "org", "info", "biz", "name", "mobi", "pro", "tel",
  "edu", "gov", "mil", "int",
  // nouveaux gTLDs courants pro
  "io", "co", "me", "tv", "app", "dev", "cloud", "tech", "online",
  "site", "store", "shop", "agency", "studio", "group", "world",
  "consulting", "legal", "finance", "capital", "realestate", "realty",
  "properties", "estate", "partners", "ventures", "holdings",
  // ccTLDs UE 27
  "at", "be", "bg", "cy", "cz", "de", "dk", "ee", "es", "fi", "fr",
  "gr", "hr", "hu", "ie", "it", "lt", "lu", "lv", "mt", "nl", "pl",
  "pt", "ro", "se", "si", "sk",
  // ccTLDs Europe hors UE
  "al", "ad", "by", "ba", "ch", "fo", "gb", "gi", "is", "li", "mc",
  "md", "mk", "no", "rs", "sm", "tr", "ua", "va", "xk", "uk",
  // ccTLDs International cible
  "ae", "au", "br", "ca", "cn", "hk", "il", "jp", "lb", "ma", "mu",
  "mx", "qa", "sa", "sg", "us", "za",
  // ccTLDs autres
  "ru", "in", "kr", "th", "vn", "nz", "ar", "cl", "pe", "ve",
  "eu",
]);

// ------------------------------------------------------------------------
// Mapping indicatif E.164 -> ISO 3166-1 alpha-2 pour libphonenumber-js.
// Couvre les 65 pays du dropdown PhoneInput. Pour +1 (US/CA partage), on
// resoud par defaut a US ; libphonenumber-js detecte la regle nationale
// par le NDC, donc un numero CA reste valide meme parse comme US.
// ------------------------------------------------------------------------
const PREFIX_TO_ISO: Record<string, CountryCode> = {
  // UE 27
  "+43": "AT", "+32": "BE", "+359": "BG", "+357": "CY", "+385": "HR",
  "+45": "DK", "+372": "EE", "+358": "FI", "+33": "FR", "+49": "DE",
  "+30": "GR", "+36": "HU", "+353": "IE", "+39": "IT", "+371": "LV",
  "+370": "LT", "+352": "LU", "+356": "MT", "+31": "NL", "+48": "PL",
  "+351": "PT", "+420": "CZ", "+40": "RO", "+421": "SK", "+386": "SI",
  "+34": "ES", "+46": "SE",
  // Europe hors UE
  "+355": "AL", "+376": "AD", "+375": "BY", "+387": "BA", "+298": "FO",
  "+350": "GI", "+354": "IS", "+383": "XK", "+423": "LI", "+389": "MK",
  "+373": "MD", "+377": "MC", "+382": "ME", "+47": "NO", "+378": "SM",
  "+381": "RS", "+41": "CH", "+90": "TR", "+380": "UA", "+379": "VA",
  "+44": "GB",
  // International cible HNW
  "+1": "US", "+971": "AE", "+212": "MA", "+966": "SA", "+974": "QA",
  "+972": "IL", "+961": "LB", "+230": "MU", "+27": "ZA", "+65": "SG",
  "+852": "HK", "+86": "CN", "+81": "JP", "+61": "AU", "+55": "BR",
  "+52": "MX",
};

export type ValidationResult = { valid: boolean; error?: string };

// ------------------------------------------------------------------------
// Sprint C10 : separation prenom / nom en 2 champs distincts (EstimateForm
// Step 3 + ContactForm deja separe). Regex 1 mot : lettres (avec accents)
// + tirets/apostrophes, 2-40 chars. Tolere "Jean-Paul", "L'Heureux".
// ------------------------------------------------------------------------
const SINGLE_NAME_REGEX = /^[A-Za-zÀ-ÿ\-']{2,40}$/;

export function validateFirstName(name: string): ValidationResult {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2)
    return { valid: false, error: "first_name_too_short" };
  if (trimmed.length > 40)
    return { valid: false, error: "first_name_too_long" };
  if (!SINGLE_NAME_REGEX.test(trimmed))
    return { valid: false, error: "first_name_format" };
  return { valid: true };
}

export function validateLastName(name: string): ValidationResult {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2)
    return { valid: false, error: "last_name_too_short" };
  if (trimmed.length > 40)
    return { valid: false, error: "last_name_too_long" };
  if (!SINGLE_NAME_REGEX.test(trimmed))
    return { valid: false, error: "last_name_format" };
  return { valid: true };
}

// ------------------------------------------------------------------------
// validateName (deprecated) — conserve pour back-compat si du code legacy
// passe encore le "nom complet" en une seule chaine. Le nouveau code C10+
// doit utiliser validateFirstName + validateLastName.
// ------------------------------------------------------------------------
const NAME_REGEX = /^[A-Za-zÀ-ÿ\-']{2,}(\s+[A-Za-zÀ-ÿ\-']{2,})+$/;

/** @deprecated Use validateFirstName + validateLastName (Sprint C10). */
export function validateName(name: string): ValidationResult {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 4) return { valid: false, error: "name_too_short" };
  if (!NAME_REGEX.test(trimmed)) return { valid: false, error: "name_format" };
  return { valid: true };
}

// ------------------------------------------------------------------------
// Email : format RFC simplifie + local part >= 2 chars + domaine trust
// ou label custom >= 3 chars (label = tout avant le TLD final).
// ------------------------------------------------------------------------
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = (email ?? "").trim();
  if (!trimmed) return { valid: false, error: "email_required" };
  if (!EMAIL_REGEX.test(trimmed))
    return { valid: false, error: "email_format" };
  const [local, domain] = trimmed.toLowerCase().split("@");
  if (local.length < 2)
    return { valid: false, error: "email_local_too_short" };
  // Niveau 1 — whitelist domaines reconnus (FAI, providers grand public) :
  // accepte direct, pas de check supplementaire.
  if (TRUSTED_EMAIL_DOMAINS.has(domain)) return { valid: true };
  // Niveau 2 — TLD doit etre dans la liste blanche (filtre ".scam", ".fake").
  const tld = domain.split(".").pop() ?? "";
  if (!VALID_TLDS.has(tld))
    return { valid: false, error: "email_tld_invalid" };
  // Niveau 3 — longueur totale du domaine >= 5 chars (rejette "j.lu"=4,
  // accepte "bp.lu"=5, "mapaproperty.lu"=15, "mapagroup.org"=13).
  if (domain.length < 5)
    return { valid: false, error: "email_domain_too_short" };
  return { valid: true };
}

// ------------------------------------------------------------------------
// Telephone : delegation a libphonenumber-js, qui parse l'indicatif E.164
// + applique les regles nationales (longueur, prefixe NDC, mobile/fixe).
//
// Accepte 2 formes d'entree :
//  - countryHint = code ISO ("LU", "FR", ...) : valide le national.
//  - countryHint = indicatif ("+352", "+33") : resolu via PREFIX_TO_ISO.
//  - phone peut etre national OU combine ("+352 691 620 127") : libphonenumber
//    detecte automatiquement quand le "+" est present.
// ------------------------------------------------------------------------
export function validatePhone(
  phone: string,
  countryHint: string,
): ValidationResult {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return { valid: false, error: "phone_required" };
  if (!countryHint) return { valid: false, error: "phone_country_missing" };
  const iso: CountryCode = countryHint.startsWith("+")
    ? (PREFIX_TO_ISO[countryHint] ?? "LU")
    : (countryHint.toUpperCase() as CountryCode);
  try {
    if (!isValidPhoneNumber(trimmed, iso)) {
      return { valid: false, error: "phone_invalid_country" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "phone_format" };
  }
}

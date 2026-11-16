"use server";

// Import d'une annonce collee (nov. 2026). Julien colle le contenu de son
// annonce Apimo ou immotop (Cmd+A, Cmd+C, Cmd+V) : cette action
//   1. extrait le texte et les adresses d'images du SEUL contenu colle
//      (aucune page n'est jamais chargee par le site) ;
//   2. fait reconnaitre les champs par Mistral (lib/mistral.ts, JSON,
//      temperature 0), puis CONTROLE chaque valeur contre le texte colle
//      (lib/import-listing/fields.ts) : rien d'invente, le reste "a completer" ;
//   3. applique les seules corrections mecaniques des regles de redaction et
//      signale les formules interdites sans les remplacer ;
//   4. traduit titre et description en anglais et en allemand (traduction
//      existante de l'admin, lib/translate.ts) ;
//   5. enregistre le bien en BROUILLON (jamais publie).
// Les photos sont envoyees ensuite, une par une (importPastedPhoto,
// uploadPropertyPhoto), chacune dans un appel court : l'import reste loin de
// la limite de 300 secondes et les photos en echec peuvent etre reprises.
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { dbFailure, sessionFailure } from "@/lib/admin/action-result";
import { actionRateLimit } from "@/lib/admin/action-rate-limit";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { mistralJson } from "@/lib/mistral";
import { translateBatch } from "@/lib/translate";
import { listingWritingPrompt } from "@/lib/listing/writing-rules";
import { emptyListingData, sanitizeListingData, type ListingLang } from "@/lib/listing/listing-data";
import { htmlToText } from "@/lib/listing/template-engine";
import { LU_PLACES } from "@/lib/geo/lu-localities";
import { TRANSACTION_TYPES, transactionToBase } from "@/lib/taxonomy/property-types";
import { logAdminAction } from "@/lib/pilotage/audit";
import { generateUniquePropertySlug } from "@/lib/admin/property-slug";
import { extractPasted, type SkippedImage } from "@/lib/import-listing/extract";
import { extractionMessages, IMPORT_TYPES, validateExtraction, type ImportField } from "@/lib/import-listing/fields";
import { missingRequired } from "@/lib/import-listing/required";
import { COUNTRIES } from "@/lib/countries";
import { mechanicalFixes, plainToHtml, remainingIssues } from "@/lib/import-listing/writing-fix";
import { imageToken } from "@/lib/import-listing/token";

/** HTML colle accepte (deja allege par l'ecran). */
const MAX_HTML = 4 * 1024 * 1024;
const MAX_TEXT = 400 * 1024;

export type ImportIssue = { lang: ListingLang; field: "title" | "description"; code: string; excerpt: string };

export type ImportSummary = {
  id: string;
  filled: ImportField[];
  todo: ImportField[];
  rejected: { field: string; value: string }[];
  /** Formules a reformuler (interdites) et autres points de redaction. */
  words: ImportIssue[];
  issues: ImportIssue[];
  recognized: boolean;
  translated: boolean;
  /** Transaction non reconnue : "vente" enregistree par defaut, a verifier. */
  transactionDefaulted: boolean;
  /** Pays non reconnu et colonne obligatoire : "LU" enregistre, a verifier. */
  countryDefaulted: boolean;
  images: { url: string; token: string }[];
  skipped: SkippedImage[];
  /** Aucun secret serveur : les images collees ne peuvent pas etre telechargees. */
  imagesBlocked: boolean;
};

/** Colonnes obligatoires que l'import doit connaitre avant d'enregistrer. */
export type ImportChoiceField = "property_type" | "transaction" | "country";
export type ImportChoices = Partial<Record<ImportChoiceField, string>>;

export type ImportResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string; needs?: ImportChoiceField[] };

type InsertError = { code?: string; message?: string } | null;

export async function importListing(input: { html?: string; text?: string; textEdited?: boolean; choices?: ImportChoices }): Promise<ImportResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });

  const limit = actionRateLimit(`import-listing:${admin.user.id}`, 10, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: t("import_err_rate", { seconds: limit.retryInSeconds }) };

  const html = typeof input?.html === "string" ? input.html : "";
  const plain = typeof input?.text === "string" ? input.text : "";
  if (html.length > MAX_HTML || plain.length > MAX_TEXT) return { ok: false, error: t("import_err_too_long") };

  // 1. Texte et images du contenu colle.
  // Texte retouche par Julien apres le collage : son texte fait foi, les
  // images restent celles du HTML colle.
  const pasted = extractPasted({ html, text: plain, preferText: input?.textEdited === true });
  if (pasted.text.replace(/\s+/g, " ").trim().length < 40) return { ok: false, error: t("import_err_empty") };

  // 2. Reconnaissance puis controle contre le texte colle.
  const raw = await mistralJson(extractionMessages(pasted.text), 1500, { timeoutMs: 60000 });
  const checked = validateExtraction(raw, pasted.text, { luPlaces: LU_PLACES });
  // Colonnes obligatoires (type de bien, transaction, pays) : choisies dans
  // la zone d'import si l'annonce ne permet pas de les reconnaitre. Sans
  // elles, l'enregistrement n'est JAMAIS tente (nov. 2026).
  const c = input?.choices ?? {};
  const chosen: ImportField[] = [];
  const v = { ...checked.values };
  // Un choix ne remplace jamais une valeur reconnue dans l'annonce.
  if (!v.property_type && typeof c.property_type === "string" && IMPORT_TYPES.includes(c.property_type)) {
    v.property_type = c.property_type;
    chosen.push("property_type");
  }
  if (!transactionToBase(v.transaction) && typeof c.transaction === "string" && TRANSACTION_TYPES.some((x) => x.slug === c.transaction)) {
    v.transaction = c.transaction;
    chosen.push("transaction");
  }
  if (!v.country && typeof c.country === "string" && COUNTRIES.some((x) => x.code === c.country)) {
    v.country = c.country;
    chosen.push("country");
  }
  const needs = missingRequired(v);
  if (needs.length) return { ok: false, error: t("import_need_choices"), needs };
  const filled = [...new Set([...checked.filled, ...chosen])];
  const todo = checked.todo.filter((f) => !filled.includes(f));

  // 3. Corrections mecaniques seulement ; le reste est signale.
  const titleFr = v.title_fr ? mechanicalFixes(v.title_fr, "fr").replace(/\s+/g, " ").trim() : null;
  const descriptionFr = v.description_fr ? plainToHtml(mechanicalFixes(v.description_fr, "fr")) : null;

  // 4. Traduction existante de l'admin (memes regles de redaction).
  let en: Record<string, string> = {};
  let de: Record<string, string> = {};
  let translated = false;
  if (titleFr || descriptionFr) {
    try {
      const source = { title: titleFr ?? "", description: descriptionFr ?? "" };
      [en, de] = await Promise.all([translateBatch(source, "EN", listingWritingPrompt("en")), translateBatch(source, "DE", listingWritingPrompt("de"))]);
      translated = true;
    } catch (e) {
      console.error("[admin/import] traduction echouee", { message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    }
  }

  const texts: { lang: ListingLang; field: "title" | "description"; text: string }[] = [
    { lang: "fr", field: "title", text: titleFr ?? "" },
    { lang: "fr", field: "description", text: descriptionFr ? htmlToText(descriptionFr) : "" },
    { lang: "en", field: "title", text: en.title ?? "" },
    { lang: "en", field: "description", text: en.description ? htmlToText(en.description) : "" },
    { lang: "de", field: "title", text: de.title ?? "" },
    { lang: "de", field: "description", text: de.description ? htmlToText(de.description) : "" },
  ];
  const all: ImportIssue[] = texts.flatMap((x) => (x.text ? remainingIssues(x.text, x.lang, x.field === "title").map((i) => ({ lang: x.lang, field: x.field, code: i.code, excerpt: i.excerpt })) : []));
  const words = all.filter((i) => i.code === "forbidden" || i.code === "bare_verb");
  const issues = all.filter((i) => i.code !== "forbidden" && i.code !== "bare_verb");

  // 5. Brouillon.
  const title = titleFr || t("import_title_fallback");
  const transactionBase = transactionToBase(v.transaction);
  const listingData = sanitizeListingData({
    ...emptyListingData(),
    facts: {
      city_commune: v.city ? v.city_commune : null,
      monthly_charges: v.monthly_charges,
      cellar: v.amenities.cellar,
      elevator: v.amenities.elevator,
      home_automation: v.amenities.home_automation,
      landscaped_garden: v.amenities.landscaped_garden,
      garage_spaces: v.garage_spaces,
      available_now: v.available_now,
      available_from: v.available_from,
    },
    // Textes repris de l'annonce : le modele ne les remplace pas ; titre
    // non reconnu : le modele peut le proposer.
    auto: {
      title_fr: !titleFr,
      title_en: !en.title,
      title_de: !de.title,
      description_fr: !descriptionFr,
      description_en: !en.description,
      description_de: !de.description,
    },
  });
  const slug = await generateUniquePropertySlug(admin.supabase, title);
  const base: Record<string, unknown> = {
    slug,
    title_fr: title,
    title_en: en.title || null,
    title_de: de.title || null,
    description_fr: descriptionFr,
    description_en: en.description || null,
    description_de: de.description || null,
    transaction: transactionBase,
    transaction_detail: transactionBase ? v.transaction : null,
    property_type: v.property_type,
    // Pays reconnu ou choisi dans la zone d'import, jamais "LU" par defaut.
    country: v.country,
    city: v.city,
    price: v.price,
    price_on_demand: false,
    surface: v.surface,
    living_surface: v.living_surface,
    usable_surface: v.usable_surface,
    land_surface: v.land_surface,
    terrace_surface: v.terrace_surface,
    balcony_surface: v.balcony_surface,
    garden_surface: v.garden_surface,
    bedrooms: v.bedrooms,
    bathrooms: v.bathrooms,
    floor: v.floor,
    year: v.year,
    energy: v.energy,
    thermal: v.thermal,
    parking: v.parking,
    has_pool: v.amenities.has_pool,
    has_laundry: v.amenities.has_laundry,
    has_dressing: v.amenities.has_dressing,
    // Jamais publie automatiquement.
    status: "draft",
    is_published: false,
    created_by: admin.user.id,
    listing_data: listingData,
  };

  // Base sans la colonne listing_data (SQL 17 non execute) : nouvel essai
  // sans elle. Type, transaction et pays sont toujours connus ici : plus
  // aucune valeur par defaut n'est enregistree a la place de Julien.
  const transactionDefaulted = false;
  const countryDefaulted = false;
  let payload = { ...base };
  let row: { id: string; slug: string | null } | null = null;
  let lastError: InsertError = null;
  for (let attempt = 0; attempt < 2 && !row; attempt++) {
    const { data, error } = await admin.supabase.from("properties").insert(payload).select("id, slug").single();
    if (!error && data) {
      row = data as { id: string; slug: string | null };
      break;
    }
    lastError = error;
    const msg = `${error?.code ?? ""} ${error?.message ?? ""}`;
    if (/listing_data/.test(msg) && "listing_data" in payload) {
      const { listing_data: _drop, ...rest } = payload;
      void _drop;
      payload = rest;
    } else break;
  }
  if (!row) return { ok: false, error: (await dbFailure(lastError ?? { code: "PGRST116" }, "importListing")).message };

  await logAdminAction({ actorEmail: admin.user.email, action: "property_created", targetTable: "properties", targetId: row.id, diff: { slug: row.slug ?? null, imported: true } });
  revalidatePath("/admin/properties");

  const tokens = pasted.images.map((url) => ({ url, token: imageToken(row.id, url) }));
  return {
    ok: true,
    summary: {
      id: row.id,
      filled,
      todo,
      rejected: checked.rejected,
      words,
      issues,
      recognized: raw != null,
      translated,
      transactionDefaulted,
      countryDefaulted,
      images: tokens.filter((x): x is { url: string; token: string } => Boolean(x.token)),
      skipped: pasted.skipped,
      imagesBlocked: pasted.images.length > 0 && tokens.some((x) => !x.token),
    },
  };
}

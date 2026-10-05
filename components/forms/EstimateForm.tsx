"use client";

import { getAttribution } from "@/lib/pilotage/attribution-client";
import { useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { formatEuro } from "@/lib/finance";
import type { EstimateResult } from "@/lib/estimate";
import { track } from "@/lib/tracking/track";
import { DisclaimerLegal } from "@/components/ui/DisclaimerLegal";
import { Turnstile, type TurnstileHandle } from "@/components/ui/Turnstile";
import { PlaceCombobox, type ComboboxPlace } from "@/components/forms/PlaceCombobox";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Link } from "@/i18n/navigation";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import {
  validateFirstName,
  validateLastName,
  validateEmail,
  validatePhone,
} from "@/lib/validators/contact";

const PROPERTY_TYPES = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
] as const;
const STATES = ["to_renovate", "good", "renovated", "new"] as const;
const ENERGIES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

// Sprint C7 — Methode Observatoire LU.
// 6 niveaux d'etat (mapping doux cote engine : renovated → excellent).
const CONDITIONS_C7 = [
  "new",
  "excellent",
  "good",
  "fair",
  "to_renovate",
  "major_works",
] as const;
type ConditionC7 = (typeof CONDITIONS_C7)[number];

const FLOOR_TYPES_C7 = [
  "basement",
  "ground",
  "first",
  "middle",
  "high",
  "top",
  "penthouse",
] as const;
type FloorTypeC7 = (typeof FLOOR_TYPES_C7)[number];

const ATYPICAL_TYPES_C7 = [
  "standard",
  "studio",
  "duplex",
  "triplex",
  "loft",
] as const;
type AtypicalTypeC7 = (typeof ATYPICAL_TYPES_C7)[number];

// Apartment dans le sens C7 = tous types sauf maison/villa (legacy
// PropertyType). Garde le type 'terrain' a part — il continue d'utiliser
// l'ancien moteur (pas de coefs C7).
function isApartmentSegment(type: string): boolean {
  return type === "appartement" || type === "penthouse" || type === "duplex";
}
// Sprint B1 : niveau global des travaux realises (radio simple).
const WORKS_LEVELS = ["gros", "moyens", "petits", "aucun"] as const;

// Sprint C1 : exposition UI des 13 categories engine EVS (POL3-6).
// Reservoir aligne strict sur WorkCategory dans lib/estimation/engine.ts —
// evite tout mapping fragile et garantit que ce qui est coche est
// directement consomme par calcWorksValue() cote serveur.
// Groupement visuel par "lourdeur" pour aider la lecture utilisateur,
// mais TOUTES les checkboxes restent accessibles quel que soit le
// niveau choisi (un bien peut avoir cumule gros + moyens + petits).
const WORKS_CATEGORIES = [
  "toiture",
  "facade_isolation",
  "pac",
  "chauffage",
  "photovoltaique",
  "electricite",
  "menuiseries",
  "cuisine",
  "salle_de_bain",
  "peinture",
  "sols_revetements",
  "amenagement_exterieur",
  "piscine",
] as const;
type WorksCategory = (typeof WORKS_CATEGORIES)[number];

// Groupement UI par lourdeur (purement visuel — l'engine ne s'en sert pas).
const WORKS_GROUPS: ReadonlyArray<{
  level: "gros" | "moyens" | "petits";
  categories: ReadonlyArray<WorksCategory>;
}> = [
  {
    level: "gros",
    categories: ["toiture", "facade_isolation", "pac", "chauffage", "photovoltaique", "menuiseries"],
  },
  {
    level: "moyens",
    categories: ["cuisine", "salle_de_bain", "electricite", "sols_revetements", "amenagement_exterieur"],
  },
  {
    level: "petits",
    categories: ["peinture", "piscine"],
  },
];

const CURRENT_YEAR = new Date().getFullYear();

interface FormState {
  // Oct. 2026 : lieu saisi (commune, quartier VDL ou localite). `commune`
  // = commune de rattachement utilisee pour le calcul.
  locality: string;
  commune: string;
  quartier: string; // si commune = Luxembourg (25 quartiers VDL)
  type: string;
  state: (typeof STATES)[number];
  energy: string;
  livingSurface: string;
  landSurface: string;
  terraceSurface: string;
  // Sprint B1 : surface totale (habitable + caves + greniers + garages).
  surfaceTotal: string;
  // Sprint B1 : niveau global travaux ('' = non renseigne).
  worksLevel: "" | (typeof WORKS_LEVELS)[number];
  // Sprint C1 : detail des travaux (multi-select 13 categories engine
  // EVS) + annee globale + montant total. Affichage conditionnel si
  // worksLevel != 'aucun'. Genere works: WorkItem[] a l'envoi API.
  worksCategories: WorksCategory[];
  worksYear: string;
  worksAmount: string;
  // Sprint C2 : annee + montant PAR categorie cochee. Key = WorksCategory.
  // Initialise au toggle cat (heritage de worksYear global comme defaut),
  // editable individuellement. Auto-purgee quand cat est decochee.
  worksByCat: Record<string, { year: string; amount: string }>;
  bedrooms: string;
  year: string;
  // Sprint C7 — Observatoire (apartment uniquement, ignores pour house/villa).
  conditionC7: "" | ConditionC7;
  floorTypeC7: "" | FloorTypeC7;
  atypicalTypeC7: "" | AtypicalTypeC7;
  vefa: boolean;
  parkingIndoor: string;
  parkingOutdoor: string;
  cellar: boolean;
  terraceArea: string;
  balconyArea: string;
  gardenArea: string;
  // Step 3 — coordonnées client (pour livraison résultat + suivi)
  // Sprint C10 : split nom complet -> prenom + nom (2 champs distincts).
  // contactName conserve = concat firstName + ' ' + lastName (back-compat).
  contactFirstName: string;
  contactLastName: string;
  contactName: string; // @deprecated Sprint C10 : derive de firstName + lastName.
  contactEmail: string;
  contactPhone: string;
  message: string; // Sprint B1 : texte libre optionnel
  contactConsent: boolean;
  rgpdConsent: boolean;
}

const initial: FormState = {
  locality: "",
  commune: "",
  quartier: "",
  type: "appartement",
  state: "good",
  energy: "C",
  livingSurface: "",
  landSurface: "",
  terraceSurface: "",
  surfaceTotal: "",
  worksLevel: "",
  worksCategories: [],
  worksYear: "",
  worksAmount: "",
  worksByCat: {},
  bedrooms: "",
  year: "",
  conditionC7: "",
  floorTypeC7: "",
  atypicalTypeC7: "",
  vefa: false,
  parkingIndoor: "",
  parkingOutdoor: "",
  cellar: false,
  terraceArea: "",
  balconyArea: "",
  gardenArea: "",
  contactFirstName: "",
  contactLastName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  message: "",
  contactConsent: false,
  rgpdConsent: false,
};

// Sprint C9 — Validation stricte Step 3 via lib/validators/contact (regex
// nom, email 3 niveaux + whitelist + TLDs + min 5 chars, telephone
// libphonenumber-js 65 pays). Remplace les regex inline C8 qui acceptaient
// des leads pourris ("j@j.lu", "+352 691"). Bouton vraiment disabled tant
// que validators ne retournent pas valid=true sur les 3 champs.

/** Lieu propose au formulaire (cf. lib/estimation/coverage.ts). */
export type EstimatePlace = ComboboxPlace;

/** Suggestion a confirmer (cf. lib/estimation/coverage.ts). */
interface PlaceSuggestion {
  name: string;
  commune: string;
}

/** Base de calcul annoncee au visiteur (cf. app/api/estimate/route.ts). */
interface EstimateBasis {
  locality: string;
  commune: string;
  quartier: string | null;
  attached: boolean;
}

export function EstimateForm({ places = [] }: { places?: EstimatePlace[] }) {
  const t = useTranslations("estimate_form");
  const tSearch = useTranslations("search");
  const tRgpd = useTranslations("rgpd");
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [result, setResult] = useState<EstimateResult | null>(null);
  // Booleen methodo : des ventes reelles ont-elles servi au calcul ? (jamais
  // le nombre ni le detail cote client). Selectionne la variante de phrase.
  const [usedComparables, setUsedComparables] = useState(false);
  // Base de calcul renvoyee par le serveur (commune, quartier, rattachement).
  const [basis, setBasis] = useState<EstimateBasis | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Garde couverture (oct. 2026) : reponse 422 du serveur -> aucun chiffre,
  // renvoi vers l'agence (hors Luxembourg ou valeur hors seuil).
  const [blocked, setBlocked] = useState<
    | { kind: "country" | "commune"; suggestions: PlaceSuggestion[] }
    | { kind: "unrealistic" | "no_data" }
    | null
  >(null);
  // Sprint C8 — touched flags pour affichage erreurs onBlur uniquement.
  // Sprint C10 — touchedName remplace par touchedFirstName + touchedLastName.
  const [touchedFirstName, setTouchedFirstName] = useState(false);
  const [touchedLastName, setTouchedLastName] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);
  // Sprint C9 — code ISO pays choisi dans PhoneInput, requis par
  // validatePhone(phone, iso). Defaut LU (cf. DEFAULT_COUNTRY).
  const [phoneCountry, setPhoneCountry] = useState<string>(DEFAULT_COUNTRY);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  // Anti-robots (oct. 2026) : jeton Turnstile exige par /api/estimate si
  // configure. Script indisponible : soumission autorisee, le serveur tranche.
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const captchaReady = !turnstileEnabled || Boolean(captchaToken) || captchaFailed;

  const placesByName = useMemo(
    () => new Map(places.map((p) => [p.name, p])),
    [places],
  );
  // Lieu choisi dans le champ unique (null tant qu'aucune entree n'est
  // selectionnee : l'etape suivante reste bloquee).
  const selectedPlace = placesByName.get(data.locality) ?? null;
  const [placeFieldKey, setPlaceFieldKey] = useState(0);


  // Sprint C2 LIVRABLE 4 : validation par-categorie. Une cat cochee DOIT
  // avoir year ET amount remplis et valides. Si une seule cat est invalide,
  // on bloque le passage Step 1 → Step 2 + affichage erreurs inline.
  const worksErrors: { cat: string; reason: "year_missing" | "year_range" | "amount_missing" | "amount_range" }[] = [];
  if (data.worksLevel && data.worksLevel !== "aucun") {
    for (const cat of data.worksCategories) {
      const entry = data.worksByCat[cat];
      const yearStr = entry?.year ?? "";
      const amountStr = entry?.amount ?? "";
      // Fallback sur le year global → seulement le global vide = erreur.
      const effectiveYear = yearStr || data.worksYear;
      if (!effectiveYear) {
        worksErrors.push({ cat, reason: "year_missing" });
      } else {
        const yNum = Number(effectiveYear);
        if (!Number.isFinite(yNum) || yNum < 1900 || yNum > CURRENT_YEAR) {
          worksErrors.push({ cat, reason: "year_range" });
        }
      }
      // Pour le montant : individuel OU global (reparti) suffit.
      const effectiveAmount = amountStr || data.worksAmount;
      if (!effectiveAmount) {
        worksErrors.push({ cat, reason: "amount_missing" });
      } else {
        const aNum = Number(effectiveAmount);
        if (!Number.isFinite(aNum) || aNum < 100 || aNum > 1_000_000) {
          worksErrors.push({ cat, reason: "amount_range" });
        }
      }
    }
  }
  const hasWorksErrors = worksErrors.length > 0;

  // `override` : suggestion choisie apres une reponse 422 (lieu + commune
  // officielle) ; elle remplace la saisie avant le nouvel envoi.
  const submit = async (override?: PlaceSuggestion) => {
    const locality = override?.name ?? data.locality;
    const overridePlace = override ? placesByName.get(override.name) : undefined;
    const commune = override?.commune ?? data.commune;
    const quartier = override ? (overridePlace?.quartier ?? "") : data.quartier;
    // Sprint C9 — double protection : meme si le bouton fuit (DevTools,
    // race), on refuse cote handler si un validator KO. Force le retour
    // visuel onBlur en marquant tous les champs comme touches.
    // Sprint C10 — 4 validators (firstName + lastName + email + phone).
    if (
      !validateFirstName(data.contactFirstName).valid ||
      !validateLastName(data.contactLastName).valid ||
      !validateEmail(data.contactEmail).valid ||
      !validatePhone(data.contactPhone, phoneCountry).valid
    ) {
      setTouchedFirstName(true);
      setTouchedLastName(true);
      setTouchedEmail(true);
      setTouchedPhone(true);
      return;
    }
    setPending(true);
    setError(null);
    setBlocked(null);
    try {
      // Sprint C2 : construit works: WorkItem[] AVEC annee + montant
      // INDIVIDUELS par categorie (data.worksByCat). Fini la repartition
      // uniforme de C1 : chaque categorie a sa propre annee et son propre
      // montant saisis. Fallback sur data.worksYear / data.worksAmount /
      // n si une categorie n'a pas encore de valeur individuelle (saisie
      // partielle), pour preserver la robustesse.
      const cats = data.worksCategories;
      const worksYearGlobal = Number(data.worksYear);
      const worksAmountGlobal = Number(data.worksAmount);
      const hasAnyEntry = cats.some((c) => {
        const e = data.worksByCat[c];
        return e && (e.year || e.amount);
      });
      const worksPayload: { category: string; year: number; amount: number }[] =
        cats.length > 0
          ? cats.map((c) => {
              const entry = data.worksByCat[c];
              const entryYear = entry?.year ? Number(entry.year) : NaN;
              const entryAmount = entry?.amount ? Number(entry.amount) : NaN;
              const year = Number.isFinite(entryYear) && entryYear > 0
                ? entryYear
                : Number.isFinite(worksYearGlobal) && worksYearGlobal > 0
                  ? worksYearGlobal
                  : 0;
              const amount = Number.isFinite(entryAmount) && entryAmount > 0
                ? entryAmount
                : Number.isFinite(worksAmountGlobal) && worksAmountGlobal > 0
                  ? Math.round(worksAmountGlobal / cats.length)
                  : 0;
              return { category: c, year, amount };
            }).filter((w) => w.year > 0 || w.amount > 0 || hasAnyEntry)
          : [];

      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribution: getAttribution(),
          country: "LU",
          locality: locality.trim() || undefined,
          commune: commune || undefined,
          quartier: quartier || undefined,
          type: data.type,
          state: data.state,
          energy: data.energy,
          livingSurface: Number(data.livingSurface),
          landSurface: data.landSurface ? Number(data.landSurface) : undefined,
          terraceSurface: data.terraceSurface
            ? Number(data.terraceSurface)
            : undefined,
          bedrooms: data.bedrooms ? Number(data.bedrooms) : undefined,
          year: data.year ? Number(data.year) : undefined,
          // Sprint B1 : nouveaux champs lead generator (persistance + email)
          surfaceTotal: data.surfaceTotal ? Number(data.surfaceTotal) : undefined,
          worksLevel: data.worksLevel || undefined,
          // Sprint C1 : Travaux detailles. works[] consomme par engine EVS
          // (vetuste par categorie). 3 champs plats persistes en colonnes
          // dediees pour stats admin (cf. migration 20260525).
          works: worksPayload.length > 0 ? worksPayload : undefined,
          // Sprint C2 : worksDetails enrichi (WorkItem[] complet au lieu de
          // string[] cats nues en C1). Permet stats admin par poste +
          // future calibration EVS year/amount par categorie.
          worksDetails: worksPayload.length > 0 ? worksPayload : undefined,
          // Scalaires derives pour stats admin (colonnes plates) :
          // works_year = max(year), works_amount = sum(amount).
          worksYear:
            worksPayload.length > 0
              ? worksPayload.reduce((mx, w) => (w.year > mx ? w.year : mx), 0) || undefined
              : Number.isFinite(worksYearGlobal) && worksYearGlobal > 0
                ? worksYearGlobal
                : undefined,
          worksAmount:
            worksPayload.length > 0
              ? worksPayload.reduce((s, w) => s + w.amount, 0) || undefined
              : Number.isFinite(worksAmountGlobal) && worksAmountGlobal > 0
                ? worksAmountGlobal
                : undefined,
          // Sprint C10 : firstName + lastName envoyes separes. contactName
          // reste en payload pour back-compat API (concat cote serveur).
          contactFirstName: data.contactFirstName.trim() || undefined,
          contactLastName: data.contactLastName.trim() || undefined,
          contactName:
            `${data.contactFirstName.trim()} ${data.contactLastName.trim()}`.trim() ||
            undefined,
          message: data.message || undefined,
          // Sprint C7 : champs Observatoire (apartment uniquement, defauts
          // safe cote engine). Envoyes meme si segment=house — l'engine les
          // ignore et utilise estimateHouse intact.
          condition: data.conditionC7 || undefined,
          floorType: data.floorTypeC7 || undefined,
          atypicalType: data.atypicalTypeC7 || undefined,
          vefa: data.vefa || undefined,
          parkingIndoor: data.parkingIndoor ? Number(data.parkingIndoor) : undefined,
          parkingOutdoor: data.parkingOutdoor ? Number(data.parkingOutdoor) : undefined,
          cellar: data.cellar || undefined,
          terraceArea: data.terraceArea ? Number(data.terraceArea) : undefined,
          balconyArea: data.balconyArea ? Number(data.balconyArea) : undefined,
          gardenArea: data.gardenArea ? Number(data.gardenArea) : undefined,
          // Coordonnées : on les passe pour qu'un lead soit créé côté serveur si présent
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          // Sprint C9 — ISO pays requis pour validatePhone server-side.
          contactPhoneCountry: phoneCountry || undefined,
          rgpdConsent: data.rgpdConsent,
          captchaToken: captchaToken ?? undefined,
        }),
      });
      if (!res.ok) {
        // Jeton deja consomme par le serveur : un nouveau pour l'essai suivant.
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      }
      if (res.status === 422) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
          suggestions?: PlaceSuggestion[];
        };
        if (j.error === "UNREALISTIC_ESTIMATE") {
          setBlocked({ kind: "unrealistic" });
          return;
        }
        if (j.error === "NO_MARKET_DATA") {
          setBlocked({ kind: "no_data" });
          return;
        }
        if (j.error === "OUT_OF_COVERAGE" || j.error === "COUNTRY_NOT_COVERED") {
          setBlocked({
            kind: j.reason === "commune" ? "commune" : "country",
            suggestions: Array.isArray(j.suggestions) ? j.suggestions : [],
          });
          return;
        }
      }
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        result: EstimateResult;
        engine?: string;
        confidence?: string;
        usedComparables?: boolean;
        basis?: EstimateBasis;
      };
      setResult(json.result);
      setBasis(json.basis ?? null);
      setUsedComparables(json.usedComparables === true);
      setStep(4);
      track("estimation_compute", {
        country: "LU",
        type: data.type,
        commune: commune || undefined,
        quartier: data.quartier || undefined,
        living_surface: Number(data.livingSurface) || undefined,
        engine: json.engine,
        confidence: json.confidence,
        price_mid: json.result?.range?.mid,
        has_contact: Boolean(data.contactEmail || data.contactPhone),
      });
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setData(initial);
    setResult(null);
    setUsedComparables(false);
    setBasis(null);
    setBlocked(null);
    setStep(1);
  };

  if (result) {
    return (
      <ResultView
        result={result}
        usedComparables={usedComparables}
        basis={basis}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* POL2-6 : mention légale obligatoire en TÊTE du formulaire EVS. */}
      <DisclaimerLegal />
      <div className="rounded-2xl border border-line bg-bg p-8 shadow-sm">
      <Stepper current={step} t={t} />

      {step === 1 && (
        <StepWrap title={t("step1_title")} subtitle={t("step1_subtitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect
              label={t("type")}
              value={data.type}
              onChange={(v) => set("type", v)}
              options={PROPERTY_TYPES.map((p) => ({
                value: p,
                label: tSearch(`type_${p}`),
              }))}
            />
            <FieldSelect
              label={t("state")}
              value={data.state}
              onChange={(v) => set("state", v as FormState["state"])}
              options={STATES.map((s) => ({ value: s, label: t(`state_${s}`) }))}
            />
            {/* BUG T4 : pour un terrain, la surface utile est la
                surface de terrain (pas d'habitable). */}
            <FieldNumber
              label={t("living_surface")}
              value={data.livingSurface}
              onChange={(v) => set("livingSurface", v)}
              suffix="m²"
              required={data.type !== "terrain"}
              tooltip={t("living_surface_tooltip")}
            />
            {/* Sprint B1 : surface totale optionnelle (qualification lead). */}
            <FieldNumber
              label={t("surface_total")}
              value={data.surfaceTotal}
              onChange={(v) => set("surfaceTotal", v)}
              suffix="m²"
              tooltip={t("surface_total_tooltip")}
            />
            <FieldNumber
              label={t("land_surface")}
              value={data.landSurface}
              onChange={(v) => set("landSurface", v)}
              suffix="m²"
              required={data.type === "terrain"}
            />
            <FieldNumber
              label={t("terrace_surface")}
              value={data.terraceSurface}
              onChange={(v) => set("terraceSurface", v)}
              suffix="m²"
            />
            {/* Sprint C7 : champ 'annee de construction' SUPPRIME du Step 1.
                La methode Observatoire n'utilise pas yearBuilt — CPE + etat
                refletent indirectement l'age. State legacy `year` conserve
                dans le payload optionnel (back-compat API). */}
            <FieldNumber
              label={t("bedrooms")}
              value={data.bedrooms}
              onChange={(v) => set("bedrooms", v)}
            />
            <FieldSelect
              label={t("energy")}
              value={data.energy}
              onChange={(v) => set("energy", v)}
              options={ENERGIES.map((e) => ({ value: e, label: e }))}
            />
            {/* Sprint C7 : VEFA checkbox (apartment only, visuellement
                disponible aussi pour terrain — l'engine ignore si maison). */}
            {isApartmentSegment(data.type) && (
              <label className="flex items-center gap-2 self-end text-sm text-ink-mid">
                <input
                  type="checkbox"
                  checked={data.vefa}
                  onChange={(e) => set("vefa", e.target.checked)}
                  className="accent-gold"
                />
                <span>{t("vefa_label")}</span>
              </label>
            )}
          </div>

          {/* Sprint C7 : 3 nouveaux selects + radio condition apartment-only. */}
          {isApartmentSegment(data.type) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FieldSelect
                label={t("c7_floor_label")}
                value={data.floorTypeC7}
                onChange={(v) => set("floorTypeC7", v as FloorTypeC7 | "")}
                options={[
                  { value: "", label: t("c7_floor_default") },
                  ...FLOOR_TYPES_C7.map((f) => ({
                    value: f,
                    label: t(`c7_floor_${f}`),
                  })),
                ]}
              />
              <FieldSelect
                label={t("c7_atypical_label")}
                value={data.atypicalTypeC7}
                onChange={(v) => set("atypicalTypeC7", v as AtypicalTypeC7 | "")}
                options={[
                  { value: "", label: t("c7_atypical_default") },
                  ...ATYPICAL_TYPES_C7.map((a) => ({
                    value: a,
                    label: t(`c7_atypical_${a}`),
                  })),
                ]}
              />
            </div>
          )}

          {/* Sprint C7 : condition radio 6 niveaux (apartment seulement —
              les maisons utilisent state legacy via estimateHouse). */}
          {isApartmentSegment(data.type) && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                {t("c7_condition_label")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS_C7.map((c) => {
                  const active = data.conditionC7 === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("conditionC7", active ? "" : c)}
                      className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                        active
                          ? "border-gold bg-gold/15 text-gold-deep"
                          : "border-line text-ink-soft hover:border-gold hover:text-gold"
                      }`}
                    >
                      {t(`c7_condition_${c}`)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs italic text-ink-soft">
                {t("c7_methodology_hint")}
              </p>
            </fieldset>
          )}
          {/* Sprint C7 : bloc ANNEXES (obligatoire methode Observatoire,
              apartment uniquement). Place AVANT le bloc Travaux. */}
          {isApartmentSegment(data.type) && (
            <AnnexesC7Block
              parkingIndoor={data.parkingIndoor}
              parkingOutdoor={data.parkingOutdoor}
              cellar={data.cellar}
              terraceArea={data.terraceArea}
              balconyArea={data.balconyArea}
              gardenArea={data.gardenArea}
              onChange={(field, value) => set(field, value as never)}
              t={t}
            />
          )}

          {/* Sprint C1 : section Travaux enrichie. Niveau radio (B1
              conserve) + detail conditionnel (categories cochees + annee
              + montant) si niveau != 'aucun'. Sprint C7 : conservee mais
              OPTIONNELLE — l'engine Observatoire ne consomme pas works
              dans le calcul. Persistance DB intacte pour historique admin. */}
          <div className="mt-5">
            <WorksLevelRadio
              value={data.worksLevel}
              onChange={(v) => {
                set("worksLevel", v);
                // Reset cascade si aucun travaux declare.
                if (v === "aucun" || v === "") {
                  set("worksCategories", []);
                  set("worksYear", "");
                  set("worksAmount", "");
                  set("worksByCat", {});
                }
              }}
              t={t}
            />
            {data.worksLevel && data.worksLevel !== "aucun" && (
              <WorksDetailsBlock
                categories={data.worksCategories}
                onCategoriesChange={(cats) => {
                  // Sprint C2 : synchroniser worksByCat (purge des cats
                  // decochees, init des nouvelles cats avec annee/montant
                  // globaux comme defaut).
                  const next: Record<string, { year: string; amount: string }> = {};
                  cats.forEach((c) => {
                    next[c] = data.worksByCat[c] ?? {
                      year: data.worksYear || "",
                      amount: "",
                    };
                  });
                  set("worksCategories", cats);
                  set("worksByCat", next);
                }}
                year={data.worksYear}
                onYearChange={(y) => set("worksYear", y)}
                amount={data.worksAmount}
                onAmountChange={(a) => set("worksAmount", a)}
                byCat={data.worksByCat}
                onByCatChange={(byCat) => set("worksByCat", byCat)}
                errors={worksErrors}
                t={t}
              />
            )}
          </div>
          <NextBtn
            onClick={() => setStep(2)}
            disabled={
              hasWorksErrors ||
              (data.type === "terrain"
                ? !data.landSurface || Number(data.landSurface) <= 0
                : !data.livingSurface || Number(data.livingSurface) <= 0)
            }
            t={t}
          />
        </StepWrap>
      )}

      {step === 2 && (
        <StepWrap title={t("step2_title")} subtitle={t("step2_subtitle")}>
          {/* Oct. 2026 : estimation limitee au Luxembourg (pays implicite)
              et CHAMP UNIQUE de localisation : localites, communes et
              quartiers du registre officiel. Plus de liste de communes ni
              de code postal (jamais transmis a l'API). */}
          <p className="mb-4 text-sm text-ink-mid">{t("country_implicit")}</p>
          <PlaceCombobox
            // "Modifier" remonte le champ vide, ouvert et focalise.
            key={placeFieldKey}
            autoFocus={placeFieldKey > 0}
            places={places}
            value={selectedPlace}
            onSelect={(place) => {
              setData((d) => ({
                ...d,
                locality: place?.name ?? "",
                commune: place?.commune ?? "",
                quartier: place?.quartier ?? "",
              }));
            }}
            label={t("locality")}
            placeholder={t("locality_placeholder")}
            noResultText={t("place_no_result")}
            listLabel={t("place_list_label")}
          />
          {selectedPlace && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-mid">
              <span>
                {selectedPlace.quartier
                  ? t("place_selected_quartier", { quartier: selectedPlace.quartier })
                  : t("place_selected", { commune: selectedPlace.commune })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setData((d) => ({ ...d, locality: "", commune: "", quartier: "" }));
                  setPlaceFieldKey((k) => k + 1);
                }}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink underline underline-offset-4 hover:no-underline"
              >
                {t("place_change")}
              </button>
            </p>
          )}
          <BackNextBtn
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            disabled={!selectedPlace}
            t={t}
          />
        </StepWrap>
      )}

      {step === 3 && (() => {
        // Sprint C9 + C10 — validators officiels (libphonenumber-js + whitelists).
        const firstNameRes = validateFirstName(data.contactFirstName);
        const lastNameRes = validateLastName(data.contactLastName);
        const emailRes = validateEmail(data.contactEmail);
        const phoneRes = validatePhone(data.contactPhone, phoneCountry);
        const firstNameError =
          touchedFirstName && !firstNameRes.valid && firstNameRes.error
            ? t(`validation.${firstNameRes.error}`)
            : undefined;
        const lastNameError =
          touchedLastName && !lastNameRes.valid && lastNameRes.error
            ? t(`validation.${lastNameRes.error}`)
            : undefined;
        const emailError =
          touchedEmail && !emailRes.valid && emailRes.error
            ? t(`validation.${emailRes.error}`)
            : undefined;
        const phoneError =
          touchedPhone && !phoneRes.valid && phoneRes.error
            ? t(`validation.${phoneRes.error}`)
            : undefined;
        const step3Disabled =
          !data.contactConsent ||
          !data.rgpdConsent ||
          !firstNameRes.valid ||
          !lastNameRes.valid ||
          !emailRes.valid ||
          !phoneRes.valid;
        return (
        <StepWrap title={t("step3_title")} subtitle={t("step3_subtitle")}>
          {/* Sprint C10 : prenom + nom separes (2 champs cote a cote desktop,
              empiles mobile via grid-cols-1 sm:grid-cols-2). */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <FieldText
              label={t("contact_first_name")}
              value={data.contactFirstName}
              onChange={(v) => set("contactFirstName", v)}
              onBlur={() => setTouchedFirstName(true)}
              error={firstNameError}
              placeholder={t("contact_first_name_placeholder")}
              autoComplete="given-name"
            />
            <FieldText
              label={t("contact_last_name")}
              value={data.contactLastName}
              onChange={(v) => set("contactLastName", v)}
              onBlur={() => setTouchedLastName(true)}
              error={lastNameError}
              placeholder={t("contact_last_name_placeholder")}
              autoComplete="family-name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldText
              type="email"
              label={t("contact_email")}
              value={data.contactEmail}
              onChange={(v) => set("contactEmail", v)}
              onBlur={() => setTouchedEmail(true)}
              error={emailError}
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
            <PhoneInput
              label={t("contact_phone")}
              onChange={(v) => set("contactPhone", v)}
              onCountryChange={(iso) => setPhoneCountry(iso)}
              onBlur={() => setTouchedPhone(true)}
              error={phoneError}
            />
          </div>
          {/* Sprint B1 : message libre optionnel (qualifie le lead) */}
          <div className="mt-4">
            <FieldTextarea
              label={t("message")}
              value={data.message}
              onChange={(v) => set("message", v)}
              placeholder={t("message_placeholder")}
              rows={3}
            />
          </div>
          <div className="mt-4">
            <CheckboxField
              checked={data.contactConsent}
              onChange={(v) => set("contactConsent", v)}
              label={t("contact_consent")}
            />
          </div>
          <div className="mt-3">
            <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
              <input
                type="checkbox"
                checked={data.rgpdConsent}
                onChange={(e) => set("rgpdConsent", e.target.checked)}
                className="mt-0.5 size-4 accent-gold-deep"
              />
              <span>
                {tRgpd("consent_label")}{" "}
                <Link
                  href="/legal/rgpd"
                  target="_blank"
                  className="underline hover:text-gold-deep"
                >
                  {tRgpd("policy_link")}
                </Link>
              </span>
            </label>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-accent-warm/40 bg-accent-warm/10 px-4 py-2 font-mono text-xs text-accent-warm">
              {error}
            </p>
          )}
          {blocked && (
            <CoverageNotice
              kind={blocked.kind}
              suggestions={
                blocked.kind === "country" || blocked.kind === "commune"
                  ? blocked.suggestions
                  : []
              }
              onPickSuggestion={(s) => {
                set("locality", s.name);
                set("commune", s.commune);
                set("quartier", placesByName.get(s.name)?.quartier ?? "");
                void submit(s);
              }}
              t={t}
            />
          )}
          <Turnstile
            ref={turnstileRef}
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaFailed(true)}
            className="mt-4"
          />
          <BackSubmitBtn
            onBack={() => setStep(2)}
            onSubmit={() => void submit()}
            pending={pending}
            t={t}
            disabled={step3Disabled || !captchaReady}
            disabledTooltip={t("validation.submit_disabled_tooltip")}
          />
        </StepWrap>
        );
      })()}
      </div>
    </div>
  );
}

function Stepper({
  current,
  t,
}: {
  current: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const steps = [t("step1_label"), t("step2_label"), t("step3_label")];
  return (
    <ol className="mb-8 flex items-center gap-3 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-mono ${
                active
                  ? "bg-ink text-bg"
                  : done
                    ? "bg-gold text-bg-contrast"
                    : "border border-line text-ink-soft"
              }`}
            >
              {done ? "✓" : num}
            </span>
            <span
              className={`whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] ${
                active ? "text-ink" : "text-ink-soft"
              }`}
            >
              {label}
            </span>
            {num < steps.length && (
              <span aria-hidden className="h-px w-8 bg-line" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepWrap({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-1 mb-6 text-sm text-ink-mid">{subtitle}</p>
      {children}
    </section>
  );
}

function FieldText({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  autoComplete,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  /** id d'un <datalist> de suggestions. */
  list?: string;
}) {
  const borderClass = error
    ? "border-red-500 focus:border-red-500"
    : "border-line focus:border-gold";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        list={list}
        aria-invalid={error ? true : undefined}
        className={`rounded-md border ${borderClass} bg-bg px-4 py-2.5 text-sm focus:outline-none`}
      />
      {error && (
        <span className="font-mono text-[10px] text-red-500">{error}</span>
      )}
    </label>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  suffix,
  required,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  required?: boolean;
  tooltip?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
        {required && <span className="text-gold-deep">*</span>}
        {suffix && <span className="text-ink-mid">{suffix}</span>}
        {tooltip && (
          <span
            tabIndex={0}
            role="img"
            aria-label={tooltip}
            title={tooltip}
            className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-line text-[9px] font-bold text-ink-soft hover:border-gold hover:text-gold focus:outline-none"
          >
            ⓘ
          </span>
        )}
      </span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      />
    </label>
  );
}

// Sprint B1 : textarea pour le message libre Step 3.
function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-y rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      />
    </label>
  );
}

// Sprint C1 : bloc detail des travaux (categories engine EVS + annee +
// montant). Affiche conditionnellement par EstimateForm si worksLevel
// est defini et != 'aucun'. Toutes les categories sont accessibles
// (un bien peut combiner gros/moyens/petits) ; le regroupement visuel
// par 'lourdeur' aide juste la lecture.
function WorksDetailsBlock({
  categories,
  onCategoriesChange,
  year,
  onYearChange,
  amount,
  onAmountChange,
  byCat,
  onByCatChange,
  errors,
  t,
}: {
  categories: WorksCategory[];
  onCategoriesChange: (cats: WorksCategory[]) => void;
  year: string;
  onYearChange: (y: string) => void;
  amount: string;
  onAmountChange: (a: string) => void;
  byCat: Record<string, { year: string; amount: string }>;
  onByCatChange: (next: Record<string, { year: string; amount: string }>) => void;
  errors: { cat: string; reason: "year_missing" | "year_range" | "amount_missing" | "amount_range" }[];
  t: ReturnType<typeof useTranslations>;
}) {
  // Sprint C2 : index des erreurs par categorie pour render rapide.
  const errorByCat = new Map<string, Set<string>>();
  for (const e of errors) {
    if (!errorByCat.has(e.cat)) errorByCat.set(e.cat, new Set());
    errorByCat.get(e.cat)!.add(e.reason);
  }
  const toggleCat = (cat: WorksCategory) => {
    if (categories.includes(cat)) {
      onCategoriesChange(categories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...categories, cat]);
    }
  };
  // Sprint C2 : helper pour patcher une entree byCat sans muter le state.
  const patchCat = (cat: WorksCategory, patch: Partial<{ year: string; amount: string }>) => {
    onByCatChange({
      ...byCat,
      [cat]: {
        year: byCat[cat]?.year ?? "",
        amount: byCat[cat]?.amount ?? "",
        ...patch,
      },
    });
  };
  // Sprint C2 : total live (somme des montants saisis par categorie).
  // Si une cat n'a pas de montant individuel, on utilise le montant global
  // divise par n comme defaut (coherent avec la logique de submit).
  const globalAmountNum = Number(amount);
  const total = categories.reduce((sum, c) => {
    const v = byCat[c]?.amount ? Number(byCat[c].amount) : NaN;
    if (Number.isFinite(v) && v > 0) return sum + v;
    if (Number.isFinite(globalAmountNum) && globalAmountNum > 0) {
      return sum + Math.round(globalAmountNum / categories.length);
    }
    return sum;
  }, 0);
  const totalLabel = new Intl.NumberFormat("fr-FR").format(total);
  return (
    <div className="mt-5 space-y-5 rounded-xl border border-line bg-bg-soft/60 p-5">
      <p className="text-xs leading-relaxed text-ink-soft">
        {t("works_help_text")}
      </p>

      {/* Annee + montant GLOBAUX (defauts pour categories cochees). */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldNumber
          label={t("works_year_label")}
          value={year}
          onChange={onYearChange}
          tooltip={t("works_year_tooltip")}
        />
        <FieldNumber
          label={t("works_amount_label")}
          value={amount}
          onChange={onAmountChange}
          suffix="€"
          tooltip={t("works_amount_tooltip")}
        />
      </div>

      {/* Categories cochables, groupees visuellement par lourdeur.
          Sprint C2 : chaque cat cochee deplie 2 mini-champs annee+montant
          juste en dessous (auto-fill = year global, edition individuelle). */}
      <fieldset>
        <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {t("works_details_label")}
        </legend>
        <div className="space-y-4">
          {WORKS_GROUPS.map((group) => (
            <div key={group.level}>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-gold-deep/70">
                {t(`works_group_${group.level}`)}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.categories.map((cat) => {
                  const active = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      onClick={() => toggleCat(cat)}
                      className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        active
                          ? "border-gold bg-gold/15 text-gold-deep"
                          : "border-line text-ink-soft hover:border-gold hover:text-gold"
                      }`}
                    >
                      {active ? "✓ " : ""}
                      {t(`works_cat_${cat}`)}
                    </button>
                  );
                })}
              </div>
              {/* Sprint C2 : pour chaque cat de ce groupe qui est cochee,
                  afficher l'inline editor annee+montant. */}
              {group.categories.some((c) => categories.includes(c)) && (
                <ul className="mt-3 space-y-2 border-l-2 border-gold/40 pl-4">
                  {group.categories
                    .filter((c) => categories.includes(c))
                    .map((cat) => {
                      const entry = byCat[cat] ?? { year: "", amount: "" };
                      const errs = errorByCat.get(cat);
                      const yearErr = errs?.has("year_missing") || errs?.has("year_range");
                      const amountErr = errs?.has("amount_missing") || errs?.has("amount_range");
                      const errMsg = errs
                        ? errs.has("year_missing") || errs.has("amount_missing")
                          ? t("works_err_missing", { cat: t(`works_cat_${cat}`) })
                          : errs.has("year_range")
                            ? t("works_err_year_range")
                            : t("works_err_amount_range")
                        : null;
                      return (
                        <li key={cat}>
                          <div className="grid gap-2 sm:grid-cols-[160px_1fr_1fr]">
                            <span className="self-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mid">
                              {t(`works_cat_${cat}`)}
                            </span>
                            <input
                              type="number"
                              min="1900"
                              max={CURRENT_YEAR}
                              placeholder={year || String(CURRENT_YEAR)}
                              value={entry.year}
                              onChange={(e) => patchCat(cat, { year: e.target.value })}
                              className={`rounded-md border bg-bg px-3 py-1.5 text-sm focus:outline-none ${
                                yearErr
                                  ? "border-accent-warm focus:border-accent-warm"
                                  : "border-line focus:border-gold"
                              }`}
                              aria-label={`${t(`works_cat_${cat}`)} : ${t("works_year_label")}`}
                              aria-invalid={yearErr || undefined}
                            />
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={entry.amount}
                                onChange={(e) => patchCat(cat, { amount: e.target.value })}
                                className={`w-full rounded-md border bg-bg px-3 py-1.5 pr-8 text-sm focus:outline-none ${
                                  amountErr
                                    ? "border-accent-warm focus:border-accent-warm"
                                    : "border-line focus:border-gold"
                                }`}
                                aria-label={`${t(`works_cat_${cat}`)} : ${t("works_amount_label")}`}
                                aria-invalid={amountErr || undefined}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-soft">
                                €
                              </span>
                            </div>
                          </div>
                          {errMsg && (
                            <p className="mt-1 font-mono text-[10px] text-accent-warm">
                              {errMsg}
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {/* Total live calcule a partir des montants par categorie. */}
      {categories.length > 0 && (
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
            {t("works_total_label")}
          </span>
          <span className="font-display text-lg font-bold gold-text">
            {totalLabel} €
          </span>
        </div>
      )}
    </div>
  );
}

// Sprint C7 : bloc Annexes Observatoire (apartment uniquement).
// Parkings intérieurs/extérieurs + cave + terrasse + balcon + jardin.
// Tous optionnels mais necessaires pour calibrer le mid Observatoire.
function AnnexesC7Block({
  parkingIndoor,
  parkingOutdoor,
  cellar,
  terraceArea,
  balconyArea,
  gardenArea,
  onChange,
  t,
}: {
  parkingIndoor: string;
  parkingOutdoor: string;
  cellar: boolean;
  terraceArea: string;
  balconyArea: string;
  gardenArea: string;
  onChange: (
    field:
      | "parkingIndoor"
      | "parkingOutdoor"
      | "cellar"
      | "terraceArea"
      | "balconyArea"
      | "gardenArea",
    value: string | boolean,
  ) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-5 rounded-xl border border-line bg-bg-soft/60 p-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-gold-deep">
        {t("c7_annexes_title")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldNumber
          label={t("c7_parking_indoor")}
          value={parkingIndoor}
          onChange={(v) => onChange("parkingIndoor", v)}
          tooltip={t("c7_parking_indoor_tooltip")}
        />
        <FieldNumber
          label={t("c7_parking_outdoor")}
          value={parkingOutdoor}
          onChange={(v) => onChange("parkingOutdoor", v)}
          tooltip={t("c7_parking_outdoor_tooltip")}
        />
        <FieldNumber
          label={t("c7_terrace_area")}
          value={terraceArea}
          onChange={(v) => onChange("terraceArea", v)}
          suffix="m²"
          tooltip={t("c7_terrace_tooltip")}
        />
        <FieldNumber
          label={t("c7_balcony_area")}
          value={balconyArea}
          onChange={(v) => onChange("balconyArea", v)}
          suffix="m²"
          tooltip={t("c7_balcony_tooltip")}
        />
        <FieldNumber
          label={t("c7_garden_area")}
          value={gardenArea}
          onChange={(v) => onChange("gardenArea", v)}
          suffix="m²"
          tooltip={t("c7_garden_tooltip")}
        />
        <label className="flex items-center gap-2 self-end text-sm text-ink-mid">
          <input
            type="checkbox"
            checked={cellar}
            onChange={(e) => onChange("cellar", e.target.checked)}
            className="accent-gold"
          />
          <span>{t("c7_cellar_label")}</span>
        </label>
      </div>
    </div>
  );
}

// Sprint B1 : radio horizontal "Travaux realises" — niveau global, optionnel.
function WorksLevelRadio({
  value,
  onChange,
  t,
}: {
  value: "" | (typeof WORKS_LEVELS)[number];
  onChange: (v: "" | (typeof WORKS_LEVELS)[number]) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {t("works_level")}
      </legend>
      <div className="flex flex-wrap gap-2">
        {WORKS_LEVELS.map((level) => {
          const active = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? "" : level)}
              className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                active
                  ? "border-gold bg-gold/10 text-gold-deep"
                  : "border-line text-ink-soft hover:border-gold hover:text-gold"
              }`}
            >
              {t(`works_${level}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}

function NextBtn({
  onClick,
  disabled,
  t,
}: {
  onClick: () => void;
  disabled?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        {t("next")} →
      </button>
    </div>
  );
}

function CoverageNotice({
  kind,
  suggestions = [],
  onPickSuggestion,
  t,
}: {
  kind: "country" | "commune" | "unrealistic" | "no_data";
  suggestions?: PlaceSuggestion[];
  onPickSuggestion?: (place: PlaceSuggestion) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // Textes par cas. Titre et suggestions en text-ink : l'or de la charte
  // n'offre que 1,6:1 sur fond creme (WCAG 4,5:1 requis).
  const keys = {
    country: ["coverage_title", "coverage_country", "coverage_cta"],
    commune: ["coverage_title", "coverage_commune", "coverage_cta"],
    unrealistic: ["unrealistic_title", "unrealistic_body", "unrealistic_cta"],
    no_data: ["no_data_title", "no_data_body", "no_data_cta"],
  }[kind];
  return (
    <div
      role="status"
      className="mt-5 rounded-xl border border-gold/50 bg-gold/5 p-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink">
        {t(keys[0])}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">{t(keys[1])}</p>
      {suggestions.length > 0 && onPickSuggestion && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-mid">{t("coverage_suggestions")}</span>
          {suggestions.map((s) => (
            <button
              key={`${s.name}|${s.commune}`}
              type="button"
              onClick={() => onPickSuggestion(s)}
              className="rounded-full border border-line-strong px-4 py-1.5 font-mono text-[11px] text-ink hover:bg-bg-deep"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <Link
        href="/contact"
        className="gold-shine-bg mt-4 inline-block rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20"
      >
        {t(keys[2])} →
      </Link>
    </div>
  );
}

function BackNextBtn({
  onBack,
  onNext,
  disabled = false,
  t,
}: {
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
      >
        ← {t("back")}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {t("next")} →
      </button>
    </div>
  );
}

function BackSubmitBtn({
  onBack,
  onSubmit,
  pending,
  t,
  disabled = false,
  disabledTooltip,
}: {
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  t: ReturnType<typeof useTranslations>;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
      >
        ← {t("back")}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || disabled}
        title={disabled && !pending ? disabledTooltip : undefined}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? t("computing") : t("compute")}
      </button>
    </div>
  );
}

function ResultView({
  result,
  usedComparables,
  basis,
  onReset,
}: {
  result: EstimateResult;
  usedComparables: boolean;
  basis: EstimateBasis | null;
  onReset: () => void;
}) {
  const t = useTranslations("estimate_form");
  return (
    <div className="space-y-8">
      {/* Range */}
      <section className="rounded-2xl border border-gold bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          {t("range_label")}
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {t("range_low")}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {formatEuro(result.range.low)}
            </p>
          </div>
          <div className="border-x border-line px-4 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              {t("range_mid")}
            </p>
            <p className="mt-1 font-display text-4xl font-black gold-text">
              {formatEuro(result.range.mid)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {t("range_high")}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {formatEuro(result.range.high)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          {t("price_per_sqm", {
            value: formatEuro(result.pricePerSqm).replace(/\s/g, " "),
          })}
        </p>
        {/* Phrase methodologie (2 variantes, toujours vraies). Ne revele
            jamais le nombre ni le detail des ventes. */}
        <p className="mt-3 border-t border-gold/20 pt-3 text-xs leading-relaxed text-ink-mid">
          {usedComparables ? t("methodology_with_sales") : t("methodology_without_sales")}
        </p>
        {/* Oct. 2026 : base geographique du calcul. Les prix officiels sont
            publies par commune (et par quartier a Luxembourg-Ville) : on ne
            laisse jamais croire a une donnee au village pres. */}
        {basis && (
          <p className="mt-3 text-xs leading-relaxed text-ink-mid">
            {basis.quartier
              ? t("basis_quartier", { quartier: basis.quartier })
              : t("basis_commune", { commune: basis.commune })}
            {basis.attached &&
              ` ${t("basis_attached", { locality: basis.locality, commune: basis.commune })}`}
          </p>
        )}
      </section>

      {/* Financing */}
      {result.financing && (
        <section className="rounded-2xl border border-line bg-bg p-8">
          <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("financing_title")}
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t("max_borrowable")}
              value={formatEuro(result.financing.maxBorrowable)}
            />
            <Stat
              label={t("monthly_max")}
              value={formatEuro(result.financing.monthlyPaymentMax)}
            />
            <Stat
              label={t("duration")}
              value={`${result.financing.suggestedDuration} ans`}
            />
            <Stat
              label={t("rate_used")}
              value={`${result.financing.rateUsed.toFixed(2).replace(".", ",")} %`}
            />
            <Stat
              label={t("notary_fees")}
              value={`~ ${formatEuro(result.financing.notaryFees)}`}
            />
          </dl>
        </section>
      )}

      {/* Helps */}
      {result.helps.length > 0 && (
        <section className="rounded-2xl border border-line bg-bg-soft p-8">
          <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("helps_title")}
          </h3>
          <ul className="mt-5 space-y-4">
            {result.helps.map((h) => (
              <li
                key={h.key}
                className="rounded-xl border border-gold/30 bg-bg p-5"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h4 className="font-display text-base font-bold text-ink">
                    {t(`help_${h.key}_title`)}
                  </h4>
                  {h.amount && (
                    <span className="font-display text-lg font-black gold-text">
                      {formatEuro(h.amount)}
                    </span>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-mid">
                  {h.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden className="text-gold-deep">›</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sprint B1 : CTA finaux post-resultat — RDV expertise gratuit
          (lead chaud) + decouvrir services (lead tiède). Restart relegue
          en option discrete. */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/contact"
          className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
        >
          {t("cta_rdv_expertise")} →
        </Link>
        <Link
          href="/services"
          className="rounded-full border border-gold px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep transition-colors hover:bg-gold/10"
        >
          {t("cta_services")}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
        >
          {t("restart")}
        </button>
      </div>

      {/* Sprint C8 — Footer unifie : methodologie Observatoire + invitation
          visite + mention legale + source. Remplace 3 blocs distincts
          (c7_methodology_footer + DisclaimerLegal + result_footer). Bordure
          copper, fond sapin transparent, espacement 24px. */}
      <aside
        role="note"
        aria-label={t("result_view.footer_combined.title")}
        className="mt-6 rounded-2xl border border-gold-deep/60 bg-bg-soft/40 p-6"
      >
        <h3 className="font-display text-base font-bold text-ink">
          {t("result_view.footer_combined.title")}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">
          {t("result_view.footer_combined.p1")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">
          {t("result_view.footer_combined.p2")}
        </p>
        <p className="mt-3 text-xs italic leading-relaxed text-ink-soft">
          {t("result_view.footer_combined.p3")}
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {t("result_view.footer_combined.source")}
        </p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}

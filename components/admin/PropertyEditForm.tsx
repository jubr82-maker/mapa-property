"use client";

/**
 * PropertyEditForm : formulaire complet de la fiche d'un bien.
 *
 * Édite l'intégralité des champs de contenu/caractéristiques d'un bien
 * classique (hors type/transaction/état, fixés à la création, cf.
 * PropertyCreateForm, et hors vidéo/photos, gérées par leurs propres
 * sections sur la page d'édition). Sections/Field calqués sur
 * OffmarketForm.tsx / PropertyCreateForm.tsx pour une UI cohérente,
 * lisible par un utilisateur non technique.
 *
 * Server Action : updateProperty (cf. app/admin/properties/actions.ts).
 * Un seul objet form state ; l'enregistrement envoie tous les champs en
 * une fois (pas de sauvegarde partielle par section).
 */

import { useState, useTransition, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { updateProperty } from "@/app/admin/properties/actions";
import { translatePropertyFromFrench } from "@/app/admin/properties/translate-actions";
import { parseDecimalInput } from "@/lib/format/numbers";

// Valeurs enregistrees en base (inchangees, cf. allowlists de
// app/admin/properties/actions.ts) ; libelles : cles admin_properties.
const BADGE_OPTIONS = [
  { value: "Exclusivité", key: "badge_exclusivity" },
  { value: "Nouveau", key: "badge_new" },
  { value: "Nouveau prix", key: "badge_new_price" },
  { value: "Opportunité", key: "badge_opportunity" },
  { value: "Investissement", key: "badge_investment" },
  { value: "À découvrir", key: "badge_discover" },
] as const;
const BADGE_SIZE_OPTIONS = ["S", "M", "L"] as const;
const BADGE_POSITION_OPTIONS = [
  { value: "top-left", key: "pos_top_left" },
  { value: "top-right", key: "pos_top_right" },
  { value: "bottom-left", key: "pos_bottom_left" },
  { value: "bottom-right", key: "pos_bottom_right" },
] as const;
const STATUS_OPTIONS = ["draft", "published", "sold", "withdrawn"] as const;

interface PropertyEditFormInitial {
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_de: string | null;
  short_description_fr: string | null;
  short_description_en: string | null;
  short_description_de: string | null;
  surface: number | null;
  living_surface: number | null;
  usable_surface: number | null;
  land_surface: number | null;
  terrace_surface: number | null;
  balcony_surface: number | null;
  garden_surface: number | null;
  kitchen_surface: number | null;
  area_total: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  douches: number | null;
  wc: number | null;
  bureaux: number | null;
  locaux_stockage: number | null;
  floor: string | null;
  has_laundry: boolean;
  has_dressing: boolean;
  has_pool: boolean;
  parking: number | null;
  energy: string | null;
  thermal: string | null;
  ges: string | null;
  year: number | null;
  year_built: number | null;
  price: number | null;
  price_on_demand: boolean;
  price_min: number | null;
  price_max: number | null;
  amenities: string | null;
  current_use: string | null;
  potential_use: string | null;
  status: string;
  badge: string | null;
  badge_size: string | null;
  badge_position: string | null;
}

interface FormState {
  title_fr: string;
  title_en: string;
  title_de: string;
  description_fr: string;
  description_en: string;
  description_de: string;
  short_description_fr: string;
  short_description_en: string;
  short_description_de: string;
  surface: string;
  living_surface: string;
  usable_surface: string;
  land_surface: string;
  terrace_surface: string;
  balcony_surface: string;
  garden_surface: string;
  kitchen_surface: string;
  area_total: string;
  bedrooms: string;
  bathrooms: string;
  douches: string;
  wc: string;
  bureaux: string;
  locaux_stockage: string;
  floor: string;
  has_laundry: boolean;
  has_dressing: boolean;
  has_pool: boolean;
  parking: string;
  energy: string;
  thermal: string;
  ges: string;
  year: string;
  year_built: string;
  price: string;
  price_on_demand: boolean;
  price_min: string;
  price_max: string;
  amenities: string;
  current_use: string;
  potential_use: string;
  status: string;
  badge: string;
  badge_size: string;
  badge_position: string;
}

const NUMERIC_KEYS = [
  "surface",
  "living_surface",
  "usable_surface",
  "land_surface",
  "terrace_surface",
  "balcony_surface",
  "garden_surface",
  "kitchen_surface",
  "area_total",
  "bedrooms",
  "bathrooms",
  "douches",
  "wc",
  "bureaux",
  "locaux_stockage",
  "parking",
  "year",
  "year_built",
  "price",
  "price_min",
  "price_max",
] as const satisfies readonly (keyof FormState)[];

function toFormState(initial: PropertyEditFormInitial): FormState {
  const s = (v: string | null) => v ?? "";
  const n = (v: number | null) => (v == null ? "" : String(v));
  return {
    title_fr: s(initial.title_fr),
    title_en: s(initial.title_en),
    title_de: s(initial.title_de),
    description_fr: s(initial.description_fr),
    description_en: s(initial.description_en),
    description_de: s(initial.description_de),
    short_description_fr: s(initial.short_description_fr),
    short_description_en: s(initial.short_description_en),
    short_description_de: s(initial.short_description_de),
    surface: n(initial.surface),
    living_surface: n(initial.living_surface),
    usable_surface: n(initial.usable_surface),
    land_surface: n(initial.land_surface),
    terrace_surface: n(initial.terrace_surface),
    balcony_surface: n(initial.balcony_surface),
    garden_surface: n(initial.garden_surface),
    kitchen_surface: n(initial.kitchen_surface),
    area_total: n(initial.area_total),
    bedrooms: n(initial.bedrooms),
    bathrooms: n(initial.bathrooms),
    douches: n(initial.douches),
    wc: n(initial.wc),
    bureaux: n(initial.bureaux),
    locaux_stockage: n(initial.locaux_stockage),
    floor: s(initial.floor),
    has_laundry: initial.has_laundry,
    has_dressing: initial.has_dressing,
    has_pool: initial.has_pool,
    parking: n(initial.parking),
    energy: s(initial.energy),
    thermal: s(initial.thermal),
    ges: s(initial.ges),
    year: n(initial.year),
    year_built: n(initial.year_built),
    price: n(initial.price),
    price_on_demand: initial.price_on_demand,
    price_min: n(initial.price_min),
    price_max: n(initial.price_max),
    amenities: s(initial.amenities),
    current_use: s(initial.current_use),
    potential_use: s(initial.potential_use),
    status: initial.status,
    badge: s(initial.badge),
    badge_size: initial.badge_size ?? "M",
    badge_position: initial.badge_position ?? "top-left",
  };
}

// Ceinture-bretelles : même si les actions sœurs (photos/vidéo) ne
// rafraîchissent plus cette page (cf. photos/actions.ts et
// updatePropertyVideoUrl), une saisie non envoyée reste fragile face à
// toute navigation. Comparaison superficielle suffit : FormState n'a que
// des valeurs primitives (string/boolean).
function isDirty(a: FormState, b: FormState): boolean {
  return (Object.keys(a) as (keyof FormState)[]).some((k) => a[k] !== b[k]);
}

interface Props {
  propertyId: string;
  initial: PropertyEditFormInitial;
}

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";
const textareaCls = `${inputCls} font-sans`;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Section repliable (oct. 2026) : ouverte par defaut ; sur telephone,
  // l'admin ouvre seulement celle qu'il modifie. Une colonne sous 768 px.
  return (
    <details open data-admin-section className="group rounded-xl border border-[#3D4F63]/10 bg-[#F5EFE1]/30 p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <h3 className="font-display text-base font-bold text-[#3D4F63]">
          {title}
        </h3>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-[#3D4F63] transition-transform group-open:rotate-180" />
      </summary>
      {hint && <p className="mt-1 text-xs text-[#3D4F63]/60">{hint}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </details>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-[#3D4F63]/60">{hint}</span>}
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
      />
      <span className="text-sm text-[#3D4F63]/80">{label}</span>
    </label>
  );
}

export function PropertyEditForm({ propertyId, initial }: Props) {
  const t = useTranslations("admin_properties");
  const tn = useTranslations("admin_notices");
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [baseline, setBaseline] = useState<FormState>(() => toFormState(initial));
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = isDirty(form, baseline);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Traduction depuis le francais (Mistral) : remplit les champs anglais et
  // allemands pour relecture, n'enregistre rien (bouton Enregistrer), ne
  // remplace un texte deja saisi qu'apres confirmation.
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function translateFromFrench() {
    setTranslateMsg(null);
    setTranslating(true);
    try {
      const r = await translatePropertyFromFrench({
        title: form.title_fr,
        description: form.description_fr,
        short: form.short_description_fr,
      });
      if (!r.ok) return setTranslateMsg({ ok: false, text: r.error });
      const map: [keyof FormState, string | undefined][] = [
        ["title_en", r.en.title], ["description_en", r.en.description], ["short_description_en", r.en.short],
        ["title_de", r.de.title], ["description_de", r.de.description], ["short_description_de", r.de.short],
      ];
      const proposals = map.filter(([, v]) => typeof v === "string" && v.trim().length > 0) as [keyof FormState, string][];
      const filled = proposals.filter(([k, v]) => String(form[k] ?? "").trim() && String(form[k]) !== v);
      const overwrite = filled.length === 0 || window.confirm(t("translate_confirm_overwrite", { count: filled.length }));
      let applied = 0;
      for (const [k, v] of proposals) {
        if (!overwrite && String(form[k] ?? "").trim()) continue;
        set(k, v as FormState[typeof k]);
        applied++;
      }
      setTranslateMsg({ ok: true, text: t("translate_done", { count: applied }) });
    } catch {
      setTranslateMsg({ ok: false, text: tn("err_network") });
    } finally {
      setTranslating(false);
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Champs surface (mission "surfaces decimales...") : type="number" natif
  // rejette la virgule au clavier sur la plupart des navigateurs/claviers
  // (le separateur decimal HTML5 est toujours le point, quelle que soit la
  // locale de saisie). Passage en saisie texte libre + filtrage manuel :
  // chiffres uniquement, un seul separateur (virgule OU point), 2
  // decimales maximum. La conversion finale (numOrNull) tolere les deux.
  function setDecimal(key: keyof FormState, raw: string) {
    const digitsAndSep = raw.replace(/[^\d,.]/g, "");
    const sepIdx = digitsAndSep.search(/[,.]/);
    const cleaned =
      sepIdx === -1
        ? digitsAndSep
        : digitsAndSep.slice(0, sepIdx) +
          digitsAndSep[sepIdx] +
          digitsAndSep.slice(sepIdx + 1).replace(/[,.]/g, "").slice(0, 2);
    set(key, cleaned);
  }

  // parseDecimalInput tolere la virgule ET le point comme separateur
  // decimal (mission "surfaces decimales, formats de nombres..."),
  // necessaire des que les champs surface passent en saisie texte libre
  // pour accepter la virgule au clavier (type="number" natif la rejette).
  function numOrNull(key: (typeof NUMERIC_KEYS)[number]): number | null {
    return parseDecimalInput(form[key]);
  }

  // Telephone : seule la premiere section reste ouverte au chargement.
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767.98px)").matches) return;
    formRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details[data-admin-section]")
      .forEach((d, i) => {
        if (i > 0) d.open = false;
      });
  }, []);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateProperty(propertyId, {
          title_fr: form.title_fr,
          title_en: form.title_en,
          title_de: form.title_de,
          description_fr: form.description_fr,
          description_en: form.description_en,
          description_de: form.description_de,
          short_description_fr: form.short_description_fr,
          short_description_en: form.short_description_en,
          short_description_de: form.short_description_de,
          surface: numOrNull("surface"),
          living_surface: numOrNull("living_surface"),
          usable_surface: numOrNull("usable_surface"),
          land_surface: numOrNull("land_surface"),
          terrace_surface: numOrNull("terrace_surface"),
          balcony_surface: numOrNull("balcony_surface"),
          garden_surface: numOrNull("garden_surface"),
          kitchen_surface: numOrNull("kitchen_surface"),
          area_total: numOrNull("area_total"),
          bedrooms: numOrNull("bedrooms"),
          bathrooms: numOrNull("bathrooms"),
          douches: numOrNull("douches"),
          wc: numOrNull("wc"),
          bureaux: numOrNull("bureaux"),
          locaux_stockage: numOrNull("locaux_stockage"),
          floor: form.floor,
          has_laundry: form.has_laundry,
          has_dressing: form.has_dressing,
          has_pool: form.has_pool,
          parking: numOrNull("parking"),
          energy: form.energy,
          thermal: form.thermal,
          ges: form.ges,
          year: numOrNull("year"),
          year_built: numOrNull("year_built"),
          price: numOrNull("price"),
          price_on_demand: form.price_on_demand,
          price_min: numOrNull("price_min"),
          price_max: numOrNull("price_max"),
          amenities: form.amenities,
          current_use: form.current_use,
          potential_use: form.potential_use,
          status: form.status,
          badge: form.badge.length > 0 ? form.badge : null,
          badge_size: form.badge.length > 0 ? form.badge_size : null,
          badge_position: form.badge.length > 0 ? form.badge_position : null,
        });
        if (result.ok) {
          setFeedback(t("saved"));
          setBaseline(form);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("err_unknown"));
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={onSave} className="space-y-5">
      {dirty && (
        <div className="sticky top-16 z-10 md:top-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-sm">
          {t("unsaved_banner")}
        </div>
      )}

      <Section title={t("sec_descriptions")}>
        <div className="md:col-span-2" data-admin-translate>
          <button
            type="button"
            onClick={translateFromFrench}
            disabled={translating || (!form.title_fr.trim() && !form.description_fr.trim() && !form.short_description_fr.trim())}
            className="rounded-full border border-[#3D4F63]/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-50"
          >
            {translating ? t("translate_running") : t("translate_button")}
          </button>
          <p className="mt-1 text-xs text-[#3D4F63]/70">{t("translate_hint")}</p>
          {translateMsg && (
            <p role={translateMsg.ok ? "status" : "alert"} className={`mt-1 text-sm ${translateMsg.ok ? "text-emerald-800" : "text-red-700"}`}>
              {translateMsg.text}
            </p>
          )}
        </div>
        <Field label={t("f_title_fr")}>
          <input
            value={form.title_fr}
            onChange={(e) => set("title_fr", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("f_title_en")}>
          <input
            value={form.title_en}
            onChange={(e) => set("title_en", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("f_title_de")} full>
          <input
            value={form.title_de}
            onChange={(e) => set("title_de", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          label={t("f_description_fr")}
          hint={t("hint_description")}
          full
        >
          <RichTextEditor
            value={form.description_fr}
            onChange={(v) => set("description_fr", v)}
            placeholder={t("ph_description_fr")}
          />
        </Field>
        <Field label={t("f_description_en")} full>
          <RichTextEditor
            value={form.description_en}
            onChange={(v) => set("description_en", v)}
            placeholder={t("ph_description_en")}
          />
        </Field>
        <Field label={t("f_description_de")} full>
          <RichTextEditor
            value={form.description_de}
            onChange={(v) => set("description_de", v)}
            placeholder={t("ph_description_de")}
          />
        </Field>

        <Field
          label={t("f_short_fr")}
          hint={t("hint_short")}
        >
          <textarea
            rows={2}
            value={form.short_description_fr}
            onChange={(e) => set("short_description_fr", e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label={t("f_short_en")}>
          <textarea
            rows={2}
            value={form.short_description_en}
            onChange={(e) => set("short_description_en", e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label={t("f_short_de")} full>
          <textarea
            rows={2}
            value={form.short_description_de}
            onChange={(e) => set("short_description_de", e.target.value)}
            className={textareaCls}
          />
        </Field>
      </Section>

      <Section title={t("sec_surfaces")} hint={t("hint_surfaces")}>
        <Field label={t("f_surface")}>
          <input type="text" inputMode="decimal" value={form.surface} onChange={(e) => setDecimal("surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_living_surface")}>
          <input type="text" inputMode="decimal" value={form.living_surface} onChange={(e) => setDecimal("living_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_usable_surface")}>
          <input type="text" inputMode="decimal" value={form.usable_surface} onChange={(e) => setDecimal("usable_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_land_surface")}>
          <input type="text" inputMode="decimal" value={form.land_surface} onChange={(e) => setDecimal("land_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_terrace")}>
          <input type="text" inputMode="decimal" value={form.terrace_surface} onChange={(e) => setDecimal("terrace_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_balcony")}>
          <input type="text" inputMode="decimal" value={form.balcony_surface} onChange={(e) => setDecimal("balcony_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_garden")}>
          <input type="text" inputMode="decimal" value={form.garden_surface} onChange={(e) => setDecimal("garden_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_kitchen")}>
          <input type="text" inputMode="decimal" value={form.kitchen_surface} onChange={(e) => setDecimal("kitchen_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_area_total")}>
          <input type="number" min="0" step="0.1" value={form.area_total} onChange={(e) => set("area_total", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={t("sec_rooms")}>
        <Field label={t("f_bedrooms")}>
          <input type="number" min="0" step="1" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_bathrooms")}>
          <input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_showers")}>
          <input type="number" min="0" step="1" value={form.douches} onChange={(e) => set("douches", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_wc")}>
          <input type="number" min="0" step="1" value={form.wc} onChange={(e) => set("wc", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_offices")}>
          <input type="number" min="0" step="1" value={form.bureaux} onChange={(e) => set("bureaux", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_storage")}>
          <input type="number" min="0" step="1" value={form.locaux_stockage} onChange={(e) => set("locaux_stockage", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_floor")} hint={t("hint_floor")}>
          <input value={form.floor} onChange={(e) => set("floor", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={t("sec_equipment")}>
        <Field label={t("f_laundry")}>
          <CheckboxField label={t("present_f")} checked={form.has_laundry} onChange={(v) => set("has_laundry", v)} />
        </Field>
        <Field label={t("f_dressing")}>
          <CheckboxField label={t("present_m")} checked={form.has_dressing} onChange={(v) => set("has_dressing", v)} />
        </Field>
        <Field label={t("f_pool")}>
          <CheckboxField label={t("present_f")} checked={form.has_pool} onChange={(v) => set("has_pool", v)} />
        </Field>
        <Field label={t("f_parking")}>
          <input type="number" min="0" step="1" value={form.parking} onChange={(e) => set("parking", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={t("sec_energy")}>
        <Field label={t("f_energy")} hint={t("hint_energy")}>
          <input value={form.energy} onChange={(e) => set("energy", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_thermal")}>
          <input value={form.thermal} onChange={(e) => set("thermal", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_ges")}>
          <input value={form.ges} onChange={(e) => set("ges", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_year")}>
          <input type="number" min="1800" max="2100" step="1" value={form.year} onChange={(e) => set("year", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={t("section_price")}>
        <Field label={t("field_price")}>
          <input
            type="number"
            min="0"
            step="1000"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            disabled={form.price_on_demand}
            className={`${inputCls} disabled:opacity-50`}
          />
        </Field>
        <Field label={t("field_display")}>
          <CheckboxField label={t("price_on_demand")} checked={form.price_on_demand} onChange={(v) => set("price_on_demand", v)} />
        </Field>
        <Field label={t("f_price_min")} hint={t("hint_price_min")}>
          <input type="number" min="0" step="1000" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_price_max")}>
          <input type="number" min="0" step="1000" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={t("sec_amenities")}>
        <Field label={t("f_amenities")} hint={t("hint_amenities")} full>
          <textarea rows={4} value={form.amenities} onChange={(e) => set("amenities", e.target.value)} className={textareaCls} />
        </Field>
        <Field label={t("f_current_use")}>
          <input value={form.current_use} onChange={(e) => set("current_use", e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("f_potential_use")}>
          <input value={form.potential_use} onChange={(e) => set("potential_use", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section
        title={t("sec_status")}
        hint={t("hint_status")}
      >
        <Field label={t("field_status")} full>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t("sec_highlight")}>
        <Field label={t("f_badge")}>
          <select value={form.badge} onChange={(e) => set("badge", e.target.value)} className={inputCls}>
            <option value="">{t("badge_none")}</option>
            {BADGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("f_badge_size")}>
          <select
            value={form.badge_size}
            onChange={(e) => set("badge_size", e.target.value)}
            disabled={form.badge.length === 0}
            className={`${inputCls} disabled:opacity-50`}
          >
            {BADGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`size_${opt}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("f_badge_position")} full>
          <select
            value={form.badge_position}
            onChange={(e) => set("badge_position", e.target.value)}
            disabled={form.badge.length === 0}
            className={`${inputCls} disabled:opacity-50`}
          >
            {BADGE_POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Telephone : barre d'enregistrement collee en bas de l'ecran, au-dessus
          de la navigation (admin-mobile.css, data-admin-sticky-save). */}
      <div
        data-admin-sticky-save
        className="flex flex-wrap items-center gap-3 border-t border-[#3D4F63]/15 bg-bg pt-5 max-md:-mx-4 max-md:px-4 max-md:pb-3 max-md:pt-3 max-md:shadow-[0_-6px_16px_-10px_var(--color-ink)]"
      >
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#3D4F63] max-md:w-full max-md:py-3.5 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? t("saving") : t("save")}
        </button>
        {feedback && <span className="text-sm text-emerald-700">{feedback}</span>}
        {error && <span className="text-sm text-red-700">{t("error_prefix", { message: error })}</span>}
      </div>
    </form>
  );
}

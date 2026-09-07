"use client";

/**
 * PropertyEditForm — Sprint SAISIE-MANUELLE, étape B (formulaire complet).
 *
 * Édite l'intégralité des champs de contenu/caractéristiques d'un bien
 * classique (hors type/transaction/état, fixés à la création — cf.
 * PropertyCreateForm — et hors vidéo/photos, gérées par leurs propres
 * sections sur la page d'édition). Sections/Field calqués sur
 * OffmarketForm.tsx / PropertyCreateForm.tsx pour une UI cohérente,
 * lisible par un utilisateur non technique.
 *
 * Server Action : updateProperty (cf. app/admin/properties/actions.ts).
 * Un seul objet form state ; l'enregistrement envoie tous les champs en
 * une fois (pas de sauvegarde partielle par section).
 */

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { updateProperty } from "@/app/admin/properties/actions";

const BADGE_OPTIONS = [
  "Exclusivité",
  "Nouveau",
  "Nouveau prix",
  "Opportunité",
  "Investissement",
  "À découvrir",
] as const;
const BADGE_SIZE_OPTIONS = ["S", "M", "L"] as const;
const BADGE_POSITION_OPTIONS = [
  { value: "top-left", label: "Haut gauche" },
  { value: "top-right", label: "Haut droit" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-right", label: "Bas droit" },
] as const;
const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon (non visible publiquement)" },
  { value: "published", label: "Publié" },
  { value: "sold", label: "Vendu" },
  { value: "withdrawn", label: "Retiré" },
] as const;

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
  return (
    <div className="rounded-xl border border-[#3D4F63]/10 bg-[#F5EFE1]/30 p-5">
      <h3 className="font-display text-base font-bold text-[#3D4F63]">
        {title}
      </h3>
      {hint && <p className="mt-1 text-xs text-[#3D4F63]/60">{hint}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
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
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function numOrNull(key: (typeof NUMERIC_KEYS)[number]): number | null {
    const raw = form[key].trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }

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
          setFeedback("Enregistré.");
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  };

  return (
    <form onSubmit={onSave} className="space-y-5">
      <Section title="Descriptions">
        <Field label="Titre (FR)">
          <input
            value={form.title_fr}
            onChange={(e) => set("title_fr", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Titre (EN)">
          <input
            value={form.title_en}
            onChange={(e) => set("title_en", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Titre (DE)" full>
          <input
            value={form.title_de}
            onChange={(e) => set("title_de", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          label="Description complète (FR)"
          hint="Gras (B) pour les titres « Description : », « Prestations : »… ; italique (I) ; saut de ligne Maj+Entrée."
          full
        >
          <RichTextEditor
            value={form.description_fr}
            onChange={(v) => set("description_fr", v)}
            placeholder="Description complète du bien"
          />
        </Field>
        <Field label="Description complète (EN)" full>
          <RichTextEditor
            value={form.description_en}
            onChange={(v) => set("description_en", v)}
            placeholder="Full description (EN)"
          />
        </Field>
        <Field label="Description complète (DE)" full>
          <RichTextEditor
            value={form.description_de}
            onChange={(v) => set("description_de", v)}
            placeholder="Vollständige Beschreibung (DE)"
          />
        </Field>

        <Field
          label="Pitch court (FR)"
          hint="Teaser affiché en aperçu/carte, distinct de la description complète."
        >
          <textarea
            rows={2}
            value={form.short_description_fr}
            onChange={(e) => set("short_description_fr", e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label="Pitch court (EN)">
          <textarea
            rows={2}
            value={form.short_description_en}
            onChange={(e) => set("short_description_en", e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label="Pitch court (DE)" full>
          <textarea
            rows={2}
            value={form.short_description_de}
            onChange={(e) => set("short_description_de", e.target.value)}
            className={textareaCls}
          />
        </Field>
      </Section>

      <Section title="Surfaces" hint="Toutes en m² — laisser vide si non applicable.">
        <Field label="Surface (référence)">
          <input type="number" min="0" step="0.1" value={form.surface} onChange={(e) => set("surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Surface habitable">
          <input type="number" min="0" step="0.1" value={form.living_surface} onChange={(e) => set("living_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Surface utile">
          <input type="number" min="0" step="0.1" value={form.usable_surface} onChange={(e) => set("usable_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Surface terrain">
          <input type="number" min="0" step="0.1" value={form.land_surface} onChange={(e) => set("land_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Terrasse">
          <input type="number" min="0" step="0.1" value={form.terrace_surface} onChange={(e) => set("terrace_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Balcon">
          <input type="number" min="0" step="0.1" value={form.balcony_surface} onChange={(e) => set("balcony_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Jardin">
          <input type="number" min="0" step="0.1" value={form.garden_surface} onChange={(e) => set("garden_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Cuisine">
          <input type="number" min="0" step="0.1" value={form.kitchen_surface} onChange={(e) => set("kitchen_surface", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Surface totale (immeuble)">
          <input type="number" min="0" step="0.1" value={form.area_total} onChange={(e) => set("area_total", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Pièces">
        <Field label="Chambres">
          <input type="number" min="0" step="1" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Salles de bain">
          <input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Douches">
          <input type="number" min="0" step="1" value={form.douches} onChange={(e) => set("douches", e.target.value)} className={inputCls} />
        </Field>
        <Field label="WC">
          <input type="number" min="0" step="1" value={form.wc} onChange={(e) => set("wc", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bureaux">
          <input type="number" min="0" step="1" value={form.bureaux} onChange={(e) => set("bureaux", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Locaux de stockage">
          <input type="number" min="0" step="1" value={form.locaux_stockage} onChange={(e) => set("locaux_stockage", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Étage" hint='Texte libre, ex. "3ème étage" ou "RDC".'>
          <input value={form.floor} onChange={(e) => set("floor", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Équipements">
        <Field label="Buanderie">
          <CheckboxField label="Présente" checked={form.has_laundry} onChange={(v) => set("has_laundry", v)} />
        </Field>
        <Field label="Dressing">
          <CheckboxField label="Présent" checked={form.has_dressing} onChange={(v) => set("has_dressing", v)} />
        </Field>
        <Field label="Piscine">
          <CheckboxField label="Présente" checked={form.has_pool} onChange={(v) => set("has_pool", v)} />
        </Field>
        <Field label="Emplacements parking">
          <input type="number" min="0" step="1" value={form.parking} onChange={(e) => set("parking", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Énergie">
        <Field label="Classe énergétique (DPE)" hint='Ex. "A", "B"…'>
          <input value={form.energy} onChange={(e) => set("energy", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Isolation thermique">
          <input value={form.thermal} onChange={(e) => set("thermal", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Classe GES">
          <input value={form.ges} onChange={(e) => set("ges", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Année de construction">
          <input type="number" min="1800" max="2100" step="1" value={form.year} onChange={(e) => set("year", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Prix">
        <Field label="Prix (€)">
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
        <Field label="Affichage">
          <CheckboxField label="Prix sur demande" checked={form.price_on_demand} onChange={(v) => set("price_on_demand", v)} />
        </Field>
        <Field label="Prix minimum (fourchette)" hint="Facultatif — pour une communication en fourchette plutôt qu'un prix fixe.">
          <input type="number" min="0" step="1000" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Prix maximum (fourchette)">
          <input type="number" min="0" step="1000" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Prestations & usage">
        <Field label="Prestations" hint="Texte libre — une ligne par prestation, par exemple." full>
          <textarea rows={4} value={form.amenities} onChange={(e) => set("amenities", e.target.value)} className={textareaCls} />
        </Field>
        <Field label="Usage actuel">
          <input value={form.current_use} onChange={(e) => set("current_use", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Usage potentiel">
          <input value={form.potential_use} onChange={(e) => set("potential_use", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section
        title="Statut"
        hint="Publié rend le bien visible sur le site public ; les 3 autres statuts le masquent (même effet que dépublier)."
      >
        <Field label="Statut" full>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Mise en avant">
        <Field label="Badge">
          <select value={form.badge} onChange={(e) => set("badge", e.target.value)} className={inputCls}>
            <option value="">Aucun</option>
            {BADGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Taille">
          <select
            value={form.badge_size}
            onChange={(e) => set("badge_size", e.target.value)}
            disabled={form.badge.length === 0}
            className={`${inputCls} disabled:opacity-50`}
          >
            {BADGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Position" full>
          <select
            value={form.badge_position}
            onChange={(e) => set("badge_position", e.target.value)}
            disabled={form.badge.length === 0}
            className={`${inputCls} disabled:opacity-50`}
          >
            {BADGE_POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[#3D4F63]/15 pt-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {feedback && <span className="text-sm text-emerald-700">{feedback}</span>}
        {error && <span className="text-sm text-red-700">Erreur : {error}</span>}
      </div>
    </form>
  );
}

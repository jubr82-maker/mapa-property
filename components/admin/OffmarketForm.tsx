"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  OFFMARKET_STATUSES,
  OFFMARKET_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  IMMEUBLE_SUB_TYPES,
  IMMEUBLE_SUB_TYPE_LABELS,
  PROFESSIONAL_TYPES,
  RESIDENTIAL_TYPES,
  type OffmarketRow,
  type PropertyType,
  generateOffmarketReference,
} from "@/lib/admin/offmarket";
import {
  createOffmarket,
  updateOffmarket,
  uploadOffmarketPhotos,
  reorderOffmarketPhotos,
  deleteOffmarket,
} from "@/app/admin/offmarket/actions";

type Tab = "identity" | "location" | "specs" | "content";

const TABS: { id: Tab; label: string }[] = [
  { id: "identity", label: "Identification & Statut" },
  { id: "location", label: "Localisation" },
  { id: "specs", label: "Caractéristiques" },
  { id: "content", label: "Contenu & Visuel" },
];

export function OffmarketForm({
  row,
  mode,
}: {
  row: OffmarketRow | null;
  mode: "create" | "edit";
}) {
  const [tab, setTab] = useState<Tab>("identity");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>(
    (row?.property_type as PropertyType) || "maison",
  );

  const isImmeuble = propertyType === "immeuble";
  const isTerrain = propertyType === "terrain";
  const showProfessionalSurfaces = ["immeuble", "bureau", "commerce", "mixte"].includes(
    propertyType,
  );
  const showBedrooms = RESIDENTIAL_TYPES.includes(propertyType);
  const showBureaux = PROFESSIONAL_TYPES.includes(propertyType);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createOffmarket(formData)
            : row
              ? await updateOffmarket(row.id, formData)
              : null;
        if (result && !result.ok) {
          setError(result.error);
        }
      } catch (e) {
        // Ne pas masquer les exceptions internes Next (redirect / notFound) —
        // elles doivent remonter pour que Next gère la navigation.
        if (isNextInternalError(e)) throw e;
        setError(
          e instanceof Error
            ? `Erreur réseau : ${e.message}. Vérifie ta connexion et réessaie.`
            : "Erreur réseau inconnue. Vérifie ta connexion.",
        );
      }
    });
  };

  const ref = row?.reference ?? generateOffmarketReference();
  const photos =
    (row?.photo_urls as string[] | null) ??
    (row?.gallery_urls as string[] | null) ??
    [];

  return (
    <form action={submit} className="space-y-8">
      <input type="hidden" name="property_type" value={propertyType} />
      <nav className="flex flex-wrap gap-2 border-b border-[#3D4F63]/15 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
              tab === t.id
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "identity" && (
        <Section title="Identification & Statut">
          <Field label="Référence" hint="Auto-générée. Modifiable.">
            <input
              name="reference"
              defaultValue={ref}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Statut">
            <select
              name="status"
              defaultValue={row?.status ?? "draft"}
              className={inputCls}
            >
              {OFFMARKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {OFFMARKET_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de fin d'exclusivité">
            <input
              type="date"
              name="exclusive_until"
              defaultValue={row?.exclusive_until ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label="URL du mandat signé"
            hint="Lien Supabase Storage (PDF) — upload manuel pour l'instant."
          >
            <input
              name="signed_mandate_url"
              defaultValue={row?.signed_mandate_url ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
        </Section>
      )}

      {tab === "location" && (
        <Section title="Localisation">
          <Field label="Pays">
            <select name="country" defaultValue={row?.country ?? "LU"} className={inputCls}>
              <option value="LU">Luxembourg</option>
              <option value="BE">Belgique</option>
              <option value="FR">France</option>
              <option value="DE">Allemagne</option>
              <option value="CH">Suisse</option>
              <option value="MC">Monaco</option>
              <option value="PT">Portugal</option>
              <option value="ES">Espagne</option>
            </select>
          </Field>
          <Field label="Région" hint="Texte libre (canton, département…)">
            <input
              name="region"
              defaultValue={row?.region ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Ville réelle" hint="Visible uniquement après NDA signé.">
            <input
              name="city_real"
              defaultValue={row?.city_real ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label="Ville anonymisée"
            hint="Affichée publiquement, ex : « Confidentiel · Luxembourg »."
          >
            <input
              name="city_anonymized"
              defaultValue={row?.city_anonymized ?? row?.city_label ?? "Confidentiel · Luxembourg"}
              className={inputCls}
            />
          </Field>
        </Section>
      )}

      {tab === "specs" && (
        <div className="space-y-6">
          <Section title="Type">
            <Field label="Type principal">
              <select
                name="property_type_select"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className={inputCls}
                required
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            {isImmeuble && (
              <Field label="Sous-type d'immeuble">
                <select
                  name="sub_type"
                  defaultValue={row?.sub_type ?? "rapport"}
                  className={inputCls}
                >
                  {IMMEUBLE_SUB_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {IMMEUBLE_SUB_TYPE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Classe énergétique">
              <select
                name="classe_energetique"
                defaultValue={row?.classe_energetique ?? row?.energy_class ?? ""}
                className={inputCls}
              >
                <option value="">—</option>
                {["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Surfaces">
            {!isTerrain && (
              <Field label="Surface habitable (m²)">
                <input
                  name="surface_habitable"
                  type="number"
                  min="0"
                  defaultValue={row?.surface_habitable ?? row?.surface_hab ?? ""}
                  className={inputCls}
                />
              </Field>
            )}
            {showProfessionalSurfaces && (
              <>
                <Field label="Surface utile (m²)">
                  <input
                    name="surface_utile"
                    type="number"
                    min="0"
                    defaultValue={row?.surface_utile ?? ""}
                    className={inputCls}
                  />
                </Field>
                <Field label="Surface pondérée (m²)">
                  <input
                    name="surface_ponderee"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={row?.surface_ponderee ?? ""}
                    className={inputCls}
                  />
                </Field>
              </>
            )}
            <Field
              label="Surface terrain (m²)"
              hint={
                row?.surface_terrain
                  ? `= ${(row.surface_terrain / 100).toFixed(2)} ares`
                  : "1 are = 100 m²"
              }
            >
              <input
                name="surface_terrain"
                type="number"
                min="0"
                defaultValue={row?.surface_terrain ?? ""}
                className={inputCls}
              />
            </Field>
          </Section>

          {!isTerrain && (
            <Section title="Pièces">
              {showBedrooms && (
                <Field label="Chambres">
                  <input
                    name="chambres"
                    type="number"
                    min="0"
                    defaultValue={row?.chambres ?? row?.bedrooms ?? ""}
                    className={inputCls}
                  />
                </Field>
              )}
              {showBureaux && (
                <Field label="Bureaux">
                  <input
                    name="bureaux"
                    type="number"
                    min="0"
                    defaultValue={row?.bureaux ?? ""}
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label="Salles de bain">
                <input
                  name="salles_de_bain"
                  type="number"
                  min="0"
                  defaultValue={row?.salles_de_bain ?? row?.bathrooms ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Salles de douche">
                <input
                  name="douches"
                  type="number"
                  min="0"
                  defaultValue={row?.douches ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="WC séparés">
                <input
                  name="wc"
                  type="number"
                  min="0"
                  defaultValue={row?.wc ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Locaux de stockage">
                <input
                  name="locaux_stockage"
                  type="number"
                  min="0"
                  defaultValue={row?.locaux_stockage ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Buanderie">
                <Toggle name="buanderie" defaultChecked={!!row?.buanderie} />
              </Field>
              <Field label="Dressing">
                <Toggle name="dressing" defaultChecked={!!row?.dressing} />
              </Field>
              <Field label="Cuisine">
                <Toggle name="cuisine" defaultChecked={!!row?.cuisine} />
              </Field>
              <Field label="Cuisine — surface (m²)">
                <input
                  name="cuisine_m2"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={row?.cuisine_m2 ?? ""}
                  className={inputCls}
                />
              </Field>
            </Section>
          )}

          <Section title="Extérieurs">
            <Field label="Terrasse — surface (m²)">
              <input
                name="terrasse_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.terrasse_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Balcon — surface (m²)">
              <input
                name="balcon_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.balcon_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Jardin — surface (m²)">
              <input
                name="jardin_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.jardin_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Piscine">
              <Toggle name="has_piscine" defaultChecked={!!row?.has_piscine} />
            </Field>
          </Section>

          <Section title="Stationnement">
            <Field label="Parking extérieur">
              <input
                name="parking_exterieur"
                type="number"
                min="0"
                defaultValue={row?.parking_exterieur ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Parking intérieur">
              <input
                name="parking_interieur"
                type="number"
                min="0"
                defaultValue={row?.parking_interieur ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Box">
              <input
                name="box"
                type="number"
                min="0"
                defaultValue={row?.box ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Garage">
              <input
                name="garage"
                type="number"
                min="0"
                defaultValue={row?.garage ?? ""}
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="Prestations libres">
            <div className="md:col-span-2">
              <Field
                label="Prestations (tags libres)"
                hint="Séparées par des virgules ou retours à la ligne."
              >
                <textarea
                  name="prestations"
                  rows={3}
                  defaultValue={(row?.prestations ?? row?.highlights ?? []).join(", ")}
                  className={inputCls + " font-sans"}
                  placeholder="Ascenseur, Cave, Cheminée, Vue dégagée…"
                />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-6">
          <Section title="Contenu rédactionnel">
            <Field label="Titre">
              <input
                name="title"
                defaultValue={row?.title ?? ""}
                required
                className={inputCls}
              />
            </Field>
            <Field
              label="Description courte"
              hint="Aperçu public — 200 caractères max."
            >
              <textarea
                name="short_description"
                rows={3}
                maxLength={200}
                defaultValue={row?.short_description ?? row?.short_pitch ?? ""}
                className={inputCls + " font-sans"}
              />
            </Field>
            <div className="md:col-span-2">
              <Field
                label="Description complète"
                hint="Accessible après NDA signé."
              >
                <textarea
                  name="full_description"
                  rows={6}
                  defaultValue={row?.full_description ?? row?.description ?? ""}
                  className={inputCls + " font-sans"}
                />
              </Field>
            </div>
          </Section>

          <PriceSection row={row} />

          <Section title="Composition de l'immeuble" >
            <div className="md:col-span-2">
              <p className="text-sm text-[#3D4F63]/70">
                Détaillez la composition uniquement si le bien est de type
                Immeuble (rapport / mixte / bureaux / commercial / habitation).
                Les totaux sont affichés au visiteur publiquement ; le détail
                ne s&apos;ouvre qu&apos;après NDA.
              </p>
              <CompositionEditor
                defaultCommerces={(row?.composition_commerces as CommerceRow[]) ?? []}
                defaultBureaux={(row?.composition_bureaux as BureauRow[]) ?? []}
                defaultLogements={(row?.composition_logements as LogementRow[]) ?? []}
              />
            </div>
          </Section>

          <Section title="Diffusion publique">
            <Field
              label="Position dans la liste (1 = premier affiché)"
              hint="Plus le chiffre est bas, plus le bien apparaît haut dans la liste publique. Laisse 100 si tu veux qu'il soit en ordre neutre."
            >
              <input
                name="display_order"
                type="number"
                min="1"
                defaultValue={row?.display_order ?? 100}
                className={inputCls}
              />
            </Field>
            <Field label="Coup de cœur (apparaît sur la home)">
              <Toggle name="is_coup_de_coeur" defaultChecked={!!row?.is_coup_de_coeur} />
            </Field>
            <Field label="Verrouiller les photos">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="photos_locked"
                  defaultChecked={row?.photos_locked ?? true}
                  className="size-4 rounded border-[#3D4F63]/30 accent-[#B8865A]"
                />
                <span>Cadenas même après NDA</span>
              </label>
            </Field>
          </Section>

          {mode === "edit" && row && (
            <Section title="Photos">
              <div className="md:col-span-2">
                <PhotosManager id={row.id} photos={photos} />
              </div>
            </Section>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3D4F63]/15 pt-6">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : mode === "create" ? "Créer le bien" : "Enregistrer"}
          </button>
          {mode === "edit" && row && (
            <Link
              href={`/fr/off-market/${row.id}`}
              target="_blank"
              className="rounded-full border border-[#3D4F63]/20 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
            >
              Aperçu public ↗
            </Link>
          )}
        </div>
        {mode === "edit" && row && (
          <DeleteButton id={row.id} />
        )}
      </footer>
    </form>
  );
}

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#B8865A] focus:outline-none";

// ─── Prix : 4 modes d'affichage ────────────────────────────────────────────
type PriceMode = "exact" | "range" | "custom" | "on_request";

function PriceSection({ row }: { row: OffmarketRow | null }) {
  const initial: PriceMode = (row?.price_mode as PriceMode) ||
    (row?.price_estimate ? "exact" : "on_request");
  const [mode, setMode] = useState<PriceMode>(initial);

  return (
    <Section title="Prix">
      <div className="md:col-span-2">
        <Field label="Mode d'affichage du prix">
          <select
            name="price_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PriceMode)}
            className={inputCls}
          >
            <option value="exact">Afficher le prix exact</option>
            <option value="range">Afficher une fourchette</option>
            <option value="custom">Texte personnalisé</option>
            <option value="on_request">Sur demande</option>
          </select>
        </Field>
      </div>

      {mode === "exact" && (
        <Field
          label="Prix exact (€)"
          hint="Affiché publiquement formaté en euros."
        >
          <input
            name="price_estimate"
            type="number"
            min="0"
            step="1000"
            defaultValue={row?.price_estimate ?? ""}
            className={inputCls}
          />
        </Field>
      )}

      {mode === "range" && (
        <>
          <Field label="Prix min (€)">
            <input
              name="price_min"
              type="number"
              min="0"
              step="1000"
              defaultValue={row?.price_min ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Prix max (€)">
            <input
              name="price_max"
              type="number"
              min="0"
              step="1000"
              defaultValue={row?.price_max ?? ""}
              className={inputCls}
            />
          </Field>
        </>
      )}

      {mode === "custom" && (
        <div className="md:col-span-2">
          <Field
            label="Texte personnalisé"
            hint="Exemple : « À partir de 4,5 M€ »"
          >
            <input
              name="price_custom_text"
              defaultValue={row?.price_custom_text ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {/* Champ caché toujours présent pour preserver la valeur DB privée */}
      {mode !== "exact" && row?.price_estimate != null && (
        <input type="hidden" name="price_estimate" value={row.price_estimate} />
      )}
    </Section>
  );
}

// ─── Composition immeuble (3 arrays JSONB) ────────────────────────────────
type CommerceRow = {
  nom: string;
  surface_m2: number;
  type: "restauration" | "retail" | "services" | "autre";
};

type BureauRow = {
  etage: string;
  surface_m2: number;
  type: "plateau_ouvert" | "bureaux_separes" | "mixte";
};

type LogementRow = {
  etage: string;
  surface_m2: number;
  chambres: number;
  type: "T1" | "T2" | "T3" | "T4" | "T5+" | "studio";
};

function CompositionEditor({
  defaultCommerces,
  defaultBureaux,
  defaultLogements,
}: {
  defaultCommerces: CommerceRow[];
  defaultBureaux: BureauRow[];
  defaultLogements: LogementRow[];
}) {
  const [commerces, setCommerces] = useState<CommerceRow[]>(defaultCommerces);
  const [bureaux, setBureaux] = useState<BureauRow[]>(defaultBureaux);
  const [logements, setLogements] = useState<LogementRow[]>(defaultLogements);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-3">
      <CollapsibleTable
        title="Commerces"
        count={commerces.length}
        open={openSection === "commerces"}
        onToggle={() =>
          setOpenSection(openSection === "commerces" ? null : "commerces")
        }
      >
        <CommercesTable rows={commerces} setRows={setCommerces} />
      </CollapsibleTable>
      <CollapsibleTable
        title="Bureaux"
        count={bureaux.length}
        open={openSection === "bureaux"}
        onToggle={() =>
          setOpenSection(openSection === "bureaux" ? null : "bureaux")
        }
      >
        <BureauxTable rows={bureaux} setRows={setBureaux} />
      </CollapsibleTable>
      <CollapsibleTable
        title="Logements"
        count={logements.length}
        open={openSection === "logements"}
        onToggle={() =>
          setOpenSection(openSection === "logements" ? null : "logements")
        }
      >
        <LogementsTable rows={logements} setRows={setLogements} />
      </CollapsibleTable>

      <input type="hidden" name="composition_commerces" value={JSON.stringify(commerces)} />
      <input type="hidden" name="composition_bureaux" value={JSON.stringify(bureaux)} />
      <input type="hidden" name="composition_logements" value={JSON.stringify(logements)} />
    </div>
  );
}

function CollapsibleTable({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#3D4F63]/15 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-display text-base font-bold text-[#3D4F63]">
          {title}{" "}
          <span className="ml-2 font-mono text-[10px] text-[#3D4F63]/60">
            ({count})
          </span>
        </span>
        <span className="font-mono text-xs text-[#3D4F63]/60">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && <div className="border-t border-[#3D4F63]/10 p-4">{children}</div>}
    </div>
  );
}

function CommercesTable({
  rows,
  setRows,
}: {
  rows: CommerceRow[];
  setRows: (r: CommerceRow[]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2 text-right">Surface (m²)</th>
            <th className="px-3 py-2">Type</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[#3D4F63]/10">
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={r.nom}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)))
                  }
                  className={inputCls + " py-1"}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.surface_m2}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, surface_m2: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1 text-right"}
                />
              </td>
              <td className="px-3 py-2">
                <select
                  value={r.type}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as CommerceRow["type"] } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1"}
                >
                  <option value="restauration">Restauration</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                  <option value="autre">Autre</option>
                </select>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() =>
          setRows([
            ...rows,
            { nom: "", surface_m2: 0, type: "retail" as CommerceRow["type"] },
          ])
        }
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
      >
        + Ajouter un commerce
      </button>
    </div>
  );
}

function BureauxTable({
  rows,
  setRows,
}: {
  rows: BureauRow[];
  setRows: (r: BureauRow[]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">Étage</th>
            <th className="px-3 py-2 text-right">Surface (m²)</th>
            <th className="px-3 py-2">Type</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[#3D4F63]/10">
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={r.etage}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, etage: e.target.value } : x)))
                  }
                  className={inputCls + " py-1"}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.surface_m2}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, surface_m2: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1 text-right"}
                />
              </td>
              <td className="px-3 py-2">
                <select
                  value={r.type}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as BureauRow["type"] } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1"}
                >
                  <option value="plateau_ouvert">Plateau ouvert</option>
                  <option value="bureaux_separes">Bureaux séparés</option>
                  <option value="mixte">Mixte</option>
                </select>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() =>
          setRows([...rows, { etage: "", surface_m2: 0, type: "plateau_ouvert" }])
        }
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
      >
        + Ajouter un plateau de bureaux
      </button>
    </div>
  );
}

function LogementsTable({
  rows,
  setRows,
}: {
  rows: LogementRow[];
  setRows: (r: LogementRow[]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">Étage</th>
            <th className="px-3 py-2 text-right">Surface (m²)</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2 text-right">Chambres</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[#3D4F63]/10">
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={r.etage}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, etage: e.target.value } : x)))
                  }
                  className={inputCls + " py-1"}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.surface_m2}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, surface_m2: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1 text-right"}
                />
              </td>
              <td className="px-3 py-2">
                <select
                  value={r.type}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as LogementRow["type"] } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1"}
                >
                  {(["studio", "T1", "T2", "T3", "T4", "T5+"] as const).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  value={r.chambres}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, chambres: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                  className={inputCls + " py-1 text-right"}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() =>
          setRows([
            ...rows,
            { etage: "", surface_m2: 0, type: "T2", chambres: 1 },
          ])
        }
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
      >
        + Ajouter un logement
      </button>
    </div>
  );
}

function Toggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-[#3D4F63]/30 accent-[#B8865A]"
      />
      <span className="text-sm text-[#3D4F63]/80">Activé</span>
    </label>
  );
}

function isNextInternalError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-[#3D4F63]/60">{hint}</span>}
    </label>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [busy, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!confirm("Supprimer ce bien off-market ? Cette action est irréversible.")) return;
        startTransition(async () => {
          try {
            await deleteOffmarket(id);
          } catch (e) {
            if (isNextInternalError(e)) throw e;
            console.error(e);
          }
        });
      }}
      className="rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "…" : "Supprimer"}
    </button>
  );
}

function PhotosManager({ id, photos }: { id: string; photos: string[] }) {
  const [list, setList] = useState(photos);
  const [busy, startTransition] = useTransition();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("photos", f));
    startTransition(async () => {
      await uploadOffmarketPhotos(id, fd);
    });
    e.target.value = "";
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...list];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    startTransition(async () => {
      await reorderOffmarketPhotos(id, next);
    });
  };

  const remove = (url: string) => {
    const next = list.filter((u) => u !== url);
    setList(next);
    startTransition(async () => {
      await reorderOffmarketPhotos(id, next);
    });
  };

  return (
    <div className="mt-3 space-y-4">
      <label className="block rounded-xl border-2 border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-center hover:border-[#B8865A]">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onUpload}
          className="hidden"
        />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]">
          {busy ? "Upload en cours…" : "Cliquer pour ajouter des photos"}
        </p>
        <p className="mt-1 text-xs text-[#3D4F63]/60">JPG/PNG/WebP — la première sert de cover.</p>
      </label>

      {list.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((url, i) => (
            <li key={url} className="group relative overflow-hidden rounded-xl border border-[#3D4F63]/15 bg-white">
              <div className="relative aspect-[4/3]">
                <Image src={url} alt={`Photo ${i + 1}`} fill sizes="220px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#B8865A] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.15em]">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    className="rounded border border-[#3D4F63]/20 px-2 py-1 hover:border-[#B8865A] disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === list.length - 1 || busy}
                    className="rounded border border-[#3D4F63]/20 px-2 py-1 hover:border-[#B8865A] disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

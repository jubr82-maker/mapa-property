"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  OFFMARKET_STATUSES,
  OFFMARKET_TRANSACTIONS,
  PROPERTY_TYPES,
  IMMEUBLE_SUB_TYPES,
  PROFESSIONAL_TYPES,
  RESIDENTIAL_TYPES,
  type OffmarketRow,
  type PropertyType,
  generateOffmarketReference,
} from "@/lib/admin/offmarket";
import {
  createOffmarket,
  updateOffmarket,
  deleteOffmarket,
} from "@/app/admin/offmarket/actions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

type Tab = "location" | "specs" | "content" | "identity";

const TABS: Tab[] = ["location", "specs", "content", "identity"];

const COUNTRIES = ["LU", "BE", "FR", "DE", "CH", "MC", "PT", "ES"] as const;

export function OffmarketForm({
  row,
  mode,
}: {
  row: OffmarketRow | null;
  mode: "create" | "edit";
}) {
  const t = useTranslations("admin_offmarket");
  const [tab, setTab] = useState<Tab>(mode === "create" ? "location" : "identity");
  // En création : on commence par Localisation (étapes 1 à 4).
  // En édition : on ouvre sur Identification pour passer de brouillon à publié rapidement.
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>(
    (row?.property_type as PropertyType) || "maison",
  );
  // POL4-A1 (ELISE) : éditeur formaté TipTap pour la description complète.
  // State contrôlé + hidden input `full_description` pour rétrocompat de la
  // server action (createOffmarket/updateOffmarket lit formData.get).
  const [fullDescription, setFullDescription] = useState<string>(
    row?.full_description ?? row?.description ?? "",
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
        // Ne pas masquer les exceptions internes Next (redirect / notFound) :
        // elles doivent remonter pour que Next gère la navigation.
        if (isNextInternalError(e)) throw e;
        setError(
          e instanceof Error
            ? t("form.networkError", { message: e.message })
            : t("form.networkErrorUnknown"),
        );
      }
    });
  };

  const ref = row?.reference ?? generateOffmarketReference();

  return (
    <form action={submit} className="space-y-8">
      <input type="hidden" name="property_type" value={propertyType} />
      <nav className="flex flex-wrap gap-2 border-b border-[#3D4F63]/15 pb-3">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
              tab === id
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
            }`}
          >
            {t(`form.tab_${id}`)}
          </button>
        ))}
      </nav>

      {tab === "identity" && (
        <Section title={t("form.section_identity")}>
          <div className="md:col-span-2">
            <PublishGuard row={row} mode={mode} />
          </div>
          <Field label={t("form.reference")} hint={t("form.referenceHint")}>
            <input
              name="reference"
              defaultValue={ref}
              required
              readOnly={mode === "edit"}
              className={inputCls + (mode === "edit" ? " bg-[#F5EFE1] cursor-not-allowed" : "")}
            />
          </Field>
          <Field
            label={t("form.status")}
            hint={
              mode === "create"
                ? t("form.statusHintCreate")
                : t("form.statusHintEdit")
            }
          >
            <select
              name="status"
              defaultValue={mode === "create" ? "draft" : (row?.status ?? "draft")}
              disabled={mode === "create"}
              className={inputCls + (mode === "create" ? " bg-[#F5EFE1] cursor-not-allowed" : "")}
            >
              {OFFMARKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("form.exclusiveUntil")}>
            <input
              type="date"
              name="exclusive_until"
              defaultValue={row?.exclusive_until ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label={t("form.signedMandate")}
            hint={t("form.signedMandateHint")}
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
        <Section title={t("form.section_location")}>
          <Field label={t("form.country")}>
            <select name="country" defaultValue={row?.country ?? "LU"} className={inputCls}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {t(`country.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("form.region")} hint={t("form.regionHint")}>
            <input
              name="region"
              defaultValue={row?.region ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={t("form.cityReal")} hint={t("form.cityRealHint")}>
            <input
              name="city_real"
              defaultValue={row?.city_real ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label={t("form.cityAnonymized")}
            hint={t("form.cityAnonymizedHint")}
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
          <Section title={t("form.section_type")}>
            <Field label={t("form.mainType")}>
              <select
                name="property_type_select"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className={inputCls}
                required
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {t(`propertyType.${pt}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("form.transaction")}>
              <select
                name="transaction"
                defaultValue={row?.transaction ?? "sale"}
                className={inputCls}
                required
              >
                {OFFMARKET_TRANSACTIONS.map((tx) => (
                  <option key={tx} value={tx}>
                    {t(`transaction.${tx}`)}
                  </option>
                ))}
              </select>
            </Field>
            {isImmeuble && (
              <Field label={t("form.subType")}>
                <select
                  name="sub_type"
                  defaultValue={row?.sub_type ?? "rapport"}
                  className={inputCls}
                >
                  {IMMEUBLE_SUB_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {t(`immeubleSubType.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t("form.energyClass")}>
              <select
                name="classe_energetique"
                defaultValue={row?.classe_energetique ?? row?.energy_class ?? ""}
                className={inputCls}
              >
                <option value="">{t("form.energyNone")}</option>
                {["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title={t("form.section_surfaces")}>
            {!isTerrain && (
              <Field label={t("form.surfaceLiving")}>
                <input
                  name="surface_habitable"
                  type="text"
                  inputMode="decimal"
                  defaultValue={row?.surface_habitable ?? row?.surface_hab ?? ""}
                  className={inputCls}
                />
              </Field>
            )}
            {showProfessionalSurfaces && (
              <>
                <Field label={t("form.surfaceUseful")}>
                  <input
                    name="surface_utile"
                    type="text"
                    inputMode="decimal"
                    defaultValue={row?.surface_utile ?? ""}
                    className={inputCls}
                  />
                </Field>
                <Field label={t("form.surfaceWeighted")}>
                  <input
                    name="surface_ponderee"
                    type="text"
                    inputMode="decimal"
                    defaultValue={row?.surface_ponderee ?? ""}
                    className={inputCls}
                  />
                </Field>
              </>
            )}
            <Field
              label={t("form.surfaceLand")}
              hint={
                row?.surface_terrain
                  ? t("form.surfaceLandAres", { ares: (row.surface_terrain / 100).toFixed(2) })
                  : t("form.surfaceLandHint")
              }
            >
              <input
                name="surface_terrain"
                type="text"
                inputMode="decimal"
                defaultValue={row?.surface_terrain ?? ""}
                className={inputCls}
              />
            </Field>
          </Section>

          {!isTerrain && (
            <Section title={t("form.section_rooms")}>
              {showBedrooms && (
                <Field label={t("form.bedrooms")}>
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
                <Field label={t("form.offices")}>
                  <input
                    name="bureaux"
                    type="number"
                    min="0"
                    defaultValue={row?.bureaux ?? ""}
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label={t("form.bathrooms")}>
                <input
                  name="salles_de_bain"
                  type="number"
                  min="0"
                  defaultValue={row?.salles_de_bain ?? row?.bathrooms ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={t("form.showers")}>
                <input
                  name="douches"
                  type="number"
                  min="0"
                  defaultValue={row?.douches ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={t("form.wc")}>
                <input
                  name="wc"
                  type="number"
                  min="0"
                  defaultValue={row?.wc ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={t("form.storage")}>
                <input
                  name="locaux_stockage"
                  type="number"
                  min="0"
                  defaultValue={row?.locaux_stockage ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={t("form.laundry")}>
                <Toggle name="buanderie" defaultChecked={!!row?.buanderie} />
              </Field>
              <Field label={t("form.dressing")}>
                <Toggle name="dressing" defaultChecked={!!row?.dressing} />
              </Field>
              <Field label={t("form.kitchen")}>
                <Toggle name="cuisine" defaultChecked={!!row?.cuisine} />
              </Field>
              <Field label={t("form.kitchenSurface")}>
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

          <Section title={t("form.section_outdoor")}>
            <Field label={t("form.terraceSurface")}>
              <input
                name="terrasse_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.terrasse_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.balconySurface")}>
              <input
                name="balcon_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.balcon_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.gardenSurface")}>
              <input
                name="jardin_m2"
                type="number"
                min="0"
                step="0.01"
                defaultValue={row?.jardin_m2 ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.pool")}>
              <Toggle name="has_piscine" defaultChecked={!!row?.has_piscine} />
            </Field>
          </Section>

          <Section title={t("form.section_parking")}>
            <Field label={t("form.parkingOutdoor")}>
              <input
                name="parking_exterieur"
                type="number"
                min="0"
                defaultValue={row?.parking_exterieur ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.parkingIndoor")}>
              <input
                name="parking_interieur"
                type="number"
                min="0"
                defaultValue={row?.parking_interieur ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.box")}>
              <input
                name="box"
                type="number"
                min="0"
                defaultValue={row?.box ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.garage")}>
              <input
                name="garage"
                type="number"
                min="0"
                defaultValue={row?.garage ?? ""}
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title={t("form.section_amenities")}>
            <div className="md:col-span-2">
              <Field
                label={t("form.amenities")}
                hint={t("form.amenitiesHint")}
              >
                <textarea
                  name="prestations"
                  rows={3}
                  defaultValue={(row?.prestations ?? row?.highlights ?? []).join(", ")}
                  className={inputCls + " font-sans"}
                  placeholder={t("form.amenitiesPlaceholder")}
                />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-6">
          <Section title={t("form.section_content")}>
            <Field label={t("form.title")}>
              <input
                name="title"
                defaultValue={row?.title ?? ""}
                required
                className={inputCls}
              />
            </Field>
            <Field
              label={t("form.shortDescription")}
              hint={t("form.shortDescriptionHint")}
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
                label={t("form.fullDescription")}
                hint={t("form.fullDescriptionHint")}
              >
                {/* Éditeur formaté (gras, italique et sauts de ligne
                    uniquement). Le champ caché `full_description` soumet
                    le HTML à l'action serveur existante. */}
                <RichTextEditor
                  value={fullDescription}
                  onChange={setFullDescription}
                  placeholder={t("form.fullDescriptionPlaceholder")}
                />
                <input
                  type="hidden"
                  name="full_description"
                  value={fullDescription}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              {/* Champ URL de la vidéo de présentation. */}
              <Field
                label={t("form.videoUrl")}
                hint={t("form.videoUrlHint")}
              >
                <input
                  name="video_url"
                  type="url"
                  defaultValue={
                    (row as { video_url?: string | null } | null)?.video_url ??
                    ""
                  }
                  placeholder={t("form.videoUrlPlaceholder")}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          <PriceSection row={row} />

          <Section title={t("form.section_composition")}>
            <div className="md:col-span-2">
              <p className="text-sm text-[#3D4F63]/70">
                {t("form.compositionIntro")}
              </p>
              <CompositionEditor
                defaultCommerces={(row?.composition_commerces as CommerceRow[]) ?? []}
                defaultBureaux={(row?.composition_bureaux as BureauRow[]) ?? []}
                defaultLogements={(row?.composition_logements as LogementRow[]) ?? []}
              />
            </div>
          </Section>

          <Section title={t("form.section_public")}>
            <Field
              label={t("form.displayOrder")}
              hint={t("form.displayOrderHint")}
            >
              <input
                name="display_order"
                type="number"
                min="1"
                defaultValue={row?.display_order ?? 100}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.favorite")}>
              <Toggle name="is_coup_de_coeur" defaultChecked={!!row?.is_coup_de_coeur} />
            </Field>
            <Field label={t("form.lockPhotos")}>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="photos_locked"
                  defaultChecked={row?.photos_locked ?? true}
                  className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
                />
                <span>{t("form.lockPhotosHint")}</span>
              </label>
            </Field>
          </Section>
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
            className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
          >
            {busy ? t("form.saving") : mode === "create" ? t("form.create") : t("form.save")}
          </button>
          {mode === "edit" && row && (
            <Link
              href={`/fr/off-market/${row.id}`}
              target="_blank"
              className="rounded-full border border-[#3D4F63]/20 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
            >
              {t("form.publicPreview")} ↗
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
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";

// ─── Prix : 4 modes d'affichage ────────────────────────────────────────────
type PriceMode = "exact" | "range" | "custom" | "on_request" | "on_demand";

function PriceSection({ row }: { row: OffmarketRow | null }) {
  const t = useTranslations("admin_offmarket");
  const initial: PriceMode = (row?.price_mode as PriceMode) ||
    (row?.price_estimate ? "exact" : "on_request");
  const [mode, setMode] = useState<PriceMode>(initial);
  // Drapeau "Prix sur demande" (masque le prix public). Lu de façon
  // tolérante (colonne éventuellement absente), défaut false.
  const initialOnDemand =
    (row as { price_on_demand?: boolean | null } | null)?.price_on_demand ===
      true || (row?.price_mode as string | null) === "on_demand";
  const [priceOnDemand, setPriceOnDemand] = useState(initialOnDemand);

  // La case « Prix sur demande » pilote AUSSI price_mode.
  //   cochée   : price_on_demand=true,  price_mode='on_demand'
  //   décochée : price_on_demand=false, price_mode='exact'
  //              (sauf si déjà 'range' : on conserve 'range')
  function handleOnDemandChange(checked: boolean) {
    setPriceOnDemand(checked);
    if (checked) {
      setMode("on_demand");
    } else {
      setMode((prev) => (prev === "range" ? "range" : "exact"));
    }
  }

  return (
    <Section title={t("form.section_price")}>
      <div className="md:col-span-2">
        {/* Sentinelle toujours soumise : permet à l'action de distinguer
            "formulaire soumis depuis cet onglet, case décochée" (false)
            d'un onglet jamais monté (valeur en base conservée). */}
        <input type="hidden" name="price_on_demand_present" value="1" />
        <label className="flex items-start gap-3 rounded-md border border-[#3D4F63]/20 bg-[#F5EFE1]/40 px-3 py-3">
          <input
            type="checkbox"
            name="price_on_demand"
            checked={priceOnDemand}
            onChange={(e) => handleOnDemandChange(e.target.checked)}
            className="mt-0.5 size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
          />
          <span className="text-sm leading-snug text-[#1A1F2A]">
            <span className="font-semibold">
              {t("form.priceOnDemand")}
            </span>
            <span className="mt-0.5 block text-xs text-[#3D4F63]/70">
              {t("form.priceOnDemandHint")}
            </span>
          </span>
        </label>
      </div>
      {priceOnDemand ? (
        // Case cochée : price_mode='on_demand' soumis en dur.
        // Le sélecteur de mode est masqué (le prix est de toute façon
        // entièrement masqué publiquement).
        <input type="hidden" name="price_mode" value="on_demand" />
      ) : (
        <div className="md:col-span-2">
          <Field label={t("form.priceMode")}>
            <select
              name="price_mode"
              value={mode === "on_demand" ? "exact" : mode}
              onChange={(e) => setMode(e.target.value as PriceMode)}
              className={inputCls}
            >
              <option value="exact">{t("form.priceMode_exact")}</option>
              <option value="range">{t("form.priceMode_range")}</option>
              <option value="custom">{t("form.priceMode_custom")}</option>
              <option value="on_request">{t("form.priceMode_on_request")}</option>
            </select>
          </Field>
        </div>
      )}

      {mode === "exact" && (
        <Field
          label={t("form.priceExact")}
          hint={t("form.priceExactHint")}
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
          <Field label={t("form.priceMin")}>
            <input
              name="price_min"
              type="number"
              min="0"
              step="1000"
              defaultValue={row?.price_min ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={t("form.priceMax")}>
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
            label={t("form.priceCustom")}
            hint={t("form.priceCustomHint")}
          >
            <input
              name="price_custom_text"
              defaultValue={row?.price_custom_text ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {/* Champ caché toujours présent pour préserver la valeur privée en base */}
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
  const t = useTranslations("admin_offmarket");

  return (
    <div className="mt-4 space-y-3">
      <CollapsibleTable
        title={t("form.compo_commerces")}
        count={commerces.length}
        open={openSection === "commerces"}
        onToggle={() =>
          setOpenSection(openSection === "commerces" ? null : "commerces")
        }
      >
        <CommercesTable rows={commerces} setRows={setCommerces} />
      </CollapsibleTable>
      <CollapsibleTable
        title={t("form.compo_offices")}
        count={bureaux.length}
        open={openSection === "bureaux"}
        onToggle={() =>
          setOpenSection(openSection === "bureaux" ? null : "bureaux")
        }
      >
        <BureauxTable rows={bureaux} setRows={setBureaux} />
      </CollapsibleTable>
      <CollapsibleTable
        title={t("form.compo_dwellings")}
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
  const t = useTranslations("admin_offmarket");
  return (
    <div className="overflow-x-auto">
      <table data-card-all className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">{t("form.compo_name")}</th>
            <th className="px-3 py-2 text-right">{t("form.compo_surface")}</th>
            <th className="px-3 py-2">{t("form.compo_type")}</th>
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
                  <option value="restauration">{t("form.commerce_restauration")}</option>
                  <option value="retail">{t("form.commerce_retail")}</option>
                  <option value="services">{t("form.commerce_services")}</option>
                  <option value="autre">{t("form.commerce_autre")}</option>
                </select>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  aria-label={t("form.compo_remove")}
                  title={t("form.compo_remove")}
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
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
      >
        + {t("form.compo_addCommerce")}
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
  const t = useTranslations("admin_offmarket");
  return (
    <div className="overflow-x-auto">
      <table data-card-all className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">{t("form.compo_floor")}</th>
            <th className="px-3 py-2 text-right">{t("form.compo_surface")}</th>
            <th className="px-3 py-2">{t("form.compo_type")}</th>
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
                  <option value="plateau_ouvert">{t("form.office_plateau_ouvert")}</option>
                  <option value="bureaux_separes">{t("form.office_bureaux_separes")}</option>
                  <option value="mixte">{t("form.office_mixte")}</option>
                </select>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  aria-label={t("form.compo_remove")}
                  title={t("form.compo_remove")}
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
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
      >
        + {t("form.compo_addOffice")}
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
  const t = useTranslations("admin_offmarket");
  return (
    <div className="overflow-x-auto">
      <table data-card-all className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          <tr>
            <th className="px-3 py-2">{t("form.compo_floor")}</th>
            <th className="px-3 py-2 text-right">{t("form.compo_surface")}</th>
            <th className="px-3 py-2">{t("form.compo_type")}</th>
            <th className="px-3 py-2 text-right">{t("form.compo_bedrooms")}</th>
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
                  {(["studio", "T1", "T2", "T3", "T4", "T5+"] as const).map((lt) => (
                    <option key={lt} value={lt}>
                      {lt === "studio" ? t("form.dwelling_studio") : lt}
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
                  aria-label={t("form.compo_remove")}
                  title={t("form.compo_remove")}
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
        className="mt-3 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
      >
        + {t("form.compo_addDwelling")}
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
  const t = useTranslations("admin_offmarket");
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
      />
      <span className="text-sm text-[#3D4F63]/80">{t("form.enabled")}</span>
    </label>
  );
}

function isNextInternalError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}

function PublishGuard({
  row,
  mode,
}: {
  row: OffmarketRow | null;
  mode: "create" | "edit";
}) {
  const t = useTranslations("admin_offmarket");
  if (mode === "create") {
    return (
      <div className="rounded-xl border border-[#e0af6e]/30 bg-[#e0af6e]/5 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e0af6e]">
          {t("guard.createTitle")}
        </p>
        <p className="mt-2 text-sm text-[#3D4F63]">
          {t("guard.createText")}
        </p>
      </div>
    );
  }

  const missing: string[] = [];
  if (!row?.title) missing.push(t("guard.missingTitle"));
  if (!row?.property_type) missing.push(t("guard.missingType"));
  if (!row?.country) missing.push(t("guard.missingCountry"));
  const hasPriceInfo =
    row?.price_estimate ||
    row?.price_min ||
    row?.price_custom_text ||
    row?.price_mode === "on_request";
  if (!hasPriceInfo) missing.push(t("guard.missingPrice"));

  if (missing.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700">
          {t("guard.readyTitle")}
        </p>
        <p className="mt-2 text-sm text-emerald-900">
          {t("guard.readyText")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
        {t("guard.blockedTitle")}
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
        {missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-amber-900">
        {t("guard.blockedText")}
      </p>
    </div>
  );
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
  const t = useTranslations("admin_offmarket");
  const [busy, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!confirm(t("form.deleteConfirm"))) return;
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
      {busy ? "…" : t("form.delete")}
    </button>
  );
}


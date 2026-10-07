"use client";

/**
 * ListingModelEditor : champs du modele d'annonce dans la fiche d'un bien
 * (oct. 2026). Champs rediges par Julien, par langue (qualificatif, phrase
 * d'ambiance, pieces par niveau, atouts) et champs factuels utiles a la
 * famille du bien. Le texte de l'annonce en est tire en direct
 * (lib/listing/generate.ts) tant qu'il n'a pas ete modifie a la main.
 * Pieces : ordre au glisser (ordinateur) ou par les fleches (telephone).
 */

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { ListingFamily, TemplateBlock } from "@/lib/listing/families";
import {
  CONSTRUCTION_TYPES,
  HERITAGE_TYPES,
  LEVEL_KINDS,
  LISTING_LANGS,
  LOCATION_FORMULAS,
  ORIENTATIONS,
  SERVICING_TYPES,
  type ListingData,
  type ListingFacts,
  type ListingLang,
  type ListingLevel,
  type ListingWritten,
} from "@/lib/listing/listing-data";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";
const labelCls = "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70";
const iconBtn =
  "inline-flex size-9 items-center justify-center rounded-md border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-30";

const newId = () => Math.random().toString(36).slice(2, 10);

// Champs factuels et familles qui les utilisent (null : toutes familles).
const BUILT: ListingFamily[] = ["appartement", "maison", "villa", "prestige", "commercial"];
const FACT_FAMILIES: Partial<Record<keyof ListingFacts, ListingFamily[] | "penthouse">> = {
  renovation_year: BUILT,
  cellar: ["appartement", "maison", "villa", "prestige", "commercial"],
  parking_indoor: ["appartement", "maison", "villa", "prestige", "commercial", "parking"],
  parking_outdoor: ["appartement", "maison", "villa", "prestige", "commercial", "parking"],
  monthly_charges: ["appartement", "commercial", "parking"],
  elevator: ["appartement"],
  building_levels: ["appartement"],
  top_floor: "penthouse",
  private_elevator: "penthouse",
  construction: ["maison", "villa"],
  orientation: ["maison", "villa", "prestige", "terrain"],
  garage_spaces: ["maison", "villa", "prestige", "parking"],
  landscaped_garden: ["villa"],
  home_automation: ["villa"],
  outbuildings: ["prestige"],
  heritage: ["prestige"],
  zone_pag: ["terrain"],
  servicing: ["terrain"],
  shopfront: ["commercial"],
  shopfront_length: ["commercial"],
  current_rent: ["commercial"],
  yield_percent: ["commercial"],
};

function factVisible(k: keyof ListingFacts, family: ListingFamily | null, block: TemplateBlock | null): boolean {
  const f = FACT_FAMILIES[k];
  if (!f || !family) return true;
  if (f === "penthouse") return block === "penthouse";
  return f.includes(family);
}

interface Props {
  data: ListingData;
  onChange: (next: ListingData) => void;
  family: ListingFamily | null;
  block: TemplateBlock | null;
  rent: boolean;
  lang: ListingLang;
  onLang: (l: ListingLang) => void;
}

export function ListingModelEditor({ data, onChange, family, block, rent, lang, onLang }: Props) {
  const t = useTranslations("admin_listing");
  const w = data.written[lang];

  const setWritten = (k: keyof ListingWritten, v: string) =>
    onChange({ ...data, written: { ...data.written, [lang]: { ...data.written[lang], [k]: v } } });
  const setFact = <K extends keyof ListingFacts>(k: K, v: ListingFacts[K]) => onChange({ ...data, facts: { ...data.facts, [k]: v } });
  const setLevels = (levels: ListingLevel[]) => onChange({ ...data, levels });

  const numFact = (k: keyof ListingFacts, label: string, step = "1") =>
    factVisible(k, family, block) && (
      <label key={k} className="block">
        <span className={labelCls}>{label}</span>
        <input
          type="number"
          min="0"
          step={step}
          value={(data.facts[k] as number | null | undefined) ?? ""}
          onChange={(e) => setFact(k, (e.target.value === "" ? null : Number(e.target.value)) as never)}
          className={`mt-1 ${inputCls} font-mono`}
        />
      </label>
    );
  const boolFact = (k: keyof ListingFacts, label: string) =>
    factVisible(k, family, block) && (
      <label key={k} className="inline-flex cursor-pointer items-center gap-2 self-end py-2">
        <input type="checkbox" checked={data.facts[k] === true} onChange={(e) => setFact(k, e.target.checked as never)} className="size-4 accent-[#e0af6e]" />
        <span className="text-sm text-[#3D4F63]/80">{label}</span>
      </label>
    );
  const selectFact = (k: keyof ListingFacts, label: string, options: readonly string[], prefix: string) =>
    factVisible(k, family, block) && (
      <label key={k} className="block">
        <span className={labelCls}>{label}</span>
        <select value={(data.facts[k] as string | null | undefined) ?? ""} onChange={(e) => setFact(k, (e.target.value || null) as never)} className={`mt-1 ${inputCls}`}>
          <option value="">{t("not_specified")}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {t(`${prefix}_${o}`)}
            </option>
          ))}
        </select>
      </label>
    );

  return (
    <div className="space-y-6 md:col-span-2" data-listing-editor>
      <div role="tablist" aria-label={t("lang_tabs")} className="flex flex-wrap gap-2">
        {LISTING_LANGS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={l === lang}
            onClick={() => onLang(l)}
            className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ${
              l === lang ? "border-[#3D4F63] bg-[#3D4F63] text-[#F5EFE1]" : "border-[#3D4F63]/30 text-[#3D4F63] hover:border-[#e0af6e]"
            }`}
          >
            {t(`lang_${l}`)}
          </button>
        ))}
      </div>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="mb-2 font-display text-sm font-bold text-[#3D4F63]">{t("written_title", { lang: t(`lang_${lang}`) })}</legend>
        <label className="block">
          <span className={labelCls}>{t("f_qualifier")}</span>
          <input value={w.qualifier} onChange={(e) => setWritten("qualifier", e.target.value)} className={`mt-1 ${inputCls}`} />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t(`hint_qualifier_${lang}`)}</span>
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_location_formula")}</span>
          <select
            value={data.facts.location_formula ?? "a"}
            onChange={(e) => setFact("location_formula", e.target.value as (typeof LOCATION_FORMULAS)[number])}
            className={`mt-1 ${inputCls}`}
            data-location-formula
          >
            {LOCATION_FORMULAS.map((f) => (
              <option key={f} value={f}>
                {t(`location_${f}`)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_location_formula")}</span>
        </label>
        {data.facts.location_formula === "custom" && (
          <label className="block md:col-span-2">
            <span className={labelCls}>{t("f_location_custom", { lang: lang.toUpperCase() })}</span>
            <input value={w.location_custom} onChange={(e) => setWritten("location_custom", e.target.value)} className={`mt-1 ${inputCls}`} />
            <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_location_custom")}</span>
          </label>
        )}
        <label className="block md:col-span-2">
          <span className={labelCls}>{t("f_ambiance")}</span>
          <textarea rows={2} value={w.ambiance} onChange={(e) => setWritten("ambiance", e.target.value)} className={`mt-1 ${inputCls}`} />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t(`hint_ambiance_${lang}`)}</span>
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>{t("f_highlights")}</span>
          <textarea rows={4} value={w.highlights} onChange={(e) => setWritten("highlights", e.target.value)} className={`mt-1 ${inputCls}`} />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_highlights")}</span>
        </label>
        {(!family || family === "prestige") && (
          <label className="block md:col-span-2">
            <span className={labelCls}>{t("f_history")}</span>
            <textarea rows={3} value={w.history} onChange={(e) => setWritten("history", e.target.value)} className={`mt-1 ${inputCls}`} />
            <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_history")}</span>
          </label>
        )}
        {(!family || block === "penthouse") && (
          <label className="block md:col-span-2">
            <span className={labelCls}>{t("f_view")}</span>
            <input value={w.view} onChange={(e) => setWritten("view", e.target.value)} className={`mt-1 ${inputCls}`} />
            <span className="mt-1 block text-xs text-[#3D4F63]/60">{t(`hint_view_${lang}`)}</span>
          </label>
        )}
        {(!family || family === "commercial") && (
          <label className="block md:col-span-2">
            <span className={labelCls}>{t("f_affectation")}</span>
            <input value={w.affectation} onChange={(e) => setWritten("affectation", e.target.value)} className={`mt-1 ${inputCls}`} />
          </label>
        )}
      </fieldset>

      {family !== "terrain" && family !== "parking" && <LevelsEditor levels={data.levels} onChange={setLevels} lang={lang} />}

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <legend className="mb-2 font-display text-sm font-bold text-[#3D4F63]">{t("facts_title")}</legend>
        {numFact("renovation_year", t("f_renovation_year"))}
        {boolFact("cellar", t("f_cellar"))}
        {numFact("parking_indoor", t("f_parking_indoor"))}
        {numFact("parking_outdoor", t("f_parking_outdoor"))}
        {numFact("monthly_charges", t("f_monthly_charges"), "0.01")}
        {boolFact("elevator", t("f_elevator"))}
        {numFact("building_levels", t("f_building_levels"))}
        {boolFact("top_floor", t("f_top_floor"))}
        {boolFact("private_elevator", t("f_private_elevator"))}
        {selectFact("construction", t("f_construction"), CONSTRUCTION_TYPES, "construction")}
        {selectFact("orientation", t("f_orientation"), ORIENTATIONS, "orientation")}
        {numFact("garage_spaces", t("f_garage_spaces"))}
        {boolFact("landscaped_garden", t("f_landscaped_garden"))}
        {boolFact("home_automation", t("f_home_automation"))}
        {numFact("outbuildings", t("f_outbuildings"))}
        {selectFact("heritage", t("f_heritage"), HERITAGE_TYPES, "heritage")}
        {factVisible("zone_pag", family, block) && (
          <label className="block">
            <span className={labelCls}>{t("f_zone_pag")}</span>
            <input value={data.facts.zone_pag ?? ""} onChange={(e) => setFact("zone_pag", e.target.value)} className={`mt-1 ${inputCls} font-mono`} />
          </label>
        )}
        {selectFact("servicing", t("f_servicing"), SERVICING_TYPES, "servicing")}
        {boolFact("shopfront", t("f_shopfront"))}
        {numFact("shopfront_length", t("f_shopfront_length"), "0.1")}
        {numFact("current_rent", t("f_current_rent"), "1")}
        {numFact("yield_percent", t("f_yield_percent"), "0.1")}
      </fieldset>

      {rent && (
        <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <legend className="mb-2 font-display text-sm font-bold text-[#3D4F63]">{t("rent_title")}</legend>
          {numFact("rent_charges", t("f_rent_charges"), "0.01")}
          {numFact("deposit_months", t("f_deposit_months"))}
          {boolFact("available_now", t("f_available_now"))}
          {!data.facts.available_now && (
            <label className="block">
              <span className={labelCls}>{t("f_available_from")}</span>
              <input type="date" value={data.facts.available_from ?? ""} onChange={(e) => setFact("available_from", e.target.value || null)} className={`mt-1 ${inputCls} font-mono`} />
            </label>
          )}
        </fieldset>
      )}
    </div>
  );
}

function LevelsEditor({ levels, onChange, lang }: { levels: ListingLevel[]; onChange: (l: ListingLevel[]) => void; lang: ListingLang }) {
  const t = useTranslations("admin_listing");
  const drag = useRef<{ level: number; room: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const update = (i: number, lv: ListingLevel) => onChange(levels.map((x, j) => (j === i ? lv : x)));
  const move = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length || from === to) return arr;
    const copy = arr.slice();
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    return copy;
  };

  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 font-display text-sm font-bold text-[#3D4F63]">{t("levels_title")}</legend>
      <p className="text-xs text-[#3D4F63]/60">{t("levels_hint")}</p>
      {levels.map((lv, i) => (
        <div key={lv.id} className="rounded-lg border border-[#3D4F63]/15 bg-white p-3" data-listing-level>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block min-w-0 flex-1">
              <span className={labelCls}>{t("f_level_kind")}</span>
              <select value={lv.kind} onChange={(e) => update(i, { ...lv, kind: e.target.value as ListingLevel["kind"] })} className={`mt-1 ${inputCls}`}>
                {LEVEL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`level_${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={iconBtn} aria-label={t("level_up")} disabled={i === 0} onClick={() => onChange(move(levels, i, i - 1))}>
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button type="button" className={iconBtn} aria-label={t("level_down")} disabled={i === levels.length - 1} onClick={() => onChange(move(levels, i, i + 1))}>
              <ArrowDown className="size-4" aria-hidden />
            </button>
            <button type="button" className={iconBtn} aria-label={t("level_remove")} onClick={() => onChange(levels.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <ol className="mt-3 space-y-2">
            {lv.rooms.map((r, k) => (
              <li
                key={r.id}
                draggable
                onDragStart={() => (drag.current = { level: i, room: k })}
                onDragOver={(e) => {
                  if (drag.current?.level !== i) return;
                  e.preventDefault();
                  setOver(r.id);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const d = drag.current;
                  drag.current = null;
                  if (!d || d.level !== i) return;
                  update(i, { ...lv, rooms: move(lv.rooms, d.room, k) });
                }}
                onDragEnd={() => {
                  drag.current = null;
                  setOver(null);
                }}
                className={`flex items-center gap-2 rounded-md ${over === r.id ? "ring-2 ring-[#e0af6e]" : ""}`}
                data-listing-room
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-[#3D4F63]/40 max-md:hidden" aria-hidden />
                <input
                  value={r.text[lang]}
                  onChange={(e) => update(i, { ...lv, rooms: lv.rooms.map((x, j) => (j === k ? { ...x, text: { ...x.text, [lang]: e.target.value } } : x)) })}
                  placeholder={t("ph_room")}
                  aria-label={t("room_label", { n: k + 1 })}
                  className={`min-w-0 flex-1 ${inputCls}`}
                />
                <button type="button" className={iconBtn} aria-label={t("room_up")} disabled={k === 0} onClick={() => update(i, { ...lv, rooms: move(lv.rooms, k, k - 1) })}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" className={iconBtn} aria-label={t("room_down")} disabled={k === lv.rooms.length - 1} onClick={() => update(i, { ...lv, rooms: move(lv.rooms, k, k + 1) })}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" className={iconBtn} aria-label={t("room_remove")} onClick={() => update(i, { ...lv, rooms: lv.rooms.filter((_, j) => j !== k) })}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => update(i, { ...lv, rooms: [...lv.rooms, { id: newId(), text: { fr: "", en: "", de: "" } }] })}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#3D4F63]/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e]"
          >
            <Plus className="size-3.5" aria-hidden />
            {t("room_add")}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...levels, { id: newId(), kind: levels.length === 0 ? "ground" : "floor", rooms: [{ id: newId(), text: { fr: "", en: "", de: "" } }] }])}
        className="inline-flex items-center gap-1 rounded-full border border-[#3D4F63]/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e]"
      >
        <Plus className="size-3.5" aria-hidden />
        {t("level_add")}
      </button>
    </fieldset>
  );
}

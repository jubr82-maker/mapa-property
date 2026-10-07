"use client";

/**
 * ListingTemplatesEditor : page Parametres > Modeles d'annonces (oct. 2026).
 * Modification du titre, du tronc commun et des blocs par famille, dans
 * chaque langue ; liste des reperes ; apercu en direct sur un bien fictif
 * (lib/listing/sample.ts), avec le texte en cours de modification.
 */

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LISTING_TYPES, MANDATE_TYPES, TEMPLATE_PARTS, type TemplatePart } from "@/lib/listing/families";
import { generateListing, listingValues, type ListingTemplates, type ListingVocab } from "@/lib/listing/generate";
import { LISTING_LANGS, type ListingLang } from "@/lib/listing/listing-data";
import { sampleColumns, sampleListing, type SampleTexts } from "@/lib/listing/sample";
import { generateSearch, publicBudgetRange, searchValues, type SearchTemplates, type SearchVocab } from "@/lib/searches/search";
import { saveListingTemplate, resetListingTemplate } from "@/app/admin/settings/modeles/actions";

type LangModel = {
  templates: ListingTemplates;
  defaults: ListingTemplates;
  vocab: ListingVocab;
  sample: SampleTexts & { search_communes: string; search_criteria: string };
  search: { templates: SearchTemplates; defaults: SearchTemplates; vocab: SearchVocab };
  overridden: TemplatePart[];
};
type Tpl = { listing: ListingTemplates; search: SearchTemplates };
const isSearchPart = (p: TemplatePart) => p === "search_title" || p === "search";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";
const pill = (on: boolean) =>
  `rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ${
    on ? "border-[#3D4F63] bg-[#3D4F63] text-[#F5EFE1]" : "border-[#3D4F63]/30 text-[#3D4F63] hover:border-[#e0af6e]"
  }`;

function partOf(tpl: Tpl, part: TemplatePart): string {
  if (part === "search_title") return tpl.search.title;
  if (part === "search") return tpl.search.body;
  if (part === "title") return tpl.listing.title;
  if (part === "tronc") return tpl.listing.tronc;
  return tpl.listing.blocks[part] ?? "";
}
function withPart(tpl: Tpl, part: TemplatePart, body: string): Tpl {
  if (part === "search_title") return { ...tpl, search: { ...tpl.search, title: body } };
  if (part === "search") return { ...tpl, search: { ...tpl.search, body } };
  if (part === "title") return { ...tpl, listing: { ...tpl.listing, title: body } };
  if (part === "tronc") return { ...tpl, listing: { ...tpl.listing, tronc: body } };
  return { ...tpl, listing: { ...tpl.listing, blocks: { ...tpl.listing.blocks, [part]: body } } };
}

export function ListingTemplatesEditor({ models }: { models: Record<ListingLang, LangModel> }) {
  const t = useTranslations("admin_listing");
  const tp = useTranslations("admin_properties");
  const [lang, setLang] = useState<ListingLang>("fr");
  const [part, setPart] = useState<TemplatePart>("tronc");
  const [drafts, setDrafts] = useState<Record<ListingLang, Tpl>>(() => ({
    fr: { listing: models.fr.templates, search: models.fr.search.templates },
    en: { listing: models.en.templates, search: models.en.search.templates },
    de: { listing: models.de.templates, search: models.de.search.templates },
  }));
  const [saved, setSaved] = useState<Record<ListingLang, Tpl>>(drafts);
  const [overridden, setOverridden] = useState<Record<ListingLang, TemplatePart[]>>(() => ({
    fr: models.fr.overridden,
    en: models.en.overridden,
    de: models.de.overridden,
  }));
  const [busy, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [previewType, setPreviewType] = useState("duplex");
  const [previewTx, setPreviewTx] = useState<"sale" | "rent">("sale");
  const [previewMandate, setPreviewMandate] = useState<string>("exclusive");

  const body = partOf(drafts[lang], part);
  const dirty = body !== partOf(saved[lang], part);
  const isDefault = !overridden[lang].includes(part);

  const sample = useMemo(() => sampleListing({ fr: models.fr.sample, en: models.en.sample, de: models.de.sample }), [models]);
  const cols = sampleColumns(previewType, previewTx, previewMandate || null, models[lang].sample.city);
  const searchPart = isSearchPart(part);
  // Recherche fictive de l'apercu : maison, 4 chambres, budget exact fictif.
  const range = publicBudgetRange(previewTx === "rent" ? 2600 : 950000, previewTx);
  const sampleSearch = {
    reference: "R-2026-001",
    transaction: previewTx,
    property_type: previewType,
    communes: models[lang].sample.search_communes.split(",").map((c) => c.trim()),
    budget_min: range?.min ?? null,
    budget_max: range?.max ?? null,
    bedrooms_min: 4,
    surface_min: 160,
    land_min: 500,
    delay: "6_months" as const,
    criteria: models[lang].sample.search_criteria,
  };
  const preview = searchPart
    ? generateSearch(sampleSearch, lang, drafts[lang].search, models[lang].search.vocab)
    : generateListing(cols, sample, lang, drafts[lang].listing, models[lang].vocab);
  const keys = searchPart
    ? Object.keys(searchValues(sampleSearch, lang, models[lang].search.vocab)).map((k) => `search_${k}`)
    : [...Object.keys(listingValues(cols, sample, lang, models[lang].vocab).values), "prestations"];

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await saveListingTemplate(lang, part, body);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved((s) => ({ ...s, [lang]: withPart(s[lang], part, body) }));
      setOverridden((o) => ({ ...o, [lang]: o[lang].includes(part) ? o[lang] : [...o[lang], part] }));
      setMsg({ ok: true, text: t("tpl_saved") });
    });
  }
  function reset() {
    if (!window.confirm(t("tpl_reset_confirm"))) return;
    setMsg(null);
    startTransition(async () => {
      const r = await resetListingTemplate(lang, part);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      const def = partOf({ listing: models[lang].defaults, search: models[lang].search.defaults }, part);
      setDrafts((d) => ({ ...d, [lang]: withPart(d[lang], part, def) }));
      setSaved((s) => ({ ...s, [lang]: withPart(s[lang], part, def) }));
      setOverridden((o) => ({ ...o, [lang]: o[lang].filter((p) => p !== part) }));
      setMsg({ ok: true, text: t("tpl_reset_done") });
    });
  }

  return (
    <div className="space-y-6" data-listing-templates>
      <div role="tablist" aria-label={t("lang_tabs")} className="flex flex-wrap gap-2">
        {LISTING_LANGS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)} className={pill(l === lang)}>
            {t(`lang_${l}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-[#3D4F63]/15 bg-white p-5">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">{t("tpl_part")}</span>
            <select value={part} onChange={(e) => setPart(e.target.value as TemplatePart)} className={`mt-1 ${inputCls}`}>
              {TEMPLATE_PARTS.map((p) => (
                <option key={p} value={p}>
                  {t(`tpl_part_${p}`)}
                  {overridden[lang].includes(p) ? ` (${t("tpl_modified")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={body}
            onChange={(e) => setDrafts((d) => ({ ...d, [lang]: withPart(d[lang], part, e.target.value) }))}
            rows={part === "title" ? 3 : 22}
            spellCheck={false}
            aria-label={t(`tpl_part_${part}`)}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
            >
              {busy ? t("tpl_saving") : t("tpl_save")}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy || isDefault}
              className="rounded-full border border-[#3D4F63]/30 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-50"
            >
              {t("tpl_reset")}
            </button>
            <span className="text-xs text-[#3D4F63]/70">{isDefault ? t("tpl_is_default") : t("tpl_is_modified")}</span>
          </div>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`whitespace-pre-line text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
              {msg.text}
            </p>
          )}
          <details className="rounded-lg border border-[#3D4F63]/10 p-3">
            <summary className="cursor-pointer font-display text-sm font-bold text-[#3D4F63]">{t("tpl_syntax_title")}</summary>
            <ul className="mt-2 space-y-1 text-xs text-[#3D4F63]/80">
              <li>{t("tpl_syntax_key")}</li>
              <li>{t("tpl_syntax_segment")}</li>
              <li>{t("tpl_syntax_if")}</li>
              <li>{t("tpl_syntax_unless")}</li>
              <li>{t("tpl_syntax_flags")}</li>
            </ul>
          </details>
          <details className="rounded-lg border border-[#3D4F63]/10 p-3" open>
            <summary className="cursor-pointer font-display text-sm font-bold text-[#3D4F63]">{t("tpl_keys_title")}</summary>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
              {keys.map((k) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-[#3D4F63]">{`{{${k.replace(/^search_/, "")}}}`}</dt>
                  <dd className="text-[#3D4F63]/80">{t(`key_${k}`)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <section className="space-y-3 rounded-2xl border border-[#3D4F63]/15 bg-white p-5" data-listing-preview>
          <h2 className="font-display text-lg font-bold text-[#3D4F63]">{t("tpl_preview_title")}</h2>
          <p className="text-xs text-[#3D4F63]/70">{t("tpl_preview_hint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-preview-controls>
            <select value={previewType} onChange={(e) => setPreviewType(e.target.value)} aria-label={tp("f_listing_type")} className={inputCls}>
              {LISTING_TYPES.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {tp(`ptype_${x.slug}`)}
                </option>
              ))}
            </select>
            <select value={previewTx} onChange={(e) => setPreviewTx(e.target.value as "sale" | "rent")} aria-label={t("tpl_preview_tx")} className={inputCls}>
              <option value="sale">{t("tpl_tx_sale")}</option>
              <option value="rent">{t("tpl_tx_rent")}</option>
            </select>
            <select value={previewMandate} onChange={(e) => setPreviewMandate(e.target.value)} aria-label={tp("f_mandate")} className={inputCls}>
              {MANDATE_TYPES.map((m) => (
                <option key={m} value={m}>
                  {tp(`mandate_${m}`)}
                </option>
              ))}
            </select>
          </div>
          <p className="font-display text-base font-bold text-[#1A1F2A]" data-preview-title>
            {preview.title}
          </p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-[#1A1F2A]" data-preview-text>
            {preview.text}
          </pre>
        </section>
      </div>
    </div>
  );
}

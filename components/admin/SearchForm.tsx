"use client";

/**
 * SearchForm : fiche d'une recherche en cours (oct. 2026).
 * Deux parties nettement separees : ce qui est PUBLIE (type, communes,
 * criteres, delai, budget en fourchette calcule, textes) et les donnees du
 * client, JAMAIS publiees (nom, contact, budget exact, adresse actuelle,
 * notes). Textes tires du modele des recherches en direct tant qu'ils ne
 * sont pas modifies a la main ; controle de redaction identique aux
 * annonces. Publication impossible sans l'accord du client.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LISTING_FAMILIES, LISTING_TYPES } from "@/lib/listing/families";
import { LISTING_LANGS, type ListingLang } from "@/lib/listing/listing-data";
import { checkFields, describeIssues } from "@/lib/listing/writing-check";
import { htmlToText, textToHtml } from "@/lib/listing/template-engine";
import { formatMoney } from "@/lib/listing/language";
import {
  SEARCH_DELAYS,
  SEARCH_REF_PLACEHOLDER,
  generateSearch,
  publicBudgetRange,
  type SearchStatus,
  type SearchTemplates,
  type SearchVocab,
} from "@/lib/searches/search";
import { deleteSearch, saveSearch, setSearchStatus, type SearchFormPayload } from "@/app/admin/recherches/actions";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";
const labelCls = "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70";
const btn = "rounded-full border border-[#3D4F63]/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-50";

export type SearchFormInitial = {
  id: string | null;
  reference: string | null;
  status: SearchStatus;
  transaction: "sale" | "rent";
  property_type: string;
  communes: string[];
  bedrooms_min: number | null;
  surface_min: number | null;
  land_min: number | null;
  delay: string | null;
  criteria: Record<ListingLang, string>;
  titles: Record<ListingLang, string>;
  descriptions: Record<ListingLang, string>;
  auto: Record<string, boolean>;
  consent: boolean;
  client: SearchFormPayload["client"];
};

type Models = Record<ListingLang, { templates: SearchTemplates; vocab: SearchVocab }>;

const NEXT_STATUS: Record<SearchStatus, SearchStatus[]> = {
  draft: ["published"],
  published: ["paused", "found", "withdrawn"],
  paused: ["published", "found", "withdrawn"],
  found: ["withdrawn", "published"],
  withdrawn: ["published"],
};

export function SearchForm({ initial, models, mandateLabel }: { initial: SearchFormInitial; models: Models; mandateLabel: string | null }) {
  const t = useTranslations("admin_searches");
  const tp = useTranslations("admin_properties");
  const tl = useTranslations("admin_listing");
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [communesText, setCommunesText] = useState(initial.communes.join(", "));
  const [lang, setLang] = useState<ListingLang>("fr");
  const [busy, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof SearchFormInitial>(k: K, v: SearchFormInitial[K]) => setS((p) => ({ ...p, [k]: v }));
  const setClient = <K extends keyof SearchFormInitial["client"]>(k: K, v: SearchFormInitial["client"][K]) => setS((p) => ({ ...p, client: { ...p.client, [k]: v } }));
  const communes = communesText.split(",").map((c) => c.trim()).filter(Boolean);
  const range = publicBudgetRange(s.client.budget_exact, s.transaction);

  // Textes tires du modele, en direct, pour les trois langues.
  const generated = useMemo(() => {
    const out = {} as Record<ListingLang, { title: string; text: string }>;
    for (const l of LISTING_LANGS) {
      out[l] = generateSearch(
        {
          reference: s.reference ?? SEARCH_REF_PLACEHOLDER,
          transaction: s.transaction,
          property_type: s.property_type,
          communes,
          budget_min: range?.min ?? null,
          budget_max: range?.max ?? null,
          bedrooms_min: s.bedrooms_min,
          surface_min: s.surface_min,
          land_min: s.land_min,
          delay: (s.delay as never) ?? null,
          criteria: s.criteria[l],
        },
        l,
        models[l].templates,
        models[l].vocab,
      );
    }
    return out;
    // communes derive de communesText.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, communesText, models]);

  const title = (l: ListingLang) => (s.auto[`title_${l}`] !== false ? generated[l].title : s.titles[l]);
  const text = (l: ListingLang) => (s.auto[`description_${l}`] !== false ? generated[l].text : htmlToText(s.descriptions[l]));

  const checks = checkFields(
    LISTING_LANGS.flatMap((l) => [
      { field: `title_${l}`, lang: l, title: true, text: title(l) },
      { field: `description_${l}`, lang: l, text: text(l) },
      { field: `criteria_${l}`, lang: l, text: s.criteria[l] },
    ]),
    communes,
  );
  const issueLines = describeIssues(checks, (k, v) => tl(k, v), (f) => t(`field_${f}`), 50);

  function payload(): SearchFormPayload {
    return {
      transaction: s.transaction,
      property_type: s.property_type,
      communes,
      bedrooms_min: s.bedrooms_min,
      surface_min: s.surface_min,
      land_min: s.land_min,
      delay: s.delay,
      criteria: s.criteria,
      titles: { fr: title("fr"), en: title("en"), de: title("de") },
      descriptions: { fr: textToHtml(text("fr")), en: textToHtml(text("en")), de: textToHtml(text("de")) },
      auto: s.auto,
      consent: s.consent,
      client: s.client,
    };
  }

  function save() {
    setMsg(null);
    if (checks.length) return setMsg({ ok: false, text: [tl("chk_blocked"), ...issueLines].join("\n") });
    startTransition(async () => {
      const r = await saveSearch(s.id, payload());
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: t("saved", { reference: r.reference }) });
      if (!s.id) router.replace(`/admin/recherches/${r.id}`);
      else router.refresh();
    });
  }
  function changeStatus(next: SearchStatus) {
    if (!s.id) return;
    setMsg(null);
    if ((next === "published" || next === "found") && !s.consent) return setMsg({ ok: false, text: t("err_consent") });
    startTransition(async () => {
      const r = await setSearchStatus(s.id!, next);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      set("status", next);
      setMsg({ ok: true, text: t("status_changed", { status: t(`status_${next}`) }) });
      router.refresh();
    });
  }
  function remove() {
    if (!s.id || !window.confirm(t("delete_confirm", { reference: s.reference ?? "" }))) return;
    startTransition(async () => {
      const r = await deleteSearch(s.id!);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      router.replace("/admin/recherches");
    });
  }

  return (
    <div className="space-y-6" data-search-form>
      {mandateLabel && <p className="rounded-md bg-[#F5EFE1] px-4 py-2 text-sm text-[#3D4F63]">{mandateLabel}</p>}

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-[#3D4F63]/15 bg-white p-5 md:grid-cols-3" data-search-public>
        <h2 className="font-display text-lg font-bold text-[#3D4F63] md:col-span-3">{t("public_title")}</h2>
        <p className="text-xs text-[#3D4F63]/70 md:col-span-3">{t("public_hint")}</p>
        <label className="block">
          <span className={labelCls}>{t("f_transaction")}</span>
          <select value={s.transaction} onChange={(e) => set("transaction", e.target.value as "sale" | "rent")} className={`mt-1 ${inputCls}`}>
            <option value="sale">{t("tx_sale")}</option>
            <option value="rent">{t("tx_rent")}</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>{t("f_type")}</span>
          <select value={s.property_type} onChange={(e) => set("property_type", e.target.value)} className={`mt-1 ${inputCls}`}>
            {LISTING_FAMILIES.map((f) => (
              <optgroup key={f} label={tp(`family_${f}`)}>
                <option value={f}>{t("type_any", { family: tp(`family_${f}`) })}</option>
                {LISTING_TYPES.filter((x) => x.family === f && x.slug !== f).map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {tp(`ptype_${x.slug}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block md:col-span-3">
          <span className={labelCls}>{t("f_communes")}</span>
          <input value={communesText} onChange={(e) => setCommunesText(e.target.value)} className={`mt-1 ${inputCls}`} />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_communes")}</span>
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_bedrooms_min")}</span>
          <input type="number" min="0" value={s.bedrooms_min ?? ""} onChange={(e) => set("bedrooms_min", e.target.value === "" ? null : Number(e.target.value))} className={`mt-1 ${inputCls} font-mono`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_surface_min")}</span>
          <input type="number" min="0" value={s.surface_min ?? ""} onChange={(e) => set("surface_min", e.target.value === "" ? null : Number(e.target.value))} className={`mt-1 ${inputCls} font-mono`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_land_min")}</span>
          <input type="number" min="0" value={s.land_min ?? ""} onChange={(e) => set("land_min", e.target.value === "" ? null : Number(e.target.value))} className={`mt-1 ${inputCls} font-mono`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_delay")}</span>
          <select value={s.delay ?? ""} onChange={(e) => set("delay", e.target.value || null)} className={`mt-1 ${inputCls}`}>
            <option value="">{t("not_specified")}</option>
            {SEARCH_DELAYS.map((d) => (
              <option key={d} value={d}>
                {t(`delay_${d}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <span className={labelCls}>{t("f_budget_public")}</span>
          <p className="mt-2 text-sm text-[#1A1F2A]" data-budget-public>
            {range ? t("budget_range", { min: formatMoney(range.min, "fr"), max: formatMoney(range.max, "fr") }) : t("budget_none")}
          </p>
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_budget_public")}</span>
        </div>

        <div className="md:col-span-3">
          <div role="tablist" aria-label={tl("lang_tabs")} className="flex flex-wrap gap-2">
            {LISTING_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={l === lang}
                onClick={() => setLang(l)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ${l === lang ? "border-[#3D4F63] bg-[#3D4F63] text-[#F5EFE1]" : "border-[#3D4F63]/30 text-[#3D4F63]"}`}
              >
                {tl(`lang_${l}`)}
              </button>
            ))}
          </div>
        </div>
        <label className="block md:col-span-3">
          <span className={labelCls}>{t("f_criteria", { lang: lang.toUpperCase() })}</span>
          <textarea rows={4} value={s.criteria[lang]} onChange={(e) => set("criteria", { ...s.criteria, [lang]: e.target.value })} className={`mt-1 ${inputCls}`} />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("hint_criteria")}</span>
        </label>
        <label className="block md:col-span-3">
          <span className={labelCls}>{t("f_title", { lang: lang.toUpperCase() })}</span>
          <input
            value={title(lang)}
            onChange={(e) => setS((p) => ({ ...p, titles: { ...p.titles, [lang]: e.target.value }, auto: { ...p.auto, [`title_${lang}`]: false } }))}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block md:col-span-3">
          <span className={labelCls}>{t("f_description", { lang: lang.toUpperCase() })}</span>
          <textarea
            rows={14}
            value={text(lang)}
            onChange={(e) => setS((p) => ({ ...p, descriptions: { ...p.descriptions, [lang]: textToHtml(e.target.value) }, auto: { ...p.auto, [`description_${lang}`]: false } }))}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-3">
          <button
            type="button"
            className={btn}
            onClick={() => {
              if (!window.confirm(tp("regen_confirm", { lang: lang.toUpperCase() }))) return;
              setS((p) => ({ ...p, auto: { ...p.auto, [`title_${lang}`]: true, [`description_${lang}`]: true } }));
            }}
          >
            {tp("regen_button", { lang: lang.toUpperCase() })}
          </button>
          <span className="text-xs text-[#3D4F63]/70">
            {LISTING_LANGS.map((l) => tp(s.auto[`description_${l}`] !== false ? "auto_live" : "auto_manual", { lang: l.toUpperCase() })).join(" ")}
          </span>
        </div>
        <div className="rounded-md border border-[#3D4F63]/15 px-3 py-2 md:col-span-3" role="status" data-writing-check>
          <p className={labelCls}>{tl("chk_live_title")}</p>
          {issueLines.length === 0 ? (
            <p className="mt-1 text-sm text-emerald-800">{tl("chk_live_ok")}</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-red-700">
              {issueLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-dashed border-[#3D4F63]/25 bg-[#F5EFE1]/40 p-5 md:grid-cols-2" data-search-private>
        <h2 className="font-display text-lg font-bold text-[#3D4F63] md:col-span-2">{t("private_title")}</h2>
        <p className="text-xs text-[#3D4F63]/70 md:col-span-2">{t("private_hint")}</p>
        <label className="block">
          <span className={labelCls}>{t("f_client_name")}</span>
          <input value={s.client.name} onChange={(e) => setClient("name", e.target.value)} autoComplete="off" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_budget_exact")}</span>
          <input type="number" min="0" value={s.client.budget_exact ?? ""} onChange={(e) => setClient("budget_exact", e.target.value === "" ? null : Number(e.target.value))} className={`mt-1 ${inputCls} font-mono`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_client_email")}</span>
          <input type="email" value={s.client.email} onChange={(e) => setClient("email", e.target.value)} autoComplete="off" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_client_phone")}</span>
          <input type="tel" value={s.client.phone} onChange={(e) => setClient("phone", e.target.value)} autoComplete="off" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>{t("f_current_address")}</span>
          <input value={s.client.current_address} onChange={(e) => setClient("current_address", e.target.value)} autoComplete="off" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>{t("f_notes")}</span>
          <textarea rows={3} value={s.client.notes} onChange={(e) => setClient("notes", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#3D4F63]/15 bg-white p-5">
        <label className="flex cursor-pointer items-start gap-3" data-search-consent>
          <input type="checkbox" checked={s.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 size-4 accent-[#e0af6e]" />
          <span className="text-sm text-[#1A1F2A]">
            <strong>{t("consent_label")}</strong>
            <span className="mt-1 block text-xs text-[#3D4F63]/70">{t("consent_hint")}</span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
          >
            {busy ? t("saving") : t("save")}
          </button>
          {s.id &&
            NEXT_STATUS[s.status].map((n) => (
              <button
                key={n}
                type="button"
                className={btn}
                disabled={busy || ((n === "published" || n === "found") && !s.consent)}
                onClick={() => changeStatus(n)}
                data-status-action={n}
              >
                {t(`action_${n}`)}
              </button>
            ))}
          {s.id && (
            <button type="button" className={`${btn} border-red-300 text-red-700`} disabled={busy} onClick={remove}>
              {t("delete")}
            </button>
          )}
          {s.id && <span className="text-xs text-[#3D4F63]/70">{t("current_status", { status: t(`status_${s.status}`) })}</span>}
        </div>
        {!s.consent && <p className="text-xs text-red-700">{t("consent_required")}</p>}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`whitespace-pre-line text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
            {msg.text}
          </p>
        )}
      </section>
    </div>
  );
}

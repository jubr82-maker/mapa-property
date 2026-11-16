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
import { autoFixHtml, autoFixText, isContentCode } from "@/lib/listing/writing-autofix";
import { applyAllHits, applyHit, contentHits } from "@/lib/listing/writing-suggest";
import { WritingFixPanel, type ContentItem, type FixLogEntry } from "@/components/admin/WritingFixPanel";
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

  const titleOf = (src: SearchFormInitial, l: ListingLang) => (src.auto[`title_${l}`] !== false ? generated[l].title : src.titles[l]);
  const textOf = (src: SearchFormInitial, l: ListingLang) => (src.auto[`description_${l}`] !== false ? generated[l].text : htmlToText(src.descriptions[l]));
  const title = (l: ListingLang) => titleOf(s, l);
  const text = (l: ListingLang) => textOf(s, l);

  const checks = checkFields(
    LISTING_LANGS.flatMap((l) => [
      { field: `title_${l}`, lang: l, title: true, text: title(l) },
      { field: `description_${l}`, lang: l, text: text(l) },
      { field: `criteria_${l}`, lang: l, text: s.criteria[l] },
    ]),
    communes,
  );
  // Fond (bloquant) et forme (corrigee a l'enregistrement), nov. 2026.
  const contentChecks = checks.map((c) => ({ ...c, issues: c.issues.filter((i) => isContentCode(i.code)) })).filter((c) => c.issues.length > 0);
  // Forme : seulement ce que la correction automatique changera vraiment.
  const fixCodes = (field: string, l: ListingLang) => {
    const v = field.startsWith("title_") ? title(l) : field.startsWith("criteria_") ? s.criteria[l] : text(l);
    return new Set(autoFixText(v, l, { title: field.startsWith("title_") }).changes.map((c) => c.code as string));
  };
  const formChecks = checks
    .map((c) => {
      const codes = fixCodes(c.field, c.lang);
      return { ...c, issues: c.issues.filter((i) => !isContentCode(i.code) && codes.has(i.code)) };
    })
    .filter((c) => c.issues.length > 0);
  const issueLines = describeIssues(contentChecks, (k, v) => tl(k, v), (f) => t(`field_${f}`), 50);
  const formLines = describeIssues(formChecks, (k, v) => tl(k, v), (f) => t(`field_${f}`), 50);

  const [fixLog, setFixLog] = useState<FixLogEntry[]>([]);
  const [showContent, setShowContent] = useState(false);

  /** Corrige la forme des textes saisis (un texte tire du modele reste lie au modele). */
  function fixForm(src: SearchFormInitial): { next: SearchFormInitial; log: FixLogEntry[] } {
    let next = src;
    const log: FixLogEntry[] = [];
    for (const l of LISTING_LANGS) {
      const c = autoFixText(src.criteria[l], l);
      if (c.changes.length) {
        next = { ...next, criteria: { ...next.criteria, [l]: c.text } };
        log.push({ label: t(`field_criteria_${l}`), changes: c.changes });
      }
      if (src.auto[`title_${l}`] === false) {
        const r = autoFixText(src.titles[l], l, { title: true, properNouns: communes });
        if (r.changes.length) {
          next = { ...next, titles: { ...next.titles, [l]: r.text } };
          log.push({ label: t(`field_title_${l}`), changes: r.changes });
        }
      }
      if (src.auto[`description_${l}`] === false) {
        const r = autoFixHtml(src.descriptions[l], l);
        if (r.changes.length) {
          next = { ...next, descriptions: { ...next.descriptions, [l]: r.text } };
          log.push({ label: t(`field_description_${l}`), changes: r.changes });
        }
      }
    }
    return { next, log };
  }

  /** Formules interdites, avec le remplacement propose. */
  function contentOf(src: SearchFormInitial): ContentItem[] {
    return LISTING_LANGS.flatMap((l) => [
      ...contentHits(titleOf(src, l), l).map((hit) => ({ key: `title_${l}`, label: t(`field_title_${l}`), hit })),
      ...contentHits(src.auto[`description_${l}`] !== false ? generated[l].text : src.descriptions[l], l).map((hit) => ({ key: `description_${l}`, label: t(`field_description_${l}`), hit })),
      ...contentHits(src.criteria[l], l).map((hit) => ({ key: `criteria_${l}`, label: t(`field_criteria_${l}`), hit })),
    ]);
  }
  const pendingContent = showContent ? contentOf(s) : [];

  /** Remplacement applique a un texte ; un texte tire du modele devient saisi. */
  function withReplaced(src: SearchFormInitial, key: string, edit: (v: string, l: ListingLang) => string): SearchFormInitial {
    const l = key.slice(-2) as ListingLang;
    if (key.startsWith("criteria_")) return { ...src, criteria: { ...src.criteria, [l]: edit(src.criteria[l], l) } };
    if (key.startsWith("title_")) return { ...src, titles: { ...src.titles, [l]: edit(titleOf(src, l), l) }, auto: { ...src.auto, [key]: false } };
    const html = src.auto[key] !== false ? textToHtml(generated[l].text) : src.descriptions[l];
    // Texte du modele : remplacement fait sur le texte, puis converti.
    const replaced = src.auto[key] !== false ? textToHtml(edit(generated[l].text, l)) : edit(html, l);
    return { ...src, descriptions: { ...src.descriptions, [l]: replaced }, auto: { ...src.auto, [key]: false } };
  }
  function applyContent(item: ContentItem) {
    setS((p) => withReplaced(p, item.key, (v) => applyHit(v, item.hit)));
  }
  function applyAllContent() {
    let next = s;
    for (const key of new Set(contentOf(s).map((c) => c.key))) next = withReplaced(next, key, (v, l) => applyAllHits(v, l));
    setS(next);
    saveWith(next);
  }

  function payload(src: SearchFormInitial = s): SearchFormPayload {
    return {
      transaction: src.transaction,
      property_type: src.property_type,
      communes,
      bedrooms_min: src.bedrooms_min,
      surface_min: src.surface_min,
      land_min: src.land_min,
      delay: src.delay,
      criteria: src.criteria,
      titles: { fr: titleOf(src, "fr"), en: titleOf(src, "en"), de: titleOf(src, "de") },
      descriptions: { fr: textToHtml(textOf(src, "fr")), en: textToHtml(textOf(src, "en")), de: textToHtml(textOf(src, "de")) },
      auto: src.auto,
      consent: src.consent,
      client: src.client,
    };
  }

  function save() {
    saveWith(s);
  }

  function saveWith(src: SearchFormInitial) {
    setMsg(null);
    const { next, log } = fixForm(src);
    setFixLog(log);
    if (log.length) setS(next);
    if (contentOf(next).length) {
      setShowContent(true);
      return setMsg({ ok: false, text: tl("chk_blocked_content_screen") });
    }
    setShowContent(false);
    startTransition(async () => {
      const r = await saveSearch(next.id, payload(next));
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
          {issueLines.length === 0 && formLines.length === 0 ? (
            <p className="mt-1 text-sm text-emerald-800">{tl("chk_live_ok")}</p>
          ) : (
            <>
              {issueLines.length > 0 && (
                <ul className="mt-1 space-y-1 text-sm text-red-700">
                  {issueLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
              {formLines.length > 0 && (
                <>
                  <p className="mt-1 text-xs text-emerald-800">{tl("chk_live_autofix")}</p>
                  <ul className="mt-1 space-y-1 text-xs text-[#3D4F63]/80">
                    {formLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
        <div className="md:col-span-3">
          <WritingFixPanel fixes={fixLog} content={pendingContent} onApply={applyContent} onApplyAll={applyAllContent} busy={busy} />
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

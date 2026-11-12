"use client";

// Formulaire d'une question frequente (oct. 2026) : page du site (liste
// fermee), question et reponse en francais, anglais et allemand (onglets,
// meme ergonomie que le formulaire Blog), case "Visible sur le site".
// Utilise par Gestion > Questions frequentes et par le bloc de l'article
// (page imposee, lockedPageKey).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteFaq, saveFaq } from "@/app/admin/faq/actions";
import type { FaqPageOption } from "@/lib/faq/admin-options";
import { ELENA_BUTTON_PATHS } from "@/lib/elena/button-paths";
import { ELENA_FAQ_KEY } from "@/lib/faq/keys";

type Lang = "fr" | "en" | "de";
const LANGS: Lang[] = ["fr", "en", "de"];

export type FaqFormValue = {
  id: string | null;
  page_key: string;
  question: Record<Lang, string>;
  answer: Record<Lang, string>;
  published: boolean;
  /** Reponses d'Elena (page "Eléna") : autres formulations (une par ligne), bouton, source. */
  elena: { variants: string; button_path: string; button_label: Record<Lang, string>; source: string; is_template: boolean };
};

export function emptyElena(): FaqFormValue["elena"] {
  return { variants: "", button_path: "", button_label: { fr: "", en: "", de: "" }, source: "", is_template: false };
}

export function emptyFaq(pageKey = ""): FaqFormValue {
  return { id: null, page_key: pageKey, question: { fr: "", en: "", de: "" }, answer: { fr: "", en: "", de: "" }, published: true, elena: emptyElena() };
}

export function FaqForm({
  initial,
  options,
  lockedPageKey,
  onDone,
}: {
  initial: FaqFormValue;
  options: FaqPageOption[];
  lockedPageKey?: string;
  /** Apres enregistrement ou suppression ; sans lui, retour a la liste. */
  onDone?: () => void;
}) {
  const t = useTranslations("admin_faq");
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fr");
  const [value, setValue] = useState<FaqFormValue>({ ...initial, page_key: lockedPageKey ?? initial.page_key });
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const langName = t(`lang_${lang}`);

  const setText = (f: "question" | "answer", v: string) => setValue((p) => ({ ...p, [f]: { ...p[f], [lang]: v } }));
  const done = () => {
    if (onDone) {
      onDone();
      router.refresh();
    } else router.push("/admin/faq");
  };

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const r = await saveFaq(value.id, {
          page_key: value.page_key,
          question: value.question,
          answer: value.answer,
          published: value.published,
          elena:
            value.page_key === ELENA_FAQ_KEY
              ? {
                  variants: value.elena.variants.split("\n").map((v) => v.trim()).filter(Boolean),
                  button_path: value.elena.button_path || null,
                  button_label: value.elena.button_label,
                  source: value.elena.source,
                }
              : undefined,
        });
        if (!r.ok) return setError(r.error);
        done();
      } catch {
        setError(t("err_network"));
      }
    });

  const remove = () => {
    if (!value.id || !confirm(t("delete_confirm"))) return;
    start(async () => {
      setError(null);
      try {
        const r = await deleteFaq(value.id as string);
        if (!r.ok) return setError(r.error);
        done();
      } catch {
        setError(t("err_network"));
      }
    });
  };

  const groups: { key: FaqPageOption["group"]; label: string }[] = [
    { key: "pages", label: t("group_pages") },
    { key: "elena", label: t("group_elena") },
    { key: "cities", label: t("group_cities") },
    { key: "blog", label: t("group_blog") },
  ];

  return (
    <div className="space-y-5 rounded-2xl border border-[#3D4F63]/15 bg-white p-6" data-faq-form>
      {lockedPageKey ? null : (
        <label className="block">
          <span className={labelCls}>{t("field_page")}</span>
          <select
            value={value.page_key}
            onChange={(e) => setValue((p) => ({ ...p, page_key: e.target.value }))}
            className={inputCls + " mt-1"}
            required
          >
            <option value="">{t("field_page_choose")}</option>
            {groups.map((g) => (
              <optgroup key={g.key} label={g.label}>
                {options
                  .filter((o) => o.group === g.key)
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      <nav className="flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] ${
              lang === l ? "bg-[#3D4F63] text-[#F5EFE1]" : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            {t(`lang_${l}`)}
            {!value.question[l].trim() ? <span className="ml-2 normal-case tracking-normal opacity-80">({t("lang_missing")})</span> : null}
          </button>
        ))}
      </nav>

      <label className="block">
        <span className={labelCls}>{t("field_question", { lang: langName })}</span>
        <input value={value.question[lang]} onChange={(e) => setText("question", e.target.value)} maxLength={500} className={inputCls + " mt-1"} />
      </label>
      <label className="block">
        <span className={labelCls}>{t("field_answer", { lang: langName })}</span>
        <textarea rows={6} value={value.answer[lang]} onChange={(e) => setText("answer", e.target.value)} maxLength={5000} className={inputCls + " mt-1 font-sans"} />
        <span className="mt-1 block text-xs text-[#3D4F63]/70">{t("answer_hint")}</span>
      </label>

      {value.page_key === ELENA_FAQ_KEY ? (
        <div className="space-y-4 rounded-xl border border-[#3D4F63]/15 bg-[#F5EFE1]/40 p-4" data-faq-elena>
          <p className="text-xs text-[#3D4F63]/80">{value.elena.is_template ? t("elena_template_hint") : t("elena_hint")}</p>
          <label className="block">
            <span className={labelCls}>{t("field_variants")}</span>
            <textarea
              rows={4}
              value={value.elena.variants}
              onChange={(e) => setValue((p) => ({ ...p, elena: { ...p.elena, variants: e.target.value } }))}
              className={inputCls + " mt-1 font-sans"}
            />
            <span className="mt-1 block text-xs text-[#3D4F63]/70">{t("field_variants_hint")}</span>
          </label>
          <label className="block">
            <span className={labelCls}>{t("field_button")}</span>
            <select
              value={value.elena.button_path}
              onChange={(e) => setValue((p) => ({ ...p, elena: { ...p.elena, button_path: e.target.value } }))}
              className={inputCls + " mt-1"}
            >
              <option value="">{t("field_button_none")}</option>
              {ELENA_BUTTON_PATHS.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {LANGS.map((l) => (
              <label key={l} className="block">
                <span className={labelCls}>{t("field_button_label", { lang: t(`lang_${l}`) })}</span>
                <input
                  value={value.elena.button_label[l]}
                  onChange={(e) => setValue((p) => ({ ...p, elena: { ...p.elena, button_label: { ...p.elena.button_label, [l]: e.target.value } } }))}
                  disabled={!value.elena.button_path}
                  maxLength={80}
                  className={inputCls + " mt-1 disabled:opacity-50"}
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className={labelCls}>{t("field_source")}</span>
            <input
              value={value.elena.source}
              onChange={(e) => setValue((p) => ({ ...p, elena: { ...p.elena, source: e.target.value } }))}
              maxLength={200}
              className={inputCls + " mt-1"}
            />
          </label>
        </div>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm text-[#3D4F63]">
        <input
          type="checkbox"
          checked={value.published}
          onChange={(e) => setValue((p) => ({ ...p, published: e.target.checked }))}
          className="size-4 rounded border-[#3D4F63]/30 accent-[#3D4F63]"
        />
        <span>{t("field_published")}</span>
      </label>

      {error ? <p className="whitespace-pre-line rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t("busy") : value.id ? t("submit_save") : t("submit_create")}
          </button>
          {onDone ? (
            <button type="button" onClick={onDone} disabled={busy} className="rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]">
              {t("cancel")}
            </button>
          ) : null}
        </div>
        {value.id ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {t("delete")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const labelCls = "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/80";
const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/30 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#3D4F63] focus:outline-none";

"use client";

// Formulaire de la fin d'article standard (oct. 2026) : onglets Francais,
// Anglais, Allemand (meme ergonomie que le formulaire Blog), editeur du
// blog pour les deux textes de la rubrique.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BlogBodyEditor } from "@/components/admin/BlogBodyEditor";
import { saveStandardEnding, type EndingPayload } from "@/app/admin/blog/ending-actions";
import type { StandardEnding } from "@/lib/blog/standard-ending";

type Lang = "fr" | "en" | "de";
const LANGS: Lang[] = ["fr", "en", "de"];

export function StandardEndingForm({ initial }: { initial: StandardEnding | null }) {
  const t = useTranslations("admin_blog");
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fr");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState<EndingPayload>(() =>
    Object.fromEntries(
      LANGS.map((l) => [
        l,
        {
          heading: initial?.[`heading_${l}`] ?? "",
          textCommune: initial?.[`text_commune_${l}`] ?? "",
          textGeneral: initial?.[`text_general_${l}`] ?? "",
          signature: initial?.[`signature_${l}`] ?? "",
        },
      ]),
    ) as EndingPayload,
  );
  const set = (k: keyof EndingPayload["fr"], value: string) => setV((p) => ({ ...p, [lang]: { ...p[lang], [k]: value } }));
  const langName = t(`lang_${lang}`);

  const save = () =>
    start(async () => {
      setMsg(null);
      try {
        const r = await saveStandardEnding(v);
        setMsg(r.ok ? { ok: true, text: t("ending_saved") } : { ok: false, text: r.error });
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, text: t("err_network") });
      }
    });

  return (
    <div className="space-y-5 rounded-2xl border border-[#3D4F63]/15 bg-white p-6" data-standard-ending-form>
      <nav className="flex gap-2">
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
          </button>
        ))}
      </nav>
      <label className="block">
        <span className={labelCls}>{t("ending_heading", { lang: langName })}</span>
        <input value={v[lang].heading} onChange={(e) => set("heading", e.target.value)} maxLength={120} className={inputCls} />
      </label>
      <div>
        <span className={labelCls}>{t("ending_text_commune", { lang: langName })}</span>
        <div className="mt-1">
          <BlogBodyEditor key={`c-${lang}`} value={v[lang].textCommune} onChange={(x) => set("textCommune", x)} slug="fin-standard" />
        </div>
        <span className="mt-1 block text-xs text-[#3D4F63]/80">{t("ending_text_commune_hint", { commune: "{commune}" })}</span>
      </div>
      <div>
        <span className={labelCls}>{t("ending_text_general", { lang: langName })}</span>
        <div className="mt-1">
          <BlogBodyEditor key={`g-${lang}`} value={v[lang].textGeneral} onChange={(x) => set("textGeneral", x)} slug="fin-standard" />
        </div>
      </div>
      <label className="block">
        <span className={labelCls}>{t("ending_signature", { lang: langName })}</span>
        <input value={v[lang].signature} onChange={(e) => set("signature", e.target.value)} maxLength={160} className={inputCls} />
      </label>
      {msg ? <p className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "border border-emerald-300 bg-emerald-50 text-emerald-800" : "border border-red-300 bg-red-50 text-red-700"}`}>{msg.text}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:opacity-90 disabled:opacity-60"
      >
        {busy ? t("busy") : t("submit_save")}
      </button>
    </div>
  );
}

const labelCls = "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/80";
const inputCls = "mt-1 block w-full rounded-md border border-[#3D4F63]/30 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#3D4F63] focus:outline-none";

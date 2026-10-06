"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  uploadBlogImage,
} from "@/app/admin/blog/actions";
import { BlogBodyEditor } from "@/components/admin/BlogBodyEditor";
import { compressImageFile } from "@/lib/image-compress";

type Post = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_de: string | null;
  content_fr: string | null;
  content_en: string | null;
  content_de: string | null;
  cover_image: string | null;
  primary_tag: string | null;
  author: string | null;
  is_published: boolean | null;
  published_at: string | null;
};

type Lang = "fr" | "en" | "de";

export function BlogPostForm({ post, mode }: { post: Post | null; mode: "create" | "edit" }) {
  const t = useTranslations("admin_blog");
  const [lang, setLang] = useState<Lang>("fr");
  const langName = t(`lang_${lang}`);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Textes des trois langues en etat controle (seconde passe, oct. 2026) :
  // avant, changer de langue remontait les champs avec la valeur d'origine
  // et la saisie de la langue quittee etait perdue.
  const pick = (f: "title" | "excerpt" | "content", l: Lang) => (post?.[`${f}_${l}`] as string | null | undefined) ?? "";
  const [texts, setTexts] = useState(() => ({
    title: { fr: pick("title", "fr"), en: pick("title", "en"), de: pick("title", "de") },
    excerpt: { fr: pick("excerpt", "fr"), en: pick("excerpt", "en"), de: pick("excerpt", "de") },
    content: { fr: pick("content", "fr"), en: pick("content", "en"), de: pick("content", "de") },
  }));
  const setText = (f: "title" | "excerpt" | "content", l: Lang, v: string) =>
    setTexts((prev) => ({ ...prev, [f]: { ...prev[f], [l]: v } }));
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [cover, setCover] = useState(post?.cover_image ?? "");
  const [coverBroken, setCoverBroken] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  const onCoverFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverBusy(true);
    setCoverError(null);
    const fd = new FormData();
    fd.set("file", await compressImageFile(file).catch(() => file));
    fd.set("slug", slug || texts.title.fr);
    const r = await uploadBlogImage(fd);
    setCoverBusy(false);
    if (!r.ok) return setCoverError(r.error);
    setCoverBroken(false);
    setCover(r.url);
  };

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = mode === "create" ? await createBlogPost(formData) : post ? await updateBlogPost(post.id, formData) : null;
        if (r && !r.ok) setError(r.error);
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(t("err_network"));
      }
    });
  };

  const onDelete = () => {
    if (!post) return;
    if (!confirm(t("delete_confirm"))) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await deleteBlogPost(post.id);
        if (r && !r.ok) setError(r.error);
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(t("err_network"));
      }
    });
  };

  return (
    <form action={submit} className="space-y-6">
      <Section title={t("section_info")}>
        <Field label={t("field_slug")} hint={t("slug_hint")}>
          <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} />
        </Field>
        <Field label={t("field_category")}>
          <input
            name="primary_tag"
            defaultValue={post?.primary_tag ?? ""}
            placeholder={t("category_placeholder")}
            className={inputCls}
          />
        </Field>
        <Field label={t("field_author")}>
          <input name="author" defaultValue={post?.author ?? "Julien"} className={inputCls} />
        </Field>
        <div className="md:col-span-2" data-admin-blog-cover>
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">{t("field_cover")}</span>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-md border border-[#3D4F63]/20 bg-[#3D4F63]/5 sm:w-64">
              {cover && !coverBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={t("cover_preview_alt")} className="size-full object-cover" onError={() => setCoverBroken(true)} />
              ) : (
                <span className="flex size-full items-center justify-center p-3 text-center text-sm text-ink-mid">
                  {cover ? t("cover_preview_error") : t("cover_empty")}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={coverBusy} className={coverBtnCls}>
                  {t("cover_take_photo")}
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={coverBusy} className={coverBtnCls}>
                  {t("cover_choose")}
                </button>
                {cover ? (
                  <button type="button" onClick={() => { setCover(""); setCoverBroken(false); }} disabled={coverBusy} className={coverBtnCls}>
                    {t("cover_remove")}
                  </button>
                ) : null}
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCoverFile} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onCoverFile} />
              {coverBusy && <p className="text-sm text-ink-mid">{t("cover_uploading")}</p>}
              {coverError && <p className="text-sm text-red-700">{coverError}</p>}
              <label className="block">
                <span className="block text-xs text-[#3D4F63]/70">{t("cover_url_label")}</span>
                <input
                  name="cover_image"
                  type="url"
                  inputMode="url"
                  value={cover}
                  onChange={(e) => { setCover(e.target.value); setCoverBroken(false); }}
                  placeholder={t("cover_placeholder")}
                  className={inputCls}
                />
              </label>
              <span className="block text-xs text-[#3D4F63]/60">{t("cover_hint")}</span>
            </div>
          </div>
        </div>
        <Field label={t("field_date")}>
          <input
            type="date"
            name="published_at"
            defaultValue={
              post?.published_at
                ? post.published_at.slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            }
            className={inputCls}
          />
        </Field>
        <Field label={t("field_published")}>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={post?.is_published ?? false}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
            />
            <span>{t("published_hint")}</span>
          </label>
        </Field>
      </Section>

      <Section title={t("section_content")}>
        <div className="md:col-span-2">
          <nav className="mb-4 flex gap-2">
            {(["fr", "en", "de"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] ${
                  lang === l
                    ? "bg-[#3D4F63] text-[#F5EFE1]"
                    : "border border-[#3D4F63]/20 text-[#3D4F63]"
                }`}
              >
                {t(`lang_${l}`)}
              </button>
            ))}
          </nav>
          <div className="space-y-4">
            <Field label={t("field_title", { lang: langName })}>
              <input
                value={texts.title[lang]}
                onChange={(e) => setText("title", lang, e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t("field_excerpt", { lang: langName })}>
              <textarea
                rows={2}
                value={texts.excerpt[lang]}
                onChange={(e) => setText("excerpt", lang, e.target.value)}
                className={inputCls + " font-sans"}
              />
            </Field>
            <div>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
                {t("field_body", { lang: langName })}
              </span>
              <div className="mt-1">
                <BlogBodyEditor
                  key={lang}
                  value={texts.content[lang]}
                  onChange={(v) => setText("content", lang, v)}
                  slug={slug || texts.title.fr}
                />
              </div>
              <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("body_hint")}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Valeurs envoyees : les trois langues, depuis l'etat. */}
      {(["fr", "en", "de"] as Lang[]).map((l) => (
        <span key={l} className="hidden">
          <input type="hidden" name={`title_${l}`} value={texts.title[l]} />
          <input type="hidden" name={`excerpt_${l}`} value={texts.excerpt[l]} />
          <input type="hidden" name={`content_${l}`} value={texts.content[l]} />
        </span>
      ))}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? t("busy") : mode === "create" ? t("submit_create") : t("submit_save")}
        </button>
        {mode === "edit" && post && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {t("delete")}
          </button>
        )}
      </footer>
    </form>
  );
}

const coverBtnCls =
  "rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-50";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm focus:border-[#e0af6e] focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
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

function isRedirect(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

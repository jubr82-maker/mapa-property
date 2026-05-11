"use client";

import { useState, useTransition } from "react";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "@/app/admin/blog/actions";

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
  const [lang, setLang] = useState<Lang>("fr");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") await createBlogPost(formData);
        else if (post) await updateBlogPost(post.id, formData);
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDelete = () => {
    if (!post) return;
    if (!confirm("Supprimer cet article ?")) return;
    startTransition(async () => {
      try {
        await deleteBlogPost(post.id);
      } catch (e) {
        if (isRedirect(e)) throw e;
        console.error(e);
      }
    });
  };

  return (
    <form action={submit} className="space-y-6">
      <Section title="Métadonnées">
        <Field label="Slug (URL)" hint="Auto-généré du titre FR si vide.">
          <input name="slug" defaultValue={post?.slug ?? ""} className={inputCls} />
        </Field>
        <Field label="Catégorie principale">
          <input
            name="primary_tag"
            defaultValue={post?.primary_tag ?? ""}
            placeholder="actualité, marché, fiscalité…"
            className={inputCls}
          />
        </Field>
        <Field label="Auteur">
          <input name="author" defaultValue={post?.author ?? "Julien Brebion"} className={inputCls} />
        </Field>
        <Field label="Image cover (URL)" hint="Upload manuellement dans Supabase Storage et coller l'URL publique.">
          <input
            name="cover_image"
            defaultValue={post?.cover_image ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        <Field label="Date de publication">
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
        <Field label="Publié">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={post?.is_published ?? false}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#B8865A]"
            />
            <span>Visible côté public</span>
          </label>
        </Field>
      </Section>

      <Section title="Contenu">
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
                {l.toUpperCase()}
              </button>
            ))}
          </nav>
          <div className="space-y-4">
            <Field label={`Titre (${lang.toUpperCase()})`}>
              <input
                key={`title-${lang}`}
                name={`title_${lang}`}
                defaultValue={
                  lang === "fr"
                    ? post?.title_fr ?? ""
                    : lang === "en"
                      ? post?.title_en ?? ""
                      : post?.title_de ?? ""
                }
                className={inputCls}
              />
            </Field>
            <Field label={`Résumé (${lang.toUpperCase()})`}>
              <textarea
                key={`excerpt-${lang}`}
                name={`excerpt_${lang}`}
                rows={2}
                defaultValue={
                  lang === "fr"
                    ? post?.excerpt_fr ?? ""
                    : lang === "en"
                      ? post?.excerpt_en ?? ""
                      : post?.excerpt_de ?? ""
                }
                className={inputCls + " font-sans"}
              />
            </Field>
            <Field
              label={`Contenu (${lang.toUpperCase()})`}
              hint="Markdown supporté côté front via la convention existante du site."
            >
              <textarea
                key={`content-${lang}`}
                name={`content_${lang}`}
                rows={16}
                defaultValue={
                  lang === "fr"
                    ? post?.content_fr ?? ""
                    : lang === "en"
                      ? post?.content_en ?? ""
                      : post?.content_de ?? ""
                }
                className={inputCls + " font-mono"}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Hidden inputs pour les langues non-actives — gardent leur valeur */}
      {(["fr", "en", "de"] as Lang[])
        .filter((l) => l !== lang)
        .map((l) => (
          <span key={l} className="hidden">
            <input
              type="hidden"
              name={`title_${l}`}
              defaultValue={
                l === "fr" ? post?.title_fr ?? "" : l === "en" ? post?.title_en ?? "" : post?.title_de ?? ""
              }
            />
            <input
              type="hidden"
              name={`excerpt_${l}`}
              defaultValue={
                l === "fr"
                  ? post?.excerpt_fr ?? ""
                  : l === "en"
                    ? post?.excerpt_en ?? ""
                    : post?.excerpt_de ?? ""
              }
            />
            <input
              type="hidden"
              name={`content_${l}`}
              defaultValue={
                l === "fr"
                  ? post?.content_fr ?? ""
                  : l === "en"
                    ? post?.content_en ?? ""
                    : post?.content_de ?? ""
              }
            />
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
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#B8865A] disabled:opacity-50"
        >
          {busy ? "…" : mode === "create" ? "Créer l'article" : "Enregistrer"}
        </button>
        {mode === "edit" && post && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
      </footer>
    </form>
  );
}

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm focus:border-[#B8865A] focus:outline-none";

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

function isRedirect(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

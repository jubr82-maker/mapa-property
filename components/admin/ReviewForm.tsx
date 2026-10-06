"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createReview,
  updateReview,
  deleteReview,
} from "@/app/admin/reviews/actions";
import { reviewSourceLang, reviewSourceText, type ReviewRow } from "@/lib/reviews";

// Champs envoyes (oct. 2026) : name, rating, review_date, lang (ecrit dans
// source_lang), text (ecrit dans comment, comment_en ou comment_de selon la
// langue), carousel (ecrit dans is_published), previous_lang (edition).
// Correspondance avec les colonnes reelles : lib/reviews.ts.
type Review = ReviewRow & { id: string | number };

export function ReviewForm({
  review,
  mode,
}: {
  review: Review | null;
  mode: "create" | "edit";
}) {
  const t = useTranslations("admin_reviews");
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const sourceLang = review ? reviewSourceLang(review) : "fr";

  // Motif reel de l'echec, renvoye en clair par l'action ; une exception
  // inattendue (reseau coupe) a son propre message, jamais generique.
  const submit = (formData: FormData) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const r = mode === "create" ? await createReview(formData) : review ? await updateReview(String(review.id), formData) : null;
        if (!r) return;
        if (!r.ok) return setError(r.error);
        if (mode === "create") router.push("/admin/reviews");
        else {
          setSaved(true);
          router.refresh();
        }
      } catch {
        setError(t("err_network"));
      }
    });
  };

  const onDelete = () => {
    if (!review) return;
    if (!confirm(t("delete_confirm"))) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await deleteReview(String(review.id));
        if (!r.ok) return setError(r.error);
        router.push("/admin/reviews");
      } catch {
        setError(t("err_network"));
      }
    });
  };

  return (
    <form action={submit} className="space-y-6">
      <Section title={t("section")}>
        <Field label={t("field_name")}>
          <input
            name="name"
            defaultValue={review?.name ?? ""}
            required
            className={inputCls}
          />
        </Field>
        <Field label={t("field_rating")}>
          <select
            name="rating"
            defaultValue={String(review?.rating ?? 5)}
            className={inputCls}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field_date")}>
          <input
            type="date"
            name="review_date"
            defaultValue={review?.review_date ?? new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </Field>
        <Field label={t("field_language")}>
          <select name="lang" defaultValue={sourceLang} className={inputCls}>
            <option value="fr">{t("lang_fr")}</option>
            <option value="en">{t("lang_en")}</option>
            <option value="de">{t("lang_de")}</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label={t("field_comment")}>
            <textarea
              name="text"
              rows={5}
              defaultValue={review ? reviewSourceText(review) : ""}
              required
              className={inputCls + " font-sans"}
            />
          </Field>
        </div>
        <Field label={t("field_published")}>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="carousel"
              defaultChecked={review?.is_published ?? true}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
            />
            <span>{t("published_hint")}</span>
          </label>
        </Field>
      </Section>

      {review ? <input type="hidden" name="previous_lang" value={sourceLang} /> : null}

      {saved && !error && (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("saved")}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
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
        {mode === "edit" && review && (
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

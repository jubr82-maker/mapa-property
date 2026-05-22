"use client";

import { useState, useTransition } from "react";
import {
  createReview,
  updateReview,
  deleteReview,
} from "@/app/admin/reviews/actions";

type Review = {
  id: string;
  name: string | null;
  rating: number | null;
  comment: string | null;
  review_date: string | null;
  lang: string | null;
  is_published: boolean | null;
};

export function ReviewForm({
  review,
  mode,
}: {
  review: Review | null;
  mode: "create" | "edit";
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") await createReview(formData);
        else if (review) await updateReview(review.id, formData);
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDelete = () => {
    if (!review) return;
    if (!confirm("Supprimer cet avis ?")) return;
    startTransition(async () => {
      try {
        await deleteReview(review.id);
      } catch (e) {
        if (isRedirect(e)) throw e;
        console.error(e);
      }
    });
  };

  return (
    <form action={submit} className="space-y-6">
      <Section title="Avis">
        <Field label="Nom du client">
          <input
            name="name"
            defaultValue={review?.name ?? ""}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Note (1 à 5 étoiles)">
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
        <Field label="Date">
          <input
            type="date"
            name="review_date"
            defaultValue={review?.review_date ?? new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </Field>
        <Field label="Langue">
          <select name="lang" defaultValue={review?.lang ?? "fr"} className={inputCls}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Texte de l'avis">
            <textarea
              name="comment"
              rows={5}
              defaultValue={review?.comment ?? ""}
              required
              className={inputCls + " font-sans"}
            />
          </Field>
        </div>
        <Field label="Publié sur la home">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={review?.is_published ?? false}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
            />
            <span>Visible dans le carrousel public</span>
          </label>
        </Field>
      </Section>

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
          {busy ? "…" : mode === "create" ? "Créer l'avis" : "Enregistrer"}
        </button>
        {mode === "edit" && review && (
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
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm focus:border-[#e0af6e] focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
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

function isRedirect(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

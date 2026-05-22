"use client";

/**
 * PropertyEditForm — POL4-A2 (AGENT CAMILLE)
 *
 * Form admin pour éditer titre FR + description FR (HTML formaté via
 * RichTextEditor TipTap d'ELISE) + prix d'un bien Apimo.
 * Form séparé du PropertyVideoForm existant (qui reste intact, géré par
 * sa propre server action updatePropertyVideoUrl).
 *
 * Server action : updateProperty (cf. app/admin/properties/actions.ts).
 */

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { updateProperty } from "@/app/admin/properties/actions";

interface Props {
  propertyId: string;
  initialTitle: string;
  initialDescription: string;
  initialPrice: number | null;
}

export function PropertyEditForm({
  propertyId,
  initialTitle,
  initialDescription,
  initialPrice,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState<string>(
    initialPrice == null ? "" : String(initialPrice),
  );
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      try {
        const priceNum =
          price.trim() === "" ? null : Number(price.replace(/\s/g, ""));
        await updateProperty(propertyId, {
          title_fr: title,
          description_fr: description,
          price: priceNum,
        });
        setFeedback("Enregistré.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  };

  const inputCls =
    "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";

  return (
    <form onSubmit={onSave} className="space-y-5">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          Titre (FR)
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du bien"
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          Description complète (FR)
        </span>
        <span className="mt-0.5 block text-xs text-[#3D4F63]/60">
          Mise en forme : gras (B) pour les titres « Description : »,
          « Prestations : »… ; italique (I) ; saut de ligne Maj+Entrée.
        </span>
        <div className="mt-1">
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Description complète du bien"
          />
        </div>
      </label>

      <label className="block max-w-xs">
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          Prix (€)
        </span>
        <input
          type="number"
          min="0"
          step="1000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {feedback && (
          <span className="text-sm text-emerald-700">{feedback}</span>
        )}
        {error && (
          <span className="text-sm text-red-700">Erreur : {error}</span>
        )}
      </div>
    </form>
  );
}

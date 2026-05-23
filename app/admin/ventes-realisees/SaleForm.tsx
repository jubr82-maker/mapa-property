"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Formulaire d'ajout d'une vente realisee. Sprint B2 squelette : un seul
// formulaire 'create'. Edition / suppression : sprint suivant.
//
// POST vers /api/admin/ventes-realisees (cree dans le meme commit). Sur
// success → router.refresh() pour relire la liste server-side.

type Agent = "julien" | "frederic";

interface State {
  property_type: string;
  surface_habitable: string;
  surface_terrain: string;
  chambres: string;
  classe_energie: string;
  annee_construction: string;
  etat: string;
  adresse: string;
  commune: string;
  prix_vente: string;
  date_acte: string;
  agent: Agent;
  notes: string;
}

const initial: State = {
  property_type: "appartement",
  surface_habitable: "",
  surface_terrain: "",
  chambres: "",
  classe_energie: "",
  annee_construction: "",
  etat: "",
  adresse: "",
  commune: "",
  prix_vente: "",
  date_acte: new Date().toISOString().slice(0, 10),
  agent: "julien",
  notes: "",
};

const PROPERTY_TYPES = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
];

const ENERGIES = ["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"];

const ETATS = ["neuf", "renove", "bon", "a_renover"];

export function SaleForm() {
  const router = useRouter();
  const [data, setData] = useState<State>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const res = await fetch("/api/admin/ventes-realisees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          surface_habitable: Number(data.surface_habitable) || 0,
          surface_terrain: data.surface_terrain
            ? Number(data.surface_terrain)
            : null,
          chambres: data.chambres ? Number(data.chambres) : null,
          annee_construction: data.annee_construction
            ? Number(data.annee_construction)
            : null,
          prix_vente: Number(data.prix_vente) || 0,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} — ${txt}`);
      }
      setSuccess(true);
      setData(initial);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Type *">
          <select
            value={data.property_type}
            onChange={(e) => set("property_type", e.target.value)}
            className={inputCls}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Surface habitable * (m²)">
          <input
            type="number"
            min="1"
            required
            value={data.surface_habitable}
            onChange={(e) => set("surface_habitable", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Surface terrain (m²)">
          <input
            type="number"
            min="0"
            value={data.surface_terrain}
            onChange={(e) => set("surface_terrain", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Chambres">
          <input
            type="number"
            min="0"
            value={data.chambres}
            onChange={(e) => set("chambres", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Classe énergie">
          <select
            value={data.classe_energie}
            onChange={(e) => set("classe_energie", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {ENERGIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Année construction">
          <input
            type="number"
            min="1700"
            max="2100"
            value={data.annee_construction}
            onChange={(e) => set("annee_construction", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="État">
          <select
            value={data.etat}
            onChange={(e) => set("etat", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {ETATS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commune *">
          <input
            type="text"
            required
            value={data.commune}
            onChange={(e) => set("commune", e.target.value)}
            placeholder="Steinfort"
            className={inputCls}
          />
        </Field>
        <Field label="Adresse *">
          <input
            type="text"
            required
            value={data.adresse}
            onChange={(e) => set("adresse", e.target.value)}
            placeholder="12 rue de la Gare"
            className={inputCls}
          />
        </Field>
        <Field label="Prix de vente * (€)">
          <input
            type="number"
            min="1"
            required
            value={data.prix_vente}
            onChange={(e) => set("prix_vente", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Date acte *">
          <input
            type="date"
            required
            value={data.date_acte}
            onChange={(e) => set("date_acte", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Agent *">
          <select
            value={data.agent}
            onChange={(e) => set("agent", e.target.value as Agent)}
            className={inputCls}
          >
            <option value="julien">Julien</option>
            <option value="frederic">Frédéric</option>
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Spécificités, conditions, contexte…"
          className={`${inputCls} resize-y`}
        />
      </Field>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          Vente enregistrée.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#9E7B2A] px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Ajouter la vente"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
        {label}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";

const TYPES = ["appartement", "maison", "penthouse", "duplex", "villa", "immeuble", "terrain"];
const STATES = ["to_renovate", "good", "renovated", "new"];
const ENERGIES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const inputCls =
  "rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#9E7B2A] focus:outline-none";
const labelCls =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70";

export function NewEstimationForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    type: "appartement",
    country: DEFAULT_COUNTRY,
    commune: "",
    livingSurface: "",
    bedrooms: "",
    state: "good",
    energy: "C",
    year: "",
    contact_email: "",
    contact_phone: "",
    price_low: "",
    price_mid: "",
    price_high: "",
  });
  const set = (k: keyof typeof f, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

  async function submit() {
    setErr(null);
    if (!f.price_mid || Number(f.price_mid) <= 0) {
      setErr("Le prix médian est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/estimations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: f.type,
          country: f.country,
          commune: f.commune || undefined,
          livingSurface: num(f.livingSurface),
          bedrooms: num(f.bedrooms),
          state: f.state,
          energy: f.energy,
          year: num(f.year),
          contact_email: f.contact_email || undefined,
          contact_phone: f.contact_phone || undefined,
          price_low: num(f.price_low),
          price_mid: num(f.price_mid),
          price_high: num(f.price_high),
        }),
      });
      if (!res.ok) {
        setErr(`Erreur : ${await res.text()}`);
        return;
      }
      router.push("/admin/estimations");
      router.refresh();
    } catch (e) {
      setErr(`Erreur réseau : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Type de bien</span>
          <select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Pays</span>
          <select className={inputCls} value={f.country} onChange={(e) => set("country", e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name_fr}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Commune / Ville</span>
          <input className={inputCls} value={f.commune} onChange={(e) => set("commune", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Surface habitable (m²)</span>
          <input type="number" min="0" className={inputCls} value={f.livingSurface} onChange={(e) => set("livingSurface", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Chambres</span>
          <input type="number" min="0" className={inputCls} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Année</span>
          <input type="number" min="0" className={inputCls} value={f.year} onChange={(e) => set("year", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>État</span>
          <select className={inputCls} value={f.state} onChange={(e) => set("state", e.target.value)}>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Classe énergétique</span>
          <select className={inputCls} value={f.energy} onChange={(e) => set("energy", e.target.value)}>
            {ENERGIES.map((en) => (
              <option key={en} value={en}>{en}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Email client</span>
          <input type="email" className={inputCls} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Téléphone client</span>
          <input type="tel" className={inputCls} value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Prix bas (€)</span>
          <input type="number" min="0" className={inputCls} value={f.price_low} onChange={(e) => set("price_low", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Prix médian (€) *</span>
          <input type="number" min="0" className={inputCls} value={f.price_mid} onChange={(e) => set("price_mid", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Prix haut (€)</span>
          <input type="number" min="0" className={inputCls} value={f.price_high} onChange={(e) => set("price_high", e.target.value)} />
        </label>
      </div>

      {err && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-[#9E7B2A] px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#B8865A] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Créer l'estimation"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/estimations")}
          className="rounded-full border border-[#3D4F63]/20 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#9E7B2A]"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

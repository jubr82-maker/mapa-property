"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Item = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  notes: string | null;
};

const STATUSES = ["pending", "contacted", "done"];

export function ArcovaTable({ items }: { items: Item[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/admin/arcova?${next.toString()}`));
  };

  const exportCsv = () => {
    const lines = [
      ["Date", "Email", "Nom", "Téléphone", "Entreprise", "Rôle", "Statut", "Message"].join(","),
      ...items.map((i) =>
        [
          new Date(i.created_at).toISOString(),
          i.email,
          [i.first_name, i.last_name].filter(Boolean).join(" "),
          i.phone ?? "",
          i.company ?? "",
          i.role ?? "",
          i.status ?? "",
          (i.message ?? "").replace(/"/g, '""').replace(/\n/g, " "),
        ]
          .map((c) => `"${c}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arcova-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <input
          type="search"
          placeholder="Filtre rôle (texte libre)"
          defaultValue={sp.get("role") ?? ""}
          onChange={(e) => setParam("role", e.target.value)}
          className="min-w-[200px] rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
        />
        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
        >
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          className="ml-auto rounded-full bg-[#B8865A] px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white hover:bg-[#9d6e44]"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  Aucune inscription.
                </td>
              </tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} className="hover:bg-[#3D4F63]/5">
                  <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                    {new Date(i.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">{i.email}</td>
                  <td className="px-4 py-3">
                    {[i.first_name, i.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#3D4F63]/80">{i.company ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#3D4F63]/80">{i.role ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#3D4F63]/80">
                    {i.message ? (
                      <span className="line-clamp-2 max-w-[28ch]" title={i.message}>
                        {i.message}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]">
                      {i.status ?? "pending"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

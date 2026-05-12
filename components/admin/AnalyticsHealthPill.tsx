"use client";

import { useEffect, useState } from "react";

type HealthStatus = "idle" | "ok" | "degraded" | "error";

export function AnalyticsHealthPill() {
  const [status, setStatus] = useState<HealthStatus>("idle");
  const [version, setVersion] = useState<string>("—");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        const dbOk = Boolean(json?.db);
        const ok = res.ok && json?.status === "ok";
        setStatus(ok ? "ok" : dbOk ? "degraded" : "error");
        if (json?.version) setVersion(String(json.version));
        setCheckedAt(new Date().toLocaleTimeString("fr-FR"));
      } catch {
        if (cancelled) return;
        setStatus("error");
        setCheckedAt(new Date().toLocaleTimeString("fr-FR"));
      }
    }

    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const tone =
    status === "ok"
      ? { bg: "bg-emerald-500/15", dot: "bg-emerald-500", text: "text-emerald-700", label: "Opérationnel" }
      : status === "degraded"
        ? { bg: "bg-amber-500/15", dot: "bg-amber-500", text: "text-amber-700", label: "Dégradé" }
        : status === "error"
          ? { bg: "bg-rose-500/15", dot: "bg-rose-500", text: "text-rose-700", label: "Erreur" }
          : { bg: "bg-[#3D4F63]/10", dot: "bg-[#3D4F63]/40", text: "text-[#3D4F63]", label: "Vérification…" };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ${tone.bg} ${tone.text}`}
      >
        <span className={`relative inline-flex size-2 rounded-full ${tone.dot}`}>
          {status === "ok" && (
            <span
              className={`absolute inset-0 inline-flex size-2 animate-ping rounded-full opacity-75 ${tone.dot}`}
            />
          )}
        </span>
        {tone.label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        build {version}
      </span>
      {checkedAt && (
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
          MAJ {checkedAt}
        </span>
      )}
    </div>
  );
}

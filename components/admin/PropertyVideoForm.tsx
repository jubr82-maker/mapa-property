"use client";

import { useState, useTransition } from "react";
import { updatePropertyVideoUrl } from "@/app/admin/properties/actions";

interface Props {
  propertyId: string;
  initialVideoUrl: string;
}

export function PropertyVideoForm({ propertyId, initialVideoUrl }: Props) {
  const [value, setValue] = useState(initialVideoUrl);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const onSave = () => {
    setStatus("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updatePropertyVideoUrl(propertyId, value.trim() || null);
        setStatus("ok");
      } catch (e) {
        setStatus("err");
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  const onClear = () => {
    setValue("");
    setStatus("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updatePropertyVideoUrl(propertyId, null);
        setStatus("ok");
      } catch (e) {
        setStatus("err");
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          URL vidéo
        </span>
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://… .mp4"
          className="w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm focus:border-[#B8865A] focus:outline-none"
        />
      </label>

      {value && (
        <video
          controls
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-[#3D4F63]/10"
          src={value}
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded-full bg-[#3D4F63] px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {initialVideoUrl && (
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="rounded-full border border-[#3D4F63]/30 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] disabled:opacity-50"
          >
            Retirer la vidéo
          </button>
        )}
        {status === "ok" && (
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-700">
            Enregistré ✓
          </span>
        )}
        {status === "err" && (
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-700">
            {errorMsg ?? "Erreur"}
          </span>
        )}
      </div>
    </div>
  );
}

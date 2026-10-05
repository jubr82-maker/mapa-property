"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type TokenRow = {
  id: string;
  category: string;
  token_key: string;
  token_value: string;
  description: string | null;
  updated_at: string;
};

const FONT_OPTIONS = [
  "Big Shoulders",
  "Inter",
  "Playfair Display",
  "Cormorant Garamond",
  "Lora",
  "Crimson Pro",
  "Archivo",
  "Manrope",
  "JetBrains Mono",
  "IBM Plex Mono",
] as const;

const FONT_SLOTS = [
  { key: "display", label: "font_display" },
  { key: "sans", label: "font_sans" },
  { key: "mono", label: "font_mono" },
] as const;

export function FontsTab({ initial }: { initial: TokenRow[] }) {
  const t = useTranslations("admin_cms");
  const fonts = initial.filter((t) => t.category === "font");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {FONT_SLOTS.map((slot) => {
        const row = fonts.find((f) => f.token_key === slot.key);
        return (
          <FontCard
            key={slot.key}
            slotKey={slot.key}
            label={t(slot.label)}
            initialValue={row?.token_value ?? ""}
            description={row?.description ?? null}
          />
        );
      })}
    </div>
  );
}

function FontCard({
  slotKey,
  label,
  initialValue,
  description,
}: {
  slotKey: string;
  label: string;
  initialValue: string;
  description: string | null;
}) {
  const [value, setValue] = useState(initialValue || FONT_OPTIONS[0]);
  const t = useTranslations("admin_cms");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const dirty = value !== initialValue;

  async function onSave() {
    setSaving(true);
    setFlash(null);
    try {
      const r = await fetch("/api/admin/cms/tokens", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "font",
          token_key: slotKey,
          token_value: value,
          description,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          r.status === 401 || r.status === 403
            ? t("err_session")
            : typeof json.error === "string"
              ? json.error
              : t("save_error"),
        );
      }
      setFlash(t("saved"));
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 3000);
    }
  }

  return (
    <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-4 w-full rounded border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <p
        className="mt-3 text-xl text-[#1A1F2A]"
        style={{ fontFamily: `'${value}', sans-serif` }}
      >
        {t("font_preview")}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="rounded bg-[#3D4F63] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5EFE1] transition-colors hover:bg-[#2D3F53] disabled:opacity-40"
        >
          {saving ? t("busy") : t("save")}
        </button>
        {flash && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
            {flash}
          </span>
        )}
      </div>
    </div>
  );
}

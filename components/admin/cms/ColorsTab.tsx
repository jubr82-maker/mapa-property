"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HexColorPicker } from "react-colorful";
import type { TokenRow } from "./FontsTab";

/** Motif renvoye par le serveur (distinct d'une coupure reseau). */
class CmsError extends Error {}

const COLOR_SLOTS = [
  { key: "gold", label: "color_gold", fallback: "#e0af6e" },
  { key: "ink", label: "color_ink", fallback: "#1A1F2A" },
  { key: "bg", label: "color_bg", fallback: "#F5EFE1" },
] as const;

export function ColorsTab({ initial }: { initial: TokenRow[] }) {
  const t = useTranslations("admin_cms");
  const colors = initial.filter((t) => t.category === "color");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {COLOR_SLOTS.map((slot) => {
        const row = colors.find((c) => c.token_key === slot.key);
        return (
          <ColorCard
            key={slot.key}
            slotKey={slot.key}
            label={t(slot.label)}
            initialValue={row?.token_value ?? slot.fallback}
            description={row?.description ?? null}
          />
        );
      })}
    </div>
  );
}

function ColorCard({
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
  const [value, setValue] = useState(initialValue);
  const t = useTranslations("admin_cms");
  const tn = useTranslations("admin_notices");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const dirty = value.toLowerCase() !== initialValue.toLowerCase();

  async function onSave() {
    setSaving(true);
    setFlash(null);
    try {
      const r = await fetch("/api/admin/cms/tokens", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "color",
          token_key: slotKey,
          token_value: value,
          description,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new CmsError(
          r.status === 401 || r.status === 403
            ? t("err_session")
            : typeof json.error === "string"
              ? json.error
              : tn("err_http", { status: r.status }),
        );
      }
      setFlash(t("saved"));
    } catch (e) {
      setFlash(e instanceof CmsError ? e.message : tn("err_network"));
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

      <div className="mt-4">
        <HexColorPicker
          color={value}
          onChange={setValue}
          style={{ width: "100%", height: "180px" }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden
          className="block size-10 rounded border border-[#3D4F63]/20"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded border border-[#3D4F63]/20 bg-white px-2 py-1 font-mono text-xs"
        />
      </div>

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

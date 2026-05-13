"use client";

import { useState } from "react";
import { ContentTab, type ContentRow } from "./ContentTab";
import { FontsTab, type TokenRow } from "./FontsTab";
import { ColorsTab } from "./ColorsTab";

type Tab = "content" | "fonts" | "colors";

export function ContenuTabs({
  initialContent,
  initialTokens,
}: {
  initialContent: ContentRow[];
  initialTokens: TokenRow[];
}) {
  const [tab, setTab] = useState<Tab>("content");
  const [revalidating, setRevalidating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function onRevalidate() {
    setRevalidating(true);
    setFlash(null);
    try {
      const r = await fetch("/api/admin/cms/revalidate", { method: "POST" });
      if (!r.ok) throw new Error("revalidate failed");
      setFlash("Cache vidé. Les changements sont en ligne.");
    } catch (e) {
      console.error(e);
      setFlash("Échec — vérifier la console.");
    } finally {
      setRevalidating(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-lg border border-[#3D4F63]/15 bg-white p-1">
          <TabButton active={tab === "content"} onClick={() => setTab("content")}>
            Textes
          </TabButton>
          <TabButton active={tab === "fonts"} onClick={() => setTab("fonts")}>
            Polices
          </TabButton>
          <TabButton active={tab === "colors"} onClick={() => setTab("colors")}>
            Couleurs
          </TabButton>
        </nav>
        <div className="flex items-center gap-3">
          {flash && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
              {flash}
            </span>
          )}
          <button
            type="button"
            onClick={onRevalidate}
            disabled={revalidating}
            className="rounded-lg border border-[#3D4F63]/20 bg-[#3D4F63] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#2D3F53] disabled:opacity-50"
          >
            {revalidating ? "..." : "Vider cache"}
          </button>
        </div>
      </div>

      {tab === "content" && <ContentTab initial={initialContent} />}
      {tab === "fonts" && <FontsTab initial={initialTokens} />}
      {tab === "colors" && <ColorsTab initial={initialTokens} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
        active
          ? "bg-[#3D4F63] text-[#F5EFE1]"
          : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
      }`}
    >
      {children}
    </button>
  );
}

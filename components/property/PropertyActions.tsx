"use client";

import { useTranslations } from "next-intl";
import { FavoriteHeart } from "./FavoriteHeart";

interface Props {
  propertyId: string;
}

export function PropertyActions({ propertyId }: Props) {
  const t = useTranslations("property");

  // TODO: pdf via @react-pdf/renderer dans Étape 12 (polish).
  // Pour MVP : window.print() avec CSS @media print stylisé MAPA.
  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const scrollToForm = () => {
    if (typeof window === "undefined") return;
    document
      .getElementById("contact-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <FavoriteHeart propertyId={propertyId} size="md" />

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold hover:text-gold"
      >
        <PrintIcon />
        {t("download_pdf")}
      </button>

      <button
        type="button"
        onClick={scrollToForm}
        className="gold-shine-bg inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
      >
        {t("request_info")}
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function PrintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  );
}

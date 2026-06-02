// POL2-7 — Colonne droite ÉPURÉE, identique sur les deux types de fiche.
// Contenu STRICT (rien d'autre — plan de financement & frais déplacés
// dans l'onglet "Conditions de vente") :
//   1. "Votre conseiller" : photo Julien Brebion + titre + Contacter
//   2. "Mandat exclusif ?" cartouche (vendeurs)
//   3. "Mandat de recherche ?" cartouche (acquéreurs)
//
// Server Component. ContactReveal (client) injecté en `contact`.

import Image from "next/image";
import { Link as IntlLink } from "@/i18n/navigation";
import { sbUrl } from "@/lib/supabase-url";
import type { ReactNode } from "react";

export function FicheAdvisorColumn({
  labels,
  searchMandateHref,
  contact,
}: {
  labels: {
    advisor: string;
    advisorRoles: string;
    exclusiveEyebrow: string;
    exclusiveTitle: string;
    exclusiveText: string;
    exclusiveCta: string;
    searchEyebrow: string;
    searchTitle: string;
    searchText: string;
    searchCta: string;
  };
  /** URL du mandat de recherche pré-rempli (ref/type/pays). */
  searchMandateHref: string;
  /** ContactReveal (client) déjà rendu par l'appelant. */
  contact: ReactNode;
}) {
  return (
    <aside data-fiche-aside className="space-y-6">
      {/* 1. Votre conseiller */}
      <div
        data-fiche-advisor
        className="rounded-xl border border-line bg-bg-soft p-6"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {labels.advisor}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-gold/40">
            <Image
              src={sbUrl("photos", "IMG_2461.jpg")}
              alt="Julien Brebion — Real Estate Director MAPA Property"
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-ink">
              Julien Brebion
            </p>
            <p className="whitespace-pre-line font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              {labels.advisorRoles}
            </p>
          </div>
        </div>
        <div className="mt-4">{contact}</div>
      </div>

      {/* 2. Mandat Exclusif (vendeurs) */}
      <div
        data-fiche-mandate-exclusive
        className="overflow-hidden rounded-xl p-5 text-white shadow-sm"
        style={{
          backgroundImage: "linear-gradient(135deg, #e0af6e 0%, #8B6635 100%)",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
          {labels.exclusiveEyebrow}
        </p>
        <p className="mt-2 font-display text-base font-bold leading-snug text-white">
          {labels.exclusiveTitle}
        </p>
        <p className="mt-2 text-xs text-white/85">{labels.exclusiveText}</p>
        <IntlLink
          href="/mandats/exclusif"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm transition-transform hover:scale-[1.02]"
          style={{ color: "#8B6635" }}
        >
          {labels.exclusiveCta} <span aria-hidden>→</span>
        </IntlLink>
      </div>

      {/* 3. Mandat de recherche (acquéreurs) */}
      <div
        data-fiche-mandate-search
        className="rounded-xl border border-gold/40 bg-bg p-6"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          {labels.searchEyebrow}
        </p>
        <p className="mt-2 font-display text-base font-bold leading-snug text-ink">
          {labels.searchTitle}
        </p>
        <p className="mt-2 text-sm text-ink-mid">{labels.searchText}</p>
        <IntlLink
          href={searchMandateHref}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
        >
          {labels.searchCta} <span aria-hidden>→</span>
        </IntlLink>
      </div>
    </aside>
  );
}

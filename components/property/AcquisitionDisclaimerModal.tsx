"use client";

import { useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "mp_disclaimer_acquisition_accepted_v1";

interface Props {
  onAccept: () => void;
  /** Locale courante pour le lien vers /mentions-acquisition (ex. "fr"). */
  locale?: string;
}

/**
 * Vérifie côté client si l'utilisateur a déjà accepté le disclaimer du simulateur
 * d'acquisition. Retourne false côté serveur (pas de localStorage).
 */
export function hasAcceptedDisclaimer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Modal "Niveau 2" affiché tant que l'utilisateur n'a pas explicitement accepté
 * les limitations du simulateur de coûts d'acquisition. Une fois accepté,
 * l'état est persisté en localStorage et le modal ne réapparaît plus.
 */
export function AcquisitionDisclaimerModal({ onAccept, locale = "fr" }: Props) {
  // Empêche le scroll de la page tant que le modal est ouvert.
  // Effet de synchronisation DOM uniquement — pas de setState.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* localStorage indisponible (mode privé) — on continue quand même. */
    }
    onAccept();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acq-disclaimer-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-bg p-6 shadow-2xl sm:p-8">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "#B8865A" }}
        >
          Information importante
        </p>
        <h2
          id="acq-disclaimer-title"
          className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl"
        >
          Simulateur de Coûts d&apos;Acquisition
        </h2>

        <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-mid">
          <p>Les informations affichées dans ce simulateur :</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Sont fournies à titre purement <strong>INFORMATIF et INDICATIF</strong></li>
            <li>N&apos;ont <strong>AUCUNE valeur contractuelle</strong> ni engageante</li>
            <li>Ne constituent ni un conseil fiscal, juridique, notarial, financier ou en investissement</li>
            <li>Ne sauraient se substituer à la consultation d&apos;un notaire local agréé, d&apos;un avocat fiscaliste ou d&apos;un conseiller financier indépendant</li>
            <li>Sont issues de la compilation de sources publiques officielles à la date de leur dernière vérification</li>
            <li>Peuvent évoluer à tout moment du fait de réformes législatives</li>
            <li>Ne tiennent pas compte de votre situation patrimoniale, familiale, fiscale ou de résidence particulière</li>
            <li>Excluent les frais annexes potentiels (honoraires d&apos;agence, diagnostics, taxes locales, syndic, charges, intérêts d&apos;emprunt, assurances, frais bancaires, conversion de devises, etc.)</li>
          </ul>

          <p>
            <strong>MAPA SYNERGY Sàrl, MAPA PROPERTY</strong> et leurs représentants déclinent
            expressément toute responsabilité quant à l&apos;exactitude, l&apos;exhaustivité ou
            l&apos;actualité des informations affichées, et aux décisions d&apos;investissement
            prises sur la base de ces estimations.
          </p>

          <p>
            L&apos;utilisateur reconnaît avoir pris connaissance de ces limitations et accepte
            d&apos;utiliser le simulateur en pleine conscience de son caractère strictement
            informatif.
          </p>

          <p className="rounded-lg border border-line bg-bg-soft p-4 text-xs">
            Pour une analyse personnalisée et contractuelle de votre projet
            d&apos;acquisition, contactez MAPA Property :
            <br />
            <a
              href="tel:+352691620127"
              className="font-mono font-semibold hover:underline"
              style={{ color: "#B8865A" }}
            >
              +352 691 620 127
            </a>
            {" · "}
            <a
              href="mailto:j.brebion@mapagroup.org"
              className="font-mono font-semibold hover:underline"
              style={{ color: "#B8865A" }}
            >
              j.brebion@mapagroup.org
            </a>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href={`/${locale}/mentions-acquisition`}
            className="inline-flex items-center justify-center rounded-full border border-line bg-bg px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold/40 hover:text-ink"
          >
            Voir mentions complètes
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#B8865A" }}
          >
            J&apos;accepte et je consulte le simulateur
          </button>
        </div>
      </div>
    </div>
  );
}

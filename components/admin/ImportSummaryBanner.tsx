"use client";

/**
 * Resume d'un import d'annonce (nov. 2026), en haut de la fiche du
 * brouillon : champs remplis, champs a completer, photos importees et en
 * echec, formules a reformuler. Les champs a completer viennent de la page
 * (brouillon enregistre) ; le reste du resume, du navigateur qui a fait
 * l'import (sessionStorage).
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { importSummaryKey, type StoredImportSummary } from "@/lib/import-listing/summary";

export function ImportSummaryBanner({ propertyId, todo }: { propertyId: string; todo: string[] }) {
  const t = useTranslations("admin_properties");
  const tl = useTranslations("admin_listing");
  const [summary, setSummary] = useState<StoredImportSummary | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(importSummaryKey(propertyId));
      // Lecture differee : le resume n'existe que dans le navigateur.
      if (raw) queueMicrotask(() => setSummary(JSON.parse(raw) as StoredImportSummary));
    } catch {
      // Stockage indisponible : resume reduit.
    }
  }, [propertyId]);

  if (hidden) return null;
  // Champs a completer : ceux du brouillon enregistre, plus ceux que
  // l'import n'a pas reconnus (transaction, valeurs ecartees...).
  const todoAll = [...new Set([...todo, ...(summary?.todo ?? []).filter((f) => !summary?.filled.includes(f))])];
  const label = (f: string) => (t.has(`import_field_${f}`) ? t(`import_field_${f}`) : f);
  const kicker = "font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft";

  return (
    <section className="rounded-2xl bg-bg-soft px-5 py-6 sm:px-8" data-import-summary role="status">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-deep">{t("import_kicker")}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink">{t("import_summary_title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-mid">{t("import_summary_draft")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.removeItem(importSummaryKey(propertyId));
            } catch {}
          }}
          className="min-h-11 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft underline underline-offset-4 hover:text-gold-deep"
        >
          {t("import_sum_close")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        {summary && (
          <div>
            <p className={kicker}>{t("import_sum_filled", { count: summary.filled.length })}</p>
            <p className="mt-1 text-sm text-ink">{summary.filled.map(label).join(", ") || "-"}</p>
          </div>
        )}
        <div>
          <p className={kicker}>{t("import_sum_todo", { count: todoAll.length })}</p>
          <p className="mt-1 text-sm text-ink">{todoAll.length ? todoAll.map(label).join(", ") : t("import_sum_todo_none")}</p>
        </div>
        {summary && (
          <div>
            <p className={kicker}>{t("import_sum_photos_title")}</p>
            <p className="mt-1 text-sm text-ink">
              {t("import_sum_photos", { done: summary.photosImported, total: summary.photosTotal })}
              {summary.enhanced && summary.photosImported > 0 ? ` ${t("import_sum_photos_enhanced")}` : ""}
            </p>
            {summary.skipped.length > 0 && <p className="mt-1 text-xs text-ink-soft">{t("import_sum_skipped", { count: summary.skipped.length })}</p>}
            {summary.imagesBlocked && <p className="mt-1 text-xs text-red-700">{t("import_sum_images_blocked")}</p>}
          </div>
        )}
        {summary && summary.photoFailures.length > 0 && (
          <div>
            <p className={`${kicker} text-red-700`}>{t("import_sum_photos_failed", { count: summary.photoFailures.length })}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-mid">
              {summary.photoFailures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {summary && summary.words.length > 0 && (
          <div>
            <p className={`${kicker} text-red-700`}>{t("import_sum_words", { count: summary.words.length })}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink">
              {summary.words.map((w, i) => (
                <li key={i}>
                  <span className="font-mono text-[10px] text-ink-soft">{w.lang.toUpperCase()}</span> « {w.excerpt} »
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary && summary.issues.length > 0 && (
          <div>
            <p className={kicker}>{t("import_sum_issues", { count: summary.issues.length })}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-mid">
              {summary.issues.slice(0, 8).map((w, i) => (
                <li key={i}>
                  <span className="font-mono text-[10px] text-ink-soft">{w.lang.toUpperCase()}</span> {tl.has(`chk_${w.code}`) ? tl(`chk_${w.code}`, { excerpt: w.excerpt }) : w.excerpt}
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary && summary.rejected.length > 0 && (
          <div>
            <p className={kicker}>{t("import_sum_rejected")}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-mid">
              {summary.rejected.map((r, i) => (
                <li key={i}>
                  {label(r.field)} : {r.value}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {summary && !summary.recognized && <p className="mt-4 text-sm text-red-700">{t("import_sum_not_recognized")}</p>}
      {summary && summary.recognized && !summary.translated && <p className="mt-2 text-sm text-ink-mid">{t("import_sum_not_translated")}</p>}
      {summary?.countryDefaulted && <p className="mt-2 text-sm text-red-700">{t("import_sum_country_default")}</p>}
      {summary?.transactionDefaulted && <p className="mt-2 text-sm text-red-700">{t("import_sum_tx_default")}</p>}
    </section>
  );
}

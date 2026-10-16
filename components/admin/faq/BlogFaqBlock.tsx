"use client";

// Bloc "Questions frequentes de l'article" du formulaire Blog (oct. 2026) :
// questions rattachees a la page "blog:<adresse de l'article>", creees,
// modifiees, ordonnees et publiees ici, affichees sous l'article.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FaqForm, emptyFaq, type FaqFormValue } from "@/components/admin/faq/FaqForm";
import { FaqMoveButtons } from "@/components/admin/faq/FaqMoveButtons";

export function BlogFaqBlock({ pageKey, items }: { pageKey: string | null; items: FaqFormValue[] }) {
  const t = useTranslations("admin_faq");
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6" data-blog-faq>
      <h2 className="font-display text-xl font-bold text-[#3D4F63]">{t("blog_block_title")}</h2>
      <p className="mt-1 text-sm text-[#3D4F63]/80">{t("blog_block_intro")}</p>
      {!pageKey ? (
        <p className="mt-4 text-sm text-[#3D4F63]">{t("blog_block_need_slug")}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.length === 0 ? <p className="text-sm text-[#3D4F63]/80">{t("empty")}</p> : null}
          <ol className="space-y-3">
            {items.map((f, i) => (
              <li key={f.id} className="rounded-xl border border-[#3D4F63]/15 p-4">
                {editing === f.id ? (
                  <FaqForm initial={f} options={[]} lockedPageKey={pageKey} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1F2A]">{f.question.fr}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#3D4F63]/80">
                        {(["fr", "en", "de"] as const).filter((l) => f.question[l]).map((l) => l.toUpperCase()).join(" ")}
                        {" · "}
                        {f.published ? t("visible_yes") : t("visible_no")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaqMoveButtons id={f.id as string} first={i === 0} last={i === items.length - 1} />
                      <button type="button" onClick={() => setEditing(f.id)} className="rounded-full border border-[#3D4F63]/30 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]">
                        {t("edit")}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {editing === "new" ? (
            <FaqForm initial={emptyFaq(pageKey)} options={[]} lockedPageKey={pageKey} onDone={() => setEditing(null)} />
          ) : (
            <button type="button" onClick={() => setEditing("new")} className="rounded-full bg-[#3D4F63] px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:opacity-90">
              {t("blog_block_add")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

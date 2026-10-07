import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { SearchForm } from "@/components/admin/SearchForm";
import { loadSearch, searchModels } from "@/app/admin/recherches/load";

export const dynamic = "force-dynamic";

export default async function EditSearchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_searches" });
  const search = /^[0-9a-f-]{36}$/i.test(id) ? await loadSearch(id) : null;
  if (!search) notFound();
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          <Link href="/admin/recherches" className="hover:underline">
            {t("eyebrow")}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">{t("edit_title", { reference: search.reference ?? "" })}</h1>
        {(search.status === "published" || search.status === "found") && (
          <a href={`/fr/recherches/${search.reference}`} target="_blank" rel="noopener" className="mt-2 inline-block text-sm text-[#3D4F63] underline">
            {t("view_public")}
          </a>
        )}
      </header>
      <SearchForm initial={search} models={await searchModels()} mandateLabel={null} />
    </div>
  );
}

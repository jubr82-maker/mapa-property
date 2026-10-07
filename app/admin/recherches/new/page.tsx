import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { SearchForm } from "@/components/admin/SearchForm";
import { emptySearch, searchFromMandate, searchModels } from "@/app/admin/recherches/load";

export const dynamic = "force-dynamic";

export default async function NewSearchPage({ searchParams }: { searchParams: Promise<{ mandat?: string }> }) {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_searches" });
  const { mandat } = await searchParams;
  const fromMandate = mandat && /^[0-9a-f-]{36}$/i.test(mandat) ? await searchFromMandate(mandat) : null;
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          <Link href="/admin/recherches" className="hover:underline">
            {t("eyebrow")}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">{t("new_title")}</h1>
      </header>
      <SearchForm
        initial={fromMandate?.initial ?? emptySearch()}
        models={await searchModels()}
        mandateLabel={fromMandate?.label ? t("from_mandate", { client: fromMandate.label }) : null}
      />
    </div>
  );
}

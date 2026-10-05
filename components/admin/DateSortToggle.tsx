// Tri par date des listes admin : plus recents d'abord (defaut) ou plus
// anciens d'abord, via le parametre ?sort=desc|asc. Composant serveur.
import Link from "next/link";
import { getAdminDateTimeT } from "@/lib/admin/datetime-labels";

export type DateSort = "asc" | "desc";

export function parseDateSort(value: string | string[] | undefined): DateSort {
  return value === "asc" ? "asc" : "desc";
}

export async function DateSortToggle({
  basePath,
  sort,
  params = {},
}: {
  basePath: string;
  sort: DateSort;
  /** Autres parametres de la liste a conserver (filtres). */
  params?: Record<string, string | undefined>;
}) {
  const t = await getAdminDateTimeT();
  const href = (s: DateSort) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "sort") q.set(k, v);
    q.set("sort", s);
    return `${basePath}?${q.toString()}`;
  };
  const cls = (active: boolean) =>
    `rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
      active ? "border-[#1A1F2A] bg-[#1A1F2A] text-white" : "border-[#3D4F63]/30 text-[#1A1F2A]/70 hover:border-[#1A1F2A]"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/70">
        {t("sort_label")}
      </span>
      <Link href={href("desc")} className={cls(sort === "desc")} aria-current={sort === "desc" ? "true" : undefined}>
        {t("sort_desc")}
      </Link>
      <Link href={href("asc")} className={cls(sort === "asc")} aria-current={sort === "asc" ? "true" : undefined}>
        {t("sort_asc")}
      </Link>
    </div>
  );
}

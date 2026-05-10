import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchOffmarketAdminById } from "@/lib/admin/offmarket-server";
import { OffmarketForm } from "@/components/admin/OffmarketForm";

export default async function EditOffmarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const row = await fetchOffmarketAdminById(id);
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            {row.reference}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
            {row.title ?? "Sans titre"}
          </h1>
        </div>
        <Link
          href={`/admin/offmarket/${row.id}/requests`}
          className="rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
        >
          Demandes ({row.requests_count ?? 0}) →
        </Link>
      </header>
      {sp.created && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Bien créé. N&apos;oubliez pas d&apos;ajouter des photos et de passer en
          « Publié » quand prêt.
        </p>
      )}
      <OffmarketForm row={row} mode="edit" />
    </div>
  );
}

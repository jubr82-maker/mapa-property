import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchOffmarketAdminById } from "@/lib/admin/offmarket-server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { toSignedUrl } from "@/lib/storage-signed-url";
import { OffmarketForm } from "@/components/admin/OffmarketForm";

export const dynamic = "force-dynamic";

export default async function EditOffmarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  const row = await fetchOffmarketAdminById(id);
  if (!row) notFound();

  // Galerie affichée via des URL signées (60 min), dérivées à chaque
  // rendu depuis le chemin du fichier — jamais les URL permanentes
  // stockées en colonnes cover_image_url/gallery_urls/photo_urls.
  // L'identité utilisée pour le tri/la suppression/l'écriture en base
  // (reorderOffmarketPhotos) reste l'URL permanente d'origine, jamais
  // l'URL signée. Cf. lib/storage-signed-url.ts.
  const rawPhotoUrls: string[] =
    (row.photo_urls as string[] | null) ?? (row.gallery_urls as string[] | null) ?? [];
  const signedPhotoUrls: Record<string, string> = Object.fromEntries(
    (
      await Promise.all(
        rawPhotoUrls.map(
          async (url) => [url, await toSignedUrl("offmarket-photos", url)] as const,
        ),
      )
    ).filter((entry): entry is [string, string] => entry[1] !== null),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {row.reference}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
            {row.title ?? "Sans titre"}
          </h1>
        </div>
        <Link
          href={`/admin/offmarket/${row.id}/requests`}
          className="rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
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
      <OffmarketForm row={row} mode="edit" signedPhotoUrls={signedPhotoUrls} />
    </div>
  );
}

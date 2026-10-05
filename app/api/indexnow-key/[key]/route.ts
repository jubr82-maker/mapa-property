// Fichier de cle IndexNow (oct. 2026), servi a la racine du site sous
// /<cle>.txt (next.config.ts, rewrites). Repond la cle en texte brut si
// l'adresse correspond a INDEXNOW_KEY, sinon 404. La cle n'est pas un
// secret : IndexNow exige qu'elle soit publique.
import { indexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const expected = indexNowKey();
  if (!expected || key !== expected) {
    return new Response(null, { status: 404 });
  }
  return new Response(expected, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}

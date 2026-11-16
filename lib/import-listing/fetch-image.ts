// Telechargement d'UNE image dont l'adresse figure dans le contenu colle par
// Julien (nov. 2026). Serveur seulement. Jamais une page web : le contenu
// recu doit etre une image (en-tete image/* ou signature d'image), sinon il
// est refuse et rien n'est lu au-dela. Garde-fous :
//   - https seulement, port standard, pas d'identifiants dans l'adresse ;
//   - jamais une adresse interne (localhost, reseaux prives, .local) ;
//   - redirections suivies a la main (3 au plus), chacune recontrolee ;
//   - 25 Mo au plus (lecture arretee au-dela), 20 secondes au plus ;
//   - AUCUN en-tete ajoute (ni User-Agent personnalise, ni nom, ni e-mail).
// Le lien entre l'adresse et le contenu colle est garanti par un jeton signe
// (lib/import-listing/token.ts) delivre a l'analyse du contenu colle.

export const MAX_REMOTE_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 20000;

export type FetchImageResult = { ok: true; buffer: Buffer } | { ok: false; code: "url" | "http" | "not_image" | "too_large" | "network" };

function privateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Adresse acceptable pour un telechargement d'image. */
export function safeImageUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (!host.includes(".") || host === "localhost" || /\.(local|localhost|internal|lan|home|corp)$/.test(host)) return null;
  if (host.startsWith("[") || host.includes(":") || privateIpv4(host)) return null;
  return u;
}

const SIGNATURES: ((b: Uint8Array) => boolean)[] = [
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // JPEG
  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, // PNG
  (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45, // WebP
  (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46, // GIF
  (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70, // HEIC, AVIF (ftyp)
  (b) => (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[3] === 0x2a), // TIFF
];

export function looksLikeImage(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && SIGNATURES.some((s) => s(bytes));
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function fetchPastedImage(raw: string, fetcher: Fetcher = fetch): Promise<FetchImageResult> {
  const first = safeImageUrl(raw);
  if (!first) return { ok: false, code: "url" };
  let url: URL = first;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetcher(url.toString(), { redirect: "manual", signal: ctrl.signal, cache: "no-store" });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        let nextUrl: URL | null = null;
        try {
          nextUrl = next ? safeImageUrl(new URL(next, url).toString()) : null;
        } catch {
          nextUrl = null;
        }
        if (!nextUrl || hop === 3) return { ok: false, code: "url" };
        url = nextUrl;
        continue;
      }
      break;
    }
    if (!res || !res.ok || !res.body) {
      await res?.body?.cancel().catch(() => {});
      return { ok: false, code: "http" };
    }
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (type && !type.startsWith("image/") && !type.startsWith("application/octet-stream") && !type.startsWith("binary/")) {
      await res.body.cancel().catch(() => {});
      return { ok: false, code: "not_image" };
    }
    if (declared > MAX_REMOTE_BYTES) {
      await res.body.cancel().catch(() => {});
      return { ok: false, code: "too_large" };
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REMOTE_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, code: "too_large" };
      }
      // Premiers octets : une image, sinon arret immediat.
      if (chunks.length === 0 && value.byteLength >= 12 && !looksLikeImage(value)) {
        await reader.cancel().catch(() => {});
        return { ok: false, code: "not_image" };
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    if (!looksLikeImage(buffer)) return { ok: false, code: "not_image" };
    return { ok: true, buffer };
  } catch {
    return { ok: false, code: "network" };
  } finally {
    clearTimeout(timer);
  }
}

// Sert le build de production Next.js : vrai serveur local sur 127.0.0.1
// quand l'ecoute est permise, sinon EN MEMOIRE, sans ouvrir de port (bac a
// sable qui interdit toute ecoute TCP ou socket local). Chaque requete
// passe par le gestionnaire officiel de Next (app.getRequestHandler) avec
// une requete et une reponse Node construites sur un faux socket ; la
// reponse HTTP brute est ensuite decodee (en-tetes, chunked).

import http from "node:http";
import { Duplex } from "node:stream";
import path from "node:path";
import next from "next";

export interface InProcessResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Options d'une requete (suite de securite : POST, en-tetes, corps JSON). */
export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

class CaptureSocket extends Duplex {
  chunks: Buffer[] = [];
  remoteAddress = "127.0.0.1";
  _read() {}
  _write(chunk: Buffer, _enc: BufferEncoding, cb: () => void) {
    this.chunks.push(Buffer.from(chunk));
    cb();
  }
  setTimeout() { return this; }
  setNoDelay() { return this; }
  setKeepAlive() { return this; }
  destroySoon() { this.end(); }
}

function parseRawResponse(raw: Buffer): InProcessResponse {
  const sep = raw.indexOf("\r\n\r\n");
  const head = raw.subarray(0, sep).toString("latin1").split("\r\n");
  const status = Number(head[0].split(" ")[1]);
  const headers: Record<string, string> = {};
  for (const line of head.slice(1)) {
    const i = line.indexOf(":");
    headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  let body = raw.subarray(sep + 4);
  if (headers["transfer-encoding"]?.includes("chunked")) {
    const parts: Buffer[] = [];
    let pos = 0;
    while (pos < body.length) {
      const lineEnd = body.indexOf("\r\n", pos);
      const size = parseInt(body.subarray(pos, lineEnd).toString(), 16);
      if (!size) break;
      parts.push(body.subarray(lineEnd + 2, lineEnd + 2 + size));
      pos = lineEnd + 2 + size + 2;
    }
    body = Buffer.concat(parts);
  }
  return { status, headers, body: body.toString("utf8") };
}

/**
 * Nov. 2026 (audit SEO, F5) : sur le Mac de Julien, les pages rendues a la
 * demande qui lisent Supabase (liste des biens, simulateur de financement,
 * capacite d'emprunt, page 404) expiraient dans ce serveur alors que le vrai
 * serveur repond en 0,2 s. Cause la plus probable (non reproduite ici, le bac
 * a sable n'a ni build complet ni reseau) : le faux socket. Ces pages sont
 * envoyees en flux (rendu en continu de React), que Next.js pousse dans la
 * reponse Node en s'appuyant sur les evenements d'un vrai socket ; le faux
 * socket ne les emet jamais, la reponse ne se termine pas. Les pages
 * pre-generees, servies d'un bloc, n'etaient pas touchees.
 * Correctif : quand l'ecoute locale est permise (Mac de Julien), un VRAI
 * serveur HTTP sur 127.0.0.1 (port libre choisi par le systeme), avec le
 * meme gestionnaire Next.js ; sinon (bac a sable), repli sur le faux socket.
 * SEO_IN_MEMORY=1 force le faux socket.
 */
async function tryRealServer(handle: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>) {
  if (process.env.SEO_IN_MEMORY === "1") return null;
  const server = http.createServer((req, res) => void handle(req, res));
  const port = await new Promise<number | null>((resolve) => {
    server.once("error", () => resolve(null));
    server.listen(0, "127.0.0.1", () => {
      const a = server.address();
      resolve(a && typeof a === "object" ? a.port : null);
    });
  });
  if (!port) return null;
  const request = (url: string, opts: RequestOptions = {}) =>
    new Promise<InProcessResponse>((resolve, reject) => {
      const r = http.request(
        {
          host: "127.0.0.1",
          port,
          path: url,
          method: opts.method ?? "GET",
          headers: {
            host: "mapaproperty.lu",
            "accept-language": "fr",
            "user-agent": "seo-onpage-test",
            "x-forwarded-proto": "https",
            ...(opts.body !== undefined ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(opts.body)) } : {}),
            ...opts.headers,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => {
            const headers: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : v;
            resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8") });
          });
        },
      );
      r.on("error", reject);
      if (opts.body !== undefined) r.write(opts.body);
      r.end();
    });
  return { request, close: () => new Promise<void>((done) => server.close(() => done())) };
}

export async function createInProcessServer(dir = process.cwd()) {
  const app = next({ dev: false, dir, quiet: true });
  await app.prepare();
  const handle = app.getRequestHandler();
  const real = await tryRealServer(handle);
  if (real) {
    return {
      request: real.request,
      close: async () => {
        await real.close();
        await app.close();
      },
    };
  }

  async function request(url: string, opts: RequestOptions = {}): Promise<InProcessResponse> {
    const socket = new CaptureSocket();
    const req = new http.IncomingMessage(socket as never);
    req.method = opts.method ?? "GET";
    req.url = url;
    req.headers = {
      host: "mapaproperty.lu",
      "accept-language": "fr",
      "user-agent": "seo-onpage-test",
      "x-forwarded-proto": "https",
      ...(opts.body !== undefined
        ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(opts.body)) }
        : {}),
      ...opts.headers,
    };
    if (opts.body !== undefined) req.push(opts.body);
    req.push(null);
    const res = new http.ServerResponse(req);
    res.assignSocket(socket as never);
    const done = new Promise<void>((resolve) => res.on("finish", () => resolve()));
    await handle(req, res);
    await done;
    return parseRawResponse(Buffer.concat(socket.chunks));
  }

  return { request, close: () => app.close() };
}

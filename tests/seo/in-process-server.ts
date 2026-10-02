// Sert le build de production Next.js EN MEMOIRE, sans ouvrir de port
// (la machine interdit toute ecoute TCP ou socket local). Chaque requete
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

export async function createInProcessServer(dir = process.cwd()) {
  const app = next({ dev: false, dir, quiet: true });
  await app.prepare();
  const handle = app.getRequestHandler();

  async function request(url: string, method = "GET"): Promise<InProcessResponse> {
    const socket = new CaptureSocket();
    const req = new http.IncomingMessage(socket as never);
    req.method = method;
    req.url = url;
    req.headers = {
      host: "mapaproperty.lu",
      "accept-language": "fr",
      "user-agent": "seo-onpage-test",
      "x-forwarded-proto": "https",
    };
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

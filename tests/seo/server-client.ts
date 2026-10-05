// Client du serveur en memoire : lance tests/seo/server-process.mts dans un
// processus Node enfant (IPC, aucun port) et lui transmet les requetes.
import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import type { InProcessResponse, RequestOptions } from "./in-process-server";

const REQUEST_TIMEOUT_MS = Number(process.env.SEO_REQUEST_TIMEOUT_MS ?? 30000);

export async function startServerProcess() {
  const root = path.resolve(__dirname, "../..");
  const child: ChildProcess = fork(path.join(__dirname, "server-process.mts"), [], {
    cwd: root,
    execArgv: ["--import", "tsx"],
    // Environnement nettoye : sans les options de chargement du worker
    // Playwright (NODE_OPTIONS, variables PW_*), qui bloquent Next.js.
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([k]) => k !== "NODE_OPTIONS" && !/^(PW_|PLAYWRIGHT_|TEST_)/.test(k),
      ),
    ) as NodeJS.ProcessEnv,
    // Journaux du serveur ignores (sinon un tube non lu se remplit et
    // bloque le processus enfant). SEO_SERVER_LOGS=1 pour les afficher.
    stdio: ["ignore", "ignore", process.env.SEO_SERVER_LOGS === "1" ? "inherit" : "ignore", "ipc"],
  });
  const pending = new Map<number, (r: InProcessResponse) => void>();
  let seq = 0;
  await new Promise<void>((resolve, reject) => {
    child.once("exit", (code) => reject(new Error(`serveur en memoire arrete (code ${code})`)));
    child.on("message", (m: { ready?: boolean; id?: number; ok?: boolean; response?: InProcessResponse; error?: string }) => {
      if (m.ready) return resolve();
      const done = pending.get(m.id!);
      if (!done) return;
      pending.delete(m.id!);
      done(m.ok ? m.response! : { status: 599, headers: {}, body: m.error ?? "" });
    });
  });
  return {
    request(url: string, opts?: RequestOptions): Promise<InProcessResponse> {
      const id = ++seq;
      return new Promise((resolve) => {
        // Delai maximal : une reponse qui ne se termine pas est un echec
        // (statut 598), jamais un blocage de la suite.
        const timer = setTimeout(() => {
          pending.delete(id);
          resolve({ status: 598, headers: {}, body: "timeout" });
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, (r) => {
          clearTimeout(timer);
          resolve(r);
        });
        child.send({ id, url, opts });
      });
    },
    async close() {
      child.kill();
    },
  };
}

// Processus enfant : charge le build de production en memoire (sans port)
// et repond aux requetes recues par le canal IPC du processus parent
// (child_process.fork). Isole Next.js du chargeur TypeScript de Playwright.
import { createInProcessServer } from "./in-process-server";

const server = await createInProcessServer();
process.on("message", async (msg: { id: number; url: string }) => {
  try {
    const r = await server.request(msg.url);
    process.send!({ id: msg.id, ok: true, response: r });
  } catch (e) {
    process.send!({ id: msg.id, ok: false, error: String(e) });
  }
});
process.send!({ ready: true });

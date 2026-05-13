import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

type AuthResult = { ok: true } | { ok: false; status: number; body: { ok: false; reason: string } };

async function requireAdmin(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, status: 401, body: { ok: false, reason: "unauthorized" } };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, body: { ok: false, reason: "unauthorized" } };
  }
}

type RouteEntry = { path: string; sizeKb: number };

async function fileSizeBytes(file: string, staticDir: string): Promise<number> {
  // Chunks listés en chemin relatif depuis .next/
  const candidates = [
    path.join(staticDir, file),
    path.join(staticDir, "..", file),
  ];
  for (const c of candidates) {
    try {
      const stat = await fs.stat(c);
      return stat.size;
    } catch {
      // continue
    }
  }
  return 0;
}

async function readManifest(rootDir: string): Promise<Record<string, string[]> | null> {
  const candidates = [
    path.join(rootDir, ".next", "app-build-manifest.json"),
    path.join(rootDir, ".next", "build-manifest.json"),
  ];
  for (const c of candidates) {
    try {
      const raw = await fs.readFile(c, "utf-8");
      const json = JSON.parse(raw) as
        | { pages?: Record<string, string[]> }
        | Record<string, string[]>;
      if ("pages" in json && json.pages && typeof json.pages === "object") {
        return json.pages as Record<string, string[]>;
      }
      return json as Record<string, string[]>;
    } catch {
      // continue
    }
  }
  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const rootDir = process.cwd();
  const nextDir = path.join(rootDir, ".next");
  const staticDir = path.join(nextDir, "static");

  // Vérifie que .next/ existe (build présent)
  try {
    await fs.access(nextDir);
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "no_build",
      message: "Aucun dossier .next/ trouvé. Lancer pnpm build d'abord.",
    });
  }

  const manifest = await readManifest(rootDir);
  if (!manifest) {
    return NextResponse.json({
      ok: false,
      reason: "no_manifest",
      message:
        "Aucun build-manifest.json/app-build-manifest.json trouvé dans .next/. Lancer pnpm build.",
    });
  }

  const entries: RouteEntry[] = [];
  for (const [routePath, files] of Object.entries(manifest)) {
    if (!Array.isArray(files)) continue;
    let total = 0;
    for (const f of files) {
      total += await fileSizeBytes(f, staticDir);
    }
    if (total === 0) continue;
    entries.push({ path: routePath, sizeKb: Math.round((total / 1024) * 10) / 10 });
  }

  entries.sort((a, b) => b.sizeKb - a.sizeKb);
  const routes = entries.slice(0, 10);

  return NextResponse.json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    routes,
    totalRoutes: entries.length,
  });
}

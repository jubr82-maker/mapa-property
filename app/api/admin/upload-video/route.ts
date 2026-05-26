// Sprint C11-bis — POST /api/admin/upload-video
//
// Endpoint admin pour uploader directement une video vers Cloudflare R2
// depuis /admin (sera consomme par /admin/biens/edit dans un sprint
// futur). Auth admin obligatoire (meme pattern que /api/admin/estimations).
//
// Body : multipart/form-data
//   - file : File (video mp4/webm/mov)
//   - filename : string optionnel (sinon derive du nom du File)
//
// Reponse : { success: true, filename, publicUrl, size }
//
// Notes :
// - Pas de compression cote serveur (ffmpeg-static non installe, Vercel
//   serverless 50 MB limite). Le client uploade un fichier deja compresse
//   par lui-meme (UI futur via ffmpeg.wasm) OU on accepte tel quel jusqu'a
//   200 MB en migrant l'endpoint vers Edge / streaming si necessaire.
// - Vercel serverless body limit : 4.5 MB par defaut. Vercel Pro permet
//   jusqu'a 50 MB via config. Au-dela, passer par uploads directs R2
//   (presigned URLs) — pas requis pour le 1er use case.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { uploadToR2, isR2Configured } from "@/lib/r2";

const ALLOWED_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (limite Vercel Pro)

export async function POST(req: Request) {
  // 1. Auth admin (pattern Supabase SSR — meme que /api/admin/estimations).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Verifier que R2 est configure cote serveur.
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "r2_not_configured" },
      { status: 503 },
    );
  }

  // 3. Parse multipart.
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "invalid_content_type", got: file.type },
      { status: 415 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", max_mb: MAX_SIZE_BYTES / 1024 / 1024 },
      { status: 413 },
    );
  }

  // 4. Sanitize filename : si l'admin envoie un name custom on l'utilise,
  //    sinon on derive du File. Aucun chemin (slash interdit), extension
  //    forcee a partir du content-type pour eviter les .exe deguises.
  const ext =
    file.type === "video/mp4"
      ? "mp4"
      : file.type === "video/webm"
        ? "webm"
        : "mov";
  const rawName = String(form.get("filename") ?? file.name ?? "video");
  const safeBase = rawName
    .replace(/[^\w\-.]/g, "-")
    .replace(/\.[^.]+$/, "")
    .slice(0, 80) || "video";
  const filename = `${safeBase}.${ext}`;

  // 5. Upload R2 (multipart resilient via lib-storage).
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await uploadToR2(buffer, filename, file.type);
    return NextResponse.json({
      success: true,
      filename: result.filename,
      publicUrl: result.publicUrl,
      size: result.size,
    });
  } catch (err) {
    console.error("[api/admin/upload-video] upload failed:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}

// Force runtime Node (lib-storage utilise Buffer/stream Node API).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

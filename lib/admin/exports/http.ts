// lib/admin/exports/http.ts : reponses HTTP + noms de fichiers partages
// pour les exports admin. Aucune de ces reponses ne doit etre mise en
// cache par le CDN (no-store), et aucune ne doit etre generee sans que
// l'appelant ait deja verifie requireAdminRoute() dans la meme fonction.
import { NextResponse } from "next/server";

const NO_STORE = "private, no-store, max-age=0, must-revalidate";

export function excelResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": NO_STORE,
    },
  });
}

export function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": NO_STORE,
    },
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ex. exportListFilename("leads") -> "mapa-leads-2026-09-20.xlsx" */
export function exportListFilename(prefix: string): string {
  return `mapa-${prefix}-${todayIso()}.xlsx`;
}

/** Ex. exportFicheFilename("lead", id) -> "mapa-lead-3f9a21c0-2026-09-20.pdf" */
export function exportFicheFilename(prefix: string, id: string): string {
  return `mapa-${prefix}-${id.slice(0, 8)}-${todayIso()}.pdf`;
}

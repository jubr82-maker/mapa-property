import { notFound } from "next/navigation";

// Toute adresse inconnue sous une langue (oct. 2026) : page 404 utile de la
// langue (app/[locale]/not-found.tsx), avec le menu et le pied de page.
export default function CatchAllNotFound() {
  notFound();
}

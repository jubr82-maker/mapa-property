"use client";

// Point d'entree stable pour app/[locale]/layout.tsx. La bulle (petite,
// toujours visible) est importee normalement : c'est volontaire, elle doit
// s'afficher des l'hydratation. Le panneau de conversation, lui, n'est
// importe qu'a l'ouverture (cf. next/dynamic dans ChatbotBubble.tsx) —
// c'est lui qui pesait sur le JS charge sur chaque page avant cette passe.
import { ChatbotBubble } from "./ChatbotBubble";

export function ChatbotWidgetLoader() {
  return <ChatbotBubble />;
}

"use client";

// Wrapper Client : permet de charger ChatbotWidget en dynamic import sans SSR,
// pour qu'il ne pèse pas sur le bundle JS initial / le LCP de la home et des
// fiches biens. Le widget n'apparaît qu'après hydratation (impact UX nul,
// il s'ouvre déjà au clic utilisateur).
import dynamic from "next/dynamic";

const ChatbotWidget = dynamic(
  () => import("./ChatbotWidget").then((m) => ({ default: m.ChatbotWidget })),
  {
    ssr: false,
    loading: () => null,
  },
);

export function ChatbotWidgetLoader() {
  return <ChatbotWidget />;
}

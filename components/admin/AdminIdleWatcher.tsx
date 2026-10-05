"use client";

// Deconnexion automatique cote navigateur apres ADMIN_IDLE_TIMEOUT_MINUTES
// sans interaction (clavier, souris, toucher, defilement) : un ecran admin
// laisse ouvert se ferme de lui-meme. Le serveur applique la meme regle
// (proxy.ts, cookie d'activite), y compris si ce composant est contourne.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/admin/auth-actions";
import { ADMIN_IDLE_TIMEOUT_MINUTES } from "@/lib/admin/security-config";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;

export function AdminIdleWatcher() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const limit = ADMIN_IDLE_TIMEOUT_MINUTES * 60_000;
    const expire = async () => {
      await logoutAction();
      router.replace("/admin/login?reason=idle");
      router.refresh();
    };
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void expire(), limit);
    };
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router]);

  return null;
}

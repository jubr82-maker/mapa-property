"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "phones" | "emails";

interface Contact {
  label: string;
  value: string;
  href: string;
  role: "primary" | "secondary";
}

const PHONES: Contact[] = [
  {
    label: "Julien",
    value: "+352 691 620 127",
    href: "tel:+352691620127",
    role: "primary",
  },
  {
    label: "Frédéric",
    value: "+352 691 113 018",
    href: "tel:+352691113018",
    role: "secondary",
  },
];

const EMAILS: Contact[] = [
  {
    label: "Julien",
    value: "j.brebion@mapagroup.org",
    href: "mailto:j.brebion@mapagroup.org",
    role: "primary",
  },
  {
    label: "Administration MAPA",
    value: "admin@mapagroup.org",
    href: "mailto:admin@mapagroup.org",
    role: "secondary",
  },
];

export function ContactButtons({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact" | "dark";
  className?: string;
}) {
  const [open, setOpen] = useState<Mode | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    if (open) {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const btnBase =
    variant === "dark"
      ? "border-white/30 text-white hover:border-gold hover:text-gold"
      : "border-line text-ink hover:border-gold hover:text-gold";

  return (
    <div ref={wrapperRef} className={`relative inline-flex flex-wrap items-center gap-2 ${className}`}>
      <ContactButton
        label="Nous appeler"
        icon="phone"
        active={open === "phones"}
        onClick={() => setOpen(open === "phones" ? null : "phones")}
        baseCls={btnBase}
        compact={variant === "compact"}
      />
      <ContactButton
        label="Envoyer un email"
        icon="mail"
        active={open === "emails"}
        onClick={() => setOpen(open === "emails" ? null : "emails")}
        baseCls={btnBase}
        compact={variant === "compact"}
      />

      {open && (
        <div className="absolute top-full left-0 z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gold/40 bg-bg shadow-xl shadow-ink/15">
          <ul className="divide-y divide-line/40">
            {(open === "phones" ? PHONES : EMAILS).map((c) => (
              <li key={c.value}>
                <a
                  href={c.href}
                  className={`flex items-baseline justify-between gap-3 px-4 transition-colors hover:bg-bg-soft ${
                    c.role === "primary" ? "py-3" : "py-2.5"
                  }`}
                  onClick={() => setOpen(null)}
                >
                  <span
                    className={
                      c.role === "primary"
                        ? "font-mono text-[10px] uppercase tracking-[0.25em] text-gold-deep"
                        : "font-mono text-[9px] uppercase tracking-[0.25em] text-ink-soft/70"
                    }
                  >
                    {c.label}
                  </span>
                  <span
                    className={
                      c.role === "primary"
                        ? "font-display text-base font-bold text-ink"
                        : "font-display text-sm text-ink/70"
                    }
                  >
                    {c.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ContactButton({
  label,
  icon,
  active,
  onClick,
  baseCls,
  compact,
}: {
  label: string;
  icon: "phone" | "mail";
  active: boolean;
  onClick: () => void;
  baseCls: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono uppercase tracking-[0.2em] transition-colors ${baseCls} ${
        compact ? "text-[10px]" : "text-[11px]"
      } ${active ? "border-gold text-gold" : ""}`}
    >
      {icon === "phone" ? (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.89.7 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.11-.45c.89.33 1.82.57 2.78.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 5L2 7" />
        </svg>
      )}
      {label}
    </button>
  );
}

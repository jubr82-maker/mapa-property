import { Link } from "@/i18n/navigation";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

// Logo bicolore MAPA Property (2026-05) — wordmark stacké (mark officiel in-repo).
// Wordmark = currentColor → hérite du token texte (ink #1A1F2A clair / blanc nuit)
// via la classe text-ink. Filet copper #B8865A FIXE sur les 2 modes.
// Aucune logique "if dark" : l'inversion vient du binding token (Decision 2).
const sizeClass: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
};

function Wordmark({ className, size }: { className: string; size: NonNullable<LogoProps["size"]> }) {
  return (
    <svg
      viewBox="0 0 320 160"
      role="img"
      aria-label="MAPA Property"
      className={`w-auto select-none text-ink ${sizeClass[size]} ${className}`}
      style={{ fontFamily: "var(--font-display), Impact, 'Arial Black', sans-serif" }}
    >
      <title>MAPA Property</title>
      <text
        x="160"
        y="80"
        textAnchor="middle"
        fill="currentColor"
        fontWeight={700}
        fontSize={72}
        letterSpacing={4}
      >
        MAPA
      </text>
      {/* Filet copper signature — FIXE (jamais inversé) */}
      <line x1="80" y1="100" x2="240" y2="100" stroke="#B8865A" strokeWidth={1.4} />
      <text
        x="167"
        y="128"
        textAnchor="middle"
        fill="currentColor"
        fontWeight={600}
        fontSize={22}
        letterSpacing={14}
      >
        PROPERTY
      </text>
    </svg>
  );
}

export function Logo({
  className = "",
  size = "md",
  asLink = true,
}: LogoProps) {
  const mark = <Wordmark className={className} size={size} />;

  if (!asLink) return mark;

  return (
    <Link
      href="/"
      aria-label="MAPA Property — accueil"
      className="inline-flex shrink-0 transition-opacity hover:opacity-80"
    >
      {mark}
    </Link>
  );
}

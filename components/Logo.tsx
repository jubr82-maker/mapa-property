import { Link } from "@/i18n/navigation";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

const sizeMap = {
  sm: { mapa: "text-2xl", property: "text-[9px]" },
  md: { mapa: "text-3xl", property: "text-[10px]" },
  lg: { mapa: "text-5xl", property: "text-xs" },
};

export function Logo({ className = "", size = "md", asLink = true }: LogoProps) {
  const sizes = sizeMap[size];

  const content = (
    <span className={`inline-flex flex-col items-start leading-none ${className}`}>
      <span
        className={`font-display font-black tracking-[-0.02em] text-ink ${sizes.mapa}`}
      >
        MAPA
      </span>
      <span
        aria-hidden
        className="gold-shine-bg mt-0.5 w-full self-stretch"
        style={{ height: 2 }}
      />
      <span
        className={`mt-1 font-mono uppercase tracking-[0.35em] text-ink-mid ${sizes.property}`}
      >
        Property
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      aria-label="MAPA Property — accueil"
      className="inline-flex shrink-0 transition-opacity hover:opacity-80"
    >
      {content}
    </Link>
  );
}

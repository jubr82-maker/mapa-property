import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

const sizeMap = {
  sm: { w: 96, h: 48 },
  md: { w: 140, h: 70 },
  lg: { w: 160, h: 80 },
};

export function Logo({
  className = "",
  size = "md",
  asLink = true,
}: LogoProps) {
  const { w, h } = sizeMap[size];

  const img = (
    <Image
      src="/logo-mapa-property.svg"
      alt="MAPA Property"
      width={w}
      height={h}
      priority
      unoptimized
      className={`select-none ${className}`}
    />
  );

  if (!asLink) return img;

  return (
    <Link
      href="/"
      aria-label="MAPA Property — accueil"
      className="inline-flex shrink-0 transition-opacity hover:opacity-80"
    >
      {img}
    </Link>
  );
}

import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

const sizeMap = {
  sm: { w: 140, h: 32 },
  md: { w: 210, h: 48 },
  lg: { w: 280, h: 64 },
};

export function Logo({
  className = "",
  size = "md",
  asLink = true,
}: LogoProps) {
  const { w, h } = sizeMap[size];

  const img = (
    <Image
      src="/logo-mapa-property.png"
      alt="MAPA Property"
      width={w}
      height={h}
      priority
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

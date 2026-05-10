import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
  variant?: "light" | "dark";
}

const sizeMap = {
  sm: { w: 120, h: 30 },
  md: { w: 160, h: 40 },
  lg: { w: 240, h: 60 },
};

export function Logo({
  className = "",
  size = "md",
  asLink = true,
  variant = "light",
}: LogoProps) {
  const { w, h } = sizeMap[size];
  const src = variant === "dark" ? "/logo-mapa-property-dark.svg" : "/logo-mapa-property.svg";

  const img = (
    <Image
      src={src}
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

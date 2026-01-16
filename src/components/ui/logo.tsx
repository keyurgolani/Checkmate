"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoVariant = "icon" | "full" | "text";

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  className?: string; // Additional classes for positioning/sizing within parent
}

export const Logo = ({
  variant = "full",
  size = 40,
  className,
}: LogoProps) => {
  // Use cache-busted logo path
  const logoSrc = "/logo_v2.png";

  const IconPart = (
    <div
      className={cn(
        "relative flex items-center justify-center transition-transform hover:scale-105",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image 
        src={logoSrc}
        alt="CheckMate Logo" 
        width={size * 2} 
        height={size * 2} 
        className="object-contain" 
        priority 
      />
    </div>
  );

  const TextPart = (
    <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
      CheckMate
    </span>
  );

  if (variant === "icon") {
    return IconPart;
  }

  if (variant === "text") {
    return TextPart;
  }

  return (
    <div className="flex items-center gap-2">
      {IconPart}
      {TextPart}
    </div>
  );
};

export const LogoLink = ({
  href = "/",
  variant = "full",
  size = 40,
  className,
}: LogoProps & { href?: string }) => {
  return (
    <Link href={href} className={cn("inline-flex no-underline", className)}>
      <Logo variant={variant} size={size} />
    </Link>
  );
};

"use client";

import * as React from "react";
import Image from "next/image";
import { Landmark } from "lucide-react";
import { getBankLogoUrl, getBankInitials } from "@/lib/bank-logos";
import { cn } from "@/lib/utils";

interface BankLogoProps {
  bankName: string | null | undefined;
  /** Tamaño del contenedor (el icono se escala). */
  size?: "sm" | "md" | "lg";
  /** Fondo transparente (para usar en esquina de tarjeta). */
  transparent?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

export function BankLogo({ bankName, size = "md", transparent = false, className }: BankLogoProps) {
  const logoUrl = getBankLogoUrl(bankName);
  const initials = getBankInitials(bankName);
  const [imgError, setImgError] = React.useState(false);
  const sizeClass = sizeClasses[size];
  const bgClass = transparent ? "bg-transparent" : "bg-white";

  if (!bankName?.trim()) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg text-muted-foreground",
          !transparent && "bg-muted",
          sizeClass,
          className
        )}
        aria-hidden
      >
        <Landmark className="size-1/2" />
      </div>
    );
  }

  if (logoUrl && !imgError) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size === "sm" ? 32 : size === "md" ? 40 : 48}
        height={size === "sm" ? 32 : size === "md" ? 40 : 48}
        className={cn("shrink-0 rounded-lg object-contain", bgClass, sizeClass, className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg text-primary font-bold text-[0.6em] leading-none",
        !transparent && "bg-primary/15",
        sizeClass,
        className
      )}
      title={bankName}
      aria-hidden
    >
      {initials}
    </div>
  );
}

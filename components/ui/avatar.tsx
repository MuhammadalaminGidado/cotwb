"use client";

import { useState } from "react";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: number;
  className?: string;
};

const sizeMap: Record<number, string> = {
  24: "size-6 text-xs",
  32: "size-8 text-xs",
  40: "size-10 text-sm",
  48: "size-12 text-sm",
};

export function Avatar({ src, name, alt, size = 40, className }: Props) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const showImage = !!src && !imgError;
  const sizeClasses = sizeMap[size] ?? "size-10 text-sm";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={alt ?? name ?? "Avatar"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded-full border border-border object-cover ${sizeClasses} ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      aria-label={alt ?? name ?? "Avatar"}
      className={`flex items-center justify-center rounded-full border border-border bg-accent-primary text-text-inverse font-medium select-none ${sizeClasses} ${className ?? ""}`}
    >
      {initials}
    </div>
  );
}

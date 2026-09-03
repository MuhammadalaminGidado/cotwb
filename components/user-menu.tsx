"use client";

import { UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/theme/clerk-appearance";

export function ClerkUserMenu() {
  return (
    <UserButton
      appearance={{
        ...clerkAppearance,
        elements: {
          ...clerkAppearance.elements,
          avatarBox: "h-8 w-8",
        },
      }}
    />
  );
}

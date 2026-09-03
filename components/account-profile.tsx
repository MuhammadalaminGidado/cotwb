"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { Avatar } from "@/components/ui/avatar";

export function AccountProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-border" />
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? null;
  // Google profile picture: Clerk's imageUrl is Google avatar when linked via OAuth
  const avatarSrc = user.imageUrl || null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar src={avatarSrc} name={displayName} alt={displayName ?? "Avatar"} size={40} />
        <div>
          <p className="text-sm font-medium text-text-primary">{displayName}</p>
          <p className="text-xs text-text-muted">
            {user.primaryEmailAddress?.emailAddress}
            {user.username ? ` · @${user.username}` : ""}
          </p>
        </div>
      </div>
      <SignOutButton>
        <button
          type="button"
          className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg"
        >
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}

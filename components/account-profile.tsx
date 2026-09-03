"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";

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

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.imageUrl}
          alt={user.fullName ?? user.username ?? "Avatar"}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full border border-border object-cover"
        />
        <div>
          <p className="text-sm font-medium text-text-primary">
            {user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress}
          </p>
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

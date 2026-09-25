"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAccountMenu({
  username,
  image,
  isAdmin,
  clerkReady,
}: {
  username: string;
  image: string | null;
  isAdmin: boolean;
  clerkReady: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const router = useRouter();
  const { signOut } = useClerk();
  const total = (isAdmin ? 1 : 0) + 1 + (clerkReady ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[total - 1]?.focus();
    }
  };

  const onItemKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[(idx + 1) % total]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(idx - 1 + total) % total]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut(() => router.push("/"));
    } catch {
      router.push("/sign-in");
    }
  };

  let idx = 0;
  const reviewIdx = isAdmin ? idx++ : -1;
  const settingsIdx = idx++;
  const signOutIdx = clerkReady ? idx++ : -1;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${username}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" aria-hidden className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-xs font-semibold text-text-inverse">
            {initials(username)}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm text-text-muted sm:inline">{username}</span>
        <ChevronDownIcon className="h-4 w-4 text-text-muted" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right rounded-xl border border-border bg-surface py-1 shadow-xl transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none"
        >
          {isAdmin && reviewIdx >= 0 ? (
            <Link
              ref={(el) => {
                itemRefs.current[reviewIdx] = el;
              }}
              href="/review-queue"
              role="menuitem"
              onKeyDown={(e) => onItemKeyDown(e, reviewIdx)}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
            >
              Review queue
            </Link>
          ) : null}
          <Link
            ref={(el) => {
              itemRefs.current[settingsIdx] = el;
            }}
            href="/settings"
            role="menuitem"
            onKeyDown={(e) => onItemKeyDown(e, settingsIdx)}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
          >
            Settings
          </Link>
          {clerkReady && signOutIdx >= 0 ? (
            <button
              ref={(el) => {
                itemRefs.current[signOutIdx] = el;
              }}
              type="button"
              role="menuitem"
              onKeyDown={(e) => onItemKeyDown(e, signOutIdx)}
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
            >
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

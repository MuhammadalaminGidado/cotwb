"use client";

import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

export function UserNavDropdown({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        buttonRef.current?.focus();
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
      itemRefs.current[itemRefs.current.length - 1]?.focus();
    }
  };

  const onItemKeyDown = (e: React.KeyboardEvent, idx: number, total: number) => {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:bg-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        <ChevronDownIcon className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right rounded-xl border border-border bg-surface py-1 shadow-xl transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none"
        >
          {isAdmin ? (
            <Link
              ref={(el) => {
                itemRefs.current[0] = el;
              }}
              href="/review-queue"
              role="menuitem"
              onKeyDown={(e) => onItemKeyDown(e, 0, isAdmin ? 2 : 1)}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
            >
              Review queue
            </Link>
          ) : null}
          <Link
            ref={(el) => {
              itemRefs.current[isAdmin ? 1 : 0] = el;
            }}
            href="/settings"
            role="menuitem"
            onKeyDown={(e) => onItemKeyDown(e, isAdmin ? 1 : 0, isAdmin ? 2 : 1)}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
          >
            Settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}

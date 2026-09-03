import { palette } from "./palette";

/**
 * Clerk appearance built from the app palette so sign-in/sign-up/modal
 * visually matches the rest of the app. Do not hardcode colors here —
 * always derive from `palette.light`.
 */
const p = palette.light;

export const clerkAppearance = {
  variables: {
    colorPrimary: p.accentPrimary,
    colorDanger: p.danger,
    colorSuccess: p.success,
    colorBackground: p.surface,
    colorText: p.textPrimary,
    colorTextSecondary: p.textMuted,
    colorInputBackground: p.surface,
    colorInputText: p.textPrimary,
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter)",
  },
  elements: {
    // Card / outer chrome
    card: "shadow-lg border border-border bg-surface",
    headerTitle: "font-serif text-text-primary",
    headerSubtitle: "text-text-muted",
    // Buttons
    formButtonPrimary:
      "bg-accent-primary hover:bg-accent-primary-light text-text-inverse",
    // Modal entrance — use app motion tokens so it doesn't clash
    modalContent: "data-[state=open]:animate-in data-[state=closed]:animate-out",
    // Footer
    footerActionLink: "text-accent-primary hover:text-accent-primary-light",
  },
};

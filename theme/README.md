# Theme Tokens

## Tokens

All colors are defined in `theme/tokens.css` as CSS custom properties.

| Token | Purpose |
|---|---|
| `--color-accent-primary` | Warm blue — nav, primary buttons, links |
| `--color-accent-primary-light` | Light warm blue — hover/active states for primary |
| `--color-accent-secondary` | Orange — CTAs, highlights, tags |
| `--color-accent-secondary-light` | Light orange — hover/active for secondary |
| `--color-accent-tertiary` | Light brown — borders, secondary text, editorial UI |
| `--color-accent-tertiary-light` | Light tan — subtle backgrounds, dividers |
| `--color-accent-quaternary` | Green — success states, "new" badges, prompts |
| `--color-accent-quaternary-light` | Light green — hover/active for quaternary |
| `--color-bg` | Page background |
| `--color-surface` | Cards, elevated surfaces |
| `--color-border` | Borders, dividers |
| `--color-text-primary` | Primary text |
| `--color-text-muted` | Secondary / muted text |
| `--color-text-inverse` | Text on dark/accent backgrounds |
| `--color-success` | Success states |
| `--color-danger` | Error states, destructive actions |
| `--color-warning` | Warning states |

Each token has a light value under `:root` and a dark value under `[data-theme="dark"]`.

## Tailwind Usage

Tokens are mapped to Tailwind utilities via `@theme inline` in `app/globals.css`:

```
bg-accent-primary, bg-accent-primary-light, bg-accent-secondary, bg-accent-secondary-light,
bg-accent-tertiary, bg-accent-tertiary-light, bg-accent-quaternary, bg-accent-quaternary-light,
bg-bg, bg-surface, bg-success, bg-danger, bg-warning
text-text-primary, text-text-muted, text-text-inverse
border-border, border-accent-tertiary-light
```

Always use these token-based classes. Never use raw Tailwind palette classes
(`bg-blue-500`, `text-zinc-600`, `bg-white`, etc.) or inline hex values.

## Swapping the Palette

When the real palette is ready (Phase 10), replace the hex values in
`theme/tokens.css` only. All components will update automatically — no other
file needs to change.

## Rules

- No hardcoded colors outside `theme/tokens.css`. Enforced by grep in every phase.
- No Tailwind default palette classes (`bg-blue-*`, `text-zinc-*`, etc.).
- Components reference tokens via Tailwind classes (`bg-bg`, `text-text-primary`, etc.).

## Font Style

Use Inter + Playfair with the weights 400-900

# Theme Tokens

## Tokens

All colors are defined in `theme/tokens.css` as CSS custom properties.

| Token | Purpose |
|---|---|
| `--color-bg` | Page background |
| `--color-surface` | Cards, elevated surfaces |
| `--color-text-primary` | Primary text |
| `--color-text-muted` | Secondary / muted text |
| `--color-accent` | Links, buttons, highlights |
| `--color-accent-contrast` | Text on accent backgrounds |
| `--color-border` | Borders, dividers |
| `--color-danger` | Error states, destructive actions |
| `--color-success` | Success states |

Each token has a light value under `:root` and a dark value under `[data-theme="dark"]`.

## Tailwind Usage

Tokens are mapped to Tailwind utilities via `@theme inline` in `app/globals.css`:

```
bg-bg, bg-surface, bg-accent, bg-danger, bg-success
text-text-primary, text-text-muted, text-accent, text-accent-contrast
border-border
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

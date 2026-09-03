// theme/palette.ts — single source of truth for all color values.
// theme/tokens.css is generated from / kept in lockstep with these constants.
// Do not edit one without the other — add a color here and add the corresponding CSS var.

export const palette = {
  light: {
    accentPrimary: "#2C5B7C",
    accentPrimaryLight: "#4A7FA5",
    accentSecondary: "#E07A3E",
    accentSecondaryLight: "#F0975C",
    accentTertiary: "#A9825C",
    accentTertiaryLight: "#D9C2A3",
    accentQuaternary: "#5B8C5A",
    accentQuaternaryLight: "#8FB88C",
    bg: "#FAF7F2",
    surface: "#FFFFFF",
    border: "#E4DCD0",
    textPrimary: "#2A2A28",
    textMuted: "#6B6560",
    textInverse: "#FAF7F2",
    success: "#5B8C5A",
    danger: "#B84C3E",
    warning: "#E0A23E",
  },
  dark: {
    accentPrimary: "#6FA0C4",
    accentPrimaryLight: "#8FB6D6",
    accentSecondary: "#E8975E",
    accentSecondaryLight: "#F0AD7E",
    accentTertiary: "#C4A67E",
    accentTertiaryLight: "#9C8362",
    accentQuaternary: "#7CA97A",
    accentQuaternaryLight: "#9EC29C",
    bg: "#1E1C1A",
    surface: "#29261F",
    border: "#3A362E",
    textPrimary: "#F2EEE6",
    textMuted: "#ABA398",
    textInverse: "#2A2A28",
    success: "#7CA97A",
    danger: "#D0685A",
    warning: "#E8B15E",
  },
} as const;

export type PaletteMode = keyof typeof palette;

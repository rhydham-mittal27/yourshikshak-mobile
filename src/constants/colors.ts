// Design tokens extracted from frontend theme.ts and global.css

export const T = {
  // ── Brand (from theme.ts palette.primary) ─────────────────────────────
  primary: "#2D68C4",
  primaryLight: "#5C8FD8",
  primaryDark: "#1E4A8C",
  primaryFg: "#FFFFFF",

  secondary: "#00B7EB",
  secondaryLight: "#33C9F0",

  // ── Semantic ──────────────────────────────────────────────────────────
  success: "#10B981",
  successLight: "#34D399",
  successDark: "#059669",
  error: "#EF4444",
  errorLight: "#F87171",
  warning: "#F59E0B",
  info: "#318CE7",

  // ── Backgrounds (from global.css :root) ───────────────────────────────
  background: "#F8FAFC", // --background
  paper: "#FFFFFF", // --card
  muted: "#F1F5F9", // --muted
  mutedFg: "#64748B", // --muted-foreground

  // ── Text (from theme.ts palette.text) ─────────────────────────────────
  textPrimary: "#1E293B", // Slate 800
  textSecondary: "#536878", // Blue Slate
  textDisabled: "#94A3B8", // Slate 400

  // ── Borders / Dividers ────────────────────────────────────────────────
  border: "#E2E8F0", // --border / theme.palette.divider
  borderFocus: "#2D68C4",

  // ── Dark hero surface (from TutorDashboardPage) ───────────────────────
  darkBg: "#0f172a",
  darkBgMid: "#1e293b",

  // ── Glassmorphism (from global.css) ───────────────────────────────────
  glassBg: "rgba(255, 255, 255, 0.80)",
  glassBorder: "rgba(255, 255, 255, 0.3)",

  // ── Radius (from theme.ts shape + component overrides) ────────────────
  radiusSm: 8,
  radiusMd: 10, // inputs, buttons
  radiusLg: 12, // shape.borderRadius
  radiusXl: 16, // cards (MuiCard)
  radiusXxl: 20, // dialogs
  radiusFull: 999,

  // ── Spacing ───────────────────────────────────────────────────────────
  xxs: 4,
  xs: 8,
  sm: 12,
  base: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
};

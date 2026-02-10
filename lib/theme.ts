export const colors = {
  primary: "#1A73E8",
  secondary: "#34A853",
  accent: "#FBBC04",
  error: "#EA4335",
  surface: "#F8F9FA",
  background: "#FFFFFF",
  textPrimary: "#202124",
  textSecondary: "#5F6368",
  border: "#DADCE0",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fonts = {
  regular: { fontSize: 14, color: colors.textSecondary },
  body: { fontSize: 16, color: colors.textPrimary },
  title: { fontSize: 20, fontWeight: "600" as const, color: colors.textPrimary },
  heading: { fontSize: 24, fontWeight: "600" as const, color: colors.textPrimary },
  hero: { fontSize: 32, fontWeight: "700" as const, color: colors.textPrimary },
} as const;

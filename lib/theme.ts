export const colors = {
  primary: "#1A73E8",
  secondary: "#34A853",
  accent: "#FBBC04",
  error: "#EA4335",
  success: "#34A853",
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
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const fonts = {
  regular: { fontSize: 14, fontFamily: "Nunito_600SemiBold", color: colors.textSecondary },
  body: { fontSize: 16, fontFamily: "Nunito_600SemiBold", color: colors.textPrimary },
  label: { fontSize: 14, fontFamily: "Nunito_700Bold", color: colors.textPrimary },
  title: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", color: colors.textPrimary },
  heading: { fontSize: 24, fontFamily: "Nunito_900Black", color: colors.textPrimary },
  hero: { fontSize: 32, fontFamily: "Nunito_900Black", color: colors.textPrimary },
  button: { fontSize: 16, fontFamily: "Nunito_900Black", color: colors.textPrimary },
} as const;

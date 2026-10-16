// Fixture for the DMCA agent blank (mirrors lib/config/business.ts, unfilled).
export const businessConfig = {
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "[support@yourdomain.com]",
  dmcaAgentEmail: process.env.EXPO_PUBLIC_DMCA_AGENT_EMAIL || "[dmca-agent@yourdomain.com]",
} as const;

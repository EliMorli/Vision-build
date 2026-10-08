/**
 * Business Configuration
 * 
 * Fill in these values before launching to production.
 * These are used in legal pages, emails, and support contact.
 */

export const businessConfig = {
  // Legal entity information
  legalName: "[YOUR LEGAL BUSINESS NAME]", // e.g., "VisionBuild Inc."
  entityType: "[ENTITY TYPE]", // e.g., "Delaware C Corporation"
  
  // Contact information
  mailingAddress: {
    street: "[STREET ADDRESS]",
    city: "[CITY]",
    state: "[STATE]",
    zip: "[ZIP CODE]",
    country: "United States",
  },
  
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "[support@yourdomain.com]",
  websiteDomain: "[yourdomain.com]",
  
  // Email configuration (for Resend)
  email: {
    fromName: "[Your Company Name]",
    replyTo: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "[support@yourdomain.com]",
  },
} as const;

/**
 * Check if business config is complete
 * Returns array of missing keys
 */
export function getIncompleteBusinessConfig(): string[] {
  const missing: string[] = [];
  
  if (businessConfig.legalName.startsWith("[")) {
    missing.push("LEGAL_NAME");
  }
  
  if (businessConfig.entityType.startsWith("[")) {
    missing.push("ENTITY_TYPE");
  }
  
  if (businessConfig.mailingAddress.street.startsWith("[")) {
    missing.push("MAILING_ADDRESS");
  }
  
  if (businessConfig.supportEmail.startsWith("[") || !businessConfig.supportEmail.includes("@")) {
    missing.push("SUPPORT_EMAIL");
  }
  
  if (businessConfig.websiteDomain.startsWith("[")) {
    missing.push("WEBSITE_DOMAIN");
  }
  
  if (businessConfig.email.fromName.startsWith("[")) {
    missing.push("EMAIL_FROM_NAME");
  }
  
  if (businessConfig.email.replyTo.startsWith("[")) {
    missing.push("EMAIL_REPLY_TO");
  }
  
  return missing;
}

/**
 * Format mailing address as string
 */
export function getFormattedAddress(): string {
  const addr = businessConfig.mailingAddress;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}, ${addr.country}`;
}

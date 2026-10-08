/**
 * Business Configuration (Server-side)
 * 
 * Fill in these values before launching to production.
 * These are used in email footers and server-side communications.
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
  
  supportEmail: Deno.env.get("SUPPORT_EMAIL") || "[support@yourdomain.com]",
  websiteDomain: "[yourdomain.com]",
  
  // Email configuration (for Resend)
  email: {
    fromName: "[Your Company Name]",
    replyTo: Deno.env.get("SUPPORT_EMAIL") || "[support@yourdomain.com]",
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

/**
 * Get email footer HTML for Resend emails
 */
export function getEmailFooter(): string {
  return `
<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
  <p><strong>${businessConfig.legalName}</strong></p>
  <p>${getFormattedAddress()}</p>
  <p>
    <a href="https://${businessConfig.websiteDomain}/privacy" style="color: #1a73e8; text-decoration: none;">Privacy Policy</a> | 
    <a href="https://${businessConfig.websiteDomain}/terms" style="color: #1a73e8; text-decoration: none;">Terms of Service</a>
  </p>
  <p>Questions? Contact us at <a href="mailto:${businessConfig.supportEmail}" style="color: #1a73e8; text-decoration: none;">${businessConfig.supportEmail}</a></p>
</div>
`;
}

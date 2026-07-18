export const ADMIN_EMAILS = [
  "gallerykuns@gmail.com",
  "sylove887@gmail.com",
];

export const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const isAdminEmail = (email) => ADMIN_EMAILS.includes(normalizeEmail(email));

// Backward-compatible aliases for existing imports.
export const normalizeAdminEmail = normalizeEmail;
export const isEmailAdmin = isAdminEmail;

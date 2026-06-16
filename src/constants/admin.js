export const ADMIN_EMAILS = ["gallerykuns@gmail.com", "sklove887@gmail.com"];

export const normalizeAdminEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const isEmailAdmin = (email) => ADMIN_EMAILS.includes(normalizeAdminEmail(email));

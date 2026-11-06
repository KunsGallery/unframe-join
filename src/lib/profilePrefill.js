const PROFILE_FIELDS = ["realName", "stageName", "englishName", "brandName", "birthYear", "phone", "snsLink"];

// Accounts that already saved details have been here before, even without the seen flag.
export const shouldShowWelcomeGuide = (profile) => {
  if (profile?.welcomeSeenAt) return false;
  return !PROFILE_FIELDS.some((key) => String(profile?.[key] ?? "").trim());
};

// Fills only what is still empty, so anything already typed is kept.
export const fillContactFromProfile = (form, profile, email = "") => ({
  ...form,
  name: form.name || profile?.realName || "",
  phone: form.phone || profile?.phone || "",
  email: form.email || email || "",
  organization: form.organization || profile?.brandName || profile?.stageName || "",
});

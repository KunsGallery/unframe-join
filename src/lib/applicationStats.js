const OPEN_CALL_STATUS = { review: "review", shortlisted: "review", selected: "confirmed", rejected: "rejected" };
const SALON_STATUS = { submitted: "review", waitlisted: "review", approved: "confirmed", rejected: "rejected", cancelled: "cancelled" };

const isOpenCall = (app) => app?.trackType === "open-call" || Boolean(app?.openCallId || app?.openCallTitle);
const isSalon = (app) => app?.trackType === "salon" || Boolean(app?.salonId || app?.salonTitle);

// Each track records its decision differently; this puts them on one scale.
// An open call's own status stays "review" for life, its decision is openCallReviewStatus.
export const getDecisionStatus = (app) => {
  if (isOpenCall(app)) return OPEN_CALL_STATUS[app.openCallReviewStatus] || "review";
  if (isSalon(app)) return SALON_STATUS[app.status] || app.status;
  return app?.status;
};

// Salon lists keep their own status names; only an open call's status hides its decision.
export const getListStatus = (app) => (isOpenCall(app) ? getDecisionStatus(app) : app?.status);

export const getApplicationStats = (applications) => ({
  total: applications.length,
  pending: applications.filter((app) => getDecisionStatus(app) === "review").length,
  confirmed: applications.filter((app) => getDecisionStatus(app) === "confirmed").length,
});

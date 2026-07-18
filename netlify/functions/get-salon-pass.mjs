import { adminDb } from "./_lib/firebaseAdmin.mjs";
import {
  applicationsPath,
  formatDateParts,
  getBaseUrl,
  hashToken,
  isExpired,
  json,
  salonEventsPath,
} from "./_lib/salonShared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const token = event.queryStringParameters?.token || "";
    if (token.length < 32) return json(400, { valid: false, error: "유효하지 않은 QR입니다." });
    const query = await adminDb.collection(applicationsPath)
      .where("qrTokenHash", "==", hashToken(token)).limit(1).get();
    if (query.empty) return json(404, { valid: false, error: "유효하지 않은 QR입니다." });
    const application = query.docs[0].data();
    if (application.trackType !== "salon" || application.status !== "approved") {
      return json(403, { valid: false, error: "사용할 수 없는 QR입니다." });
    }
    if (!application.checkedInAt && isExpired(application.qrExpiresAt)) {
      return json(410, { valid: false, expired: true, error: "만료된 QR입니다." });
    }
    const salonSnap = await adminDb.collection(salonEventsPath).doc(application.salonId).get();
    if (!salonSnap.exists) return json(404, { valid: false, error: "행사를 찾을 수 없습니다." });
    const salon = salonSnap.data();
    return json(200, {
      valid: true,
      salonTitle: salon.title || application.salonTitle || "UNFRAME SALON",
      applicantDisplayName: application.nickname || application.applicantName || "참가자",
      eventDateTime: formatDateParts(salon.eventStartAt).eventDateTime,
      venueName: salon.venueName || "",
      qrPayload: `${getBaseUrl()}/salon/check-in-token?token=${encodeURIComponent(token)}`,
      shortCode: hashToken(token).slice(0, 6).toUpperCase(),
      checkedIn: Boolean(application.checkedInAt),
      checkedInAt: application.checkedInAt || null,
      programUrl: salon.links?.programUrl || "",
      guestbookUrl: salon.links?.guestbookUrl || "",
      welcomeScreenTitle: salon.checkInSettings?.welcomeScreenTitle || "어서 오세요",
      welcomeScreenMessage: salon.checkInSettings?.welcomeScreenMessage || "",
    });
  } catch (error) {
    return json(500, { valid: false, error: error.message || "QR 정보를 불러오지 못했습니다." });
  }
}

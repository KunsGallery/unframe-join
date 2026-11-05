import { adminDb, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";
import { applicationsPath, deriveQrToken, hashToken, isExpired, json, parseBody } from "./_lib/salonShared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await verifyUserRequest(event);
    const { applicationId } = parseBody(event);
    if (typeof applicationId !== "string" || !applicationId || applicationId.includes("/")) {
      return json(400, { error: "신청 정보가 필요합니다." });
    }
    const snapshot = await adminDb.collection(applicationsPath).doc(applicationId).get();
    if (!snapshot.exists || snapshot.data().userId !== user.uid) {
      return json(404, { error: "신청 내역을 찾을 수 없습니다." });
    }
    const application = snapshot.data();
    if (application.trackType !== "salon" || application.status !== "approved") {
      return json(403, { error: "참가 확정 후 QR을 확인할 수 있습니다." });
    }
    if (!application.checkedInAt && isExpired(application.qrExpiresAt)) {
      return json(410, { error: "입장 QR이 만료되었습니다." });
    }
    if (!application.qrTokenNonce || !application.qrTokenHash) {
      return json(409, { error: "QR 발급 정보를 확인할 수 없습니다. 운영팀에 문의해 주세요." });
    }
    const token = deriveQrToken({ applicationId, version: application.qrTokenVersion, nonce: application.qrTokenNonce });
    if (hashToken(token) !== application.qrTokenHash) {
      return json(409, { error: "QR을 복원할 수 없습니다. 운영팀에 문의해 주세요." });
    }
    return json(200, { token });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "QR을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
}

import { adminDb, verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import {
  applicationsPath,
  getBaseUrl,
  json,
  parseBody,
  deriveQrToken,
  hashToken,
  issueQrToken,
  salonEventsPath,
  sendSalonAlimtalk,
} from "./_lib/salonShared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    await verifyAdminRequest(event);
    const { applicationId, action = "approve" } = parseBody(event);
    if (!applicationId) return json(400, { error: "applicationId가 필요합니다." });

    const appRef = adminDb.collection(applicationsPath).doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) return json(404, { error: "신청자를 찾을 수 없습니다." });
    const application = { id: appSnap.id, ...appSnap.data() };
    if (application.trackType !== "salon") return json(400, { error: "SALON 신청이 아닙니다." });
    const salonSnap = await adminDb.collection(salonEventsPath).doc(application.salonId).get();
    if (!salonSnap.exists) return json(404, { error: "SALON 행사를 찾을 수 없습니다." });
    const salon = { id: salonSnap.id, ...salonSnap.data() };

    const now = new Date();
    const issueNewToken = action === "approve" || action === "reissue" || !application.qrTokenHash;
    const nextVersion = issueNewToken ? Number(application.qrTokenVersion || 0) + 1 : Number(application.qrTokenVersion || 0);
    const issued = issueNewToken ? issueQrToken({ applicationId, version: nextVersion }) : null;
    const nonce = issued?.nonce || application.qrTokenNonce;
    const rawToken = issued?.token || deriveQrToken({ applicationId, version: nextVersion, nonce });
    if (!issueNewToken && hashToken(rawToken) !== application.qrTokenHash) {
      return json(409, { error: "기존 QR을 복구할 수 없습니다. QR을 재발급해 주세요.", requiresReissue: true });
    }
    const qrExpiresAt = salon.checkInSettings?.qrExpiresAt || salon.eventEndAt || null;
    const update = {
      status: "approved",
      qrTokenHash: hashToken(rawToken),
      qrTokenNonce: nonce,
      qrTokenVersion: nextVersion,
      qrIssuedAt: issueNewToken ? now : application.qrIssuedAt || now,
      qrExpiresAt,
      approvalNotificationStatus:
        salon.notificationSettings?.approvalEnabled === false ? "disabled" : "pending",
      approvalNotificationError: null,
      updatedAt: now,
    };
    await appRef.update(update);

    const passUrl = `${getBaseUrl()}/salon/pass?token=${encodeURIComponent(rawToken)}`;
    let notification = { status: update.approvalNotificationStatus };
    if (update.approvalNotificationStatus !== "disabled") {
      try {
        await sendSalonAlimtalk({ kind: "approval", application: { ...application, ...update }, salon, passUrl });
        notification = { status: "sent" };
        await appRef.update({
          approvalNotificationStatus: "sent",
          approvalNotificationSentAt: new Date(),
          approvalNotificationError: null,
          updatedAt: new Date(),
        });
      } catch (error) {
        notification = { status: "failed", error: error.message };
        await appRef.update({
          approvalNotificationStatus: "failed",
          approvalNotificationError: String(error.message || "알림톡 발송 실패").slice(0, 500),
          updatedAt: new Date(),
        });
      }
    }

    return json(200, {
      ok: true,
      status: "approved",
      qrTokenVersion: nextVersion,
      notification,
      // Admin receives this once so the just-issued pass can be copied if messaging failed.
      passUrl,
    });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || "승인 처리에 실패했습니다." });
  }
}

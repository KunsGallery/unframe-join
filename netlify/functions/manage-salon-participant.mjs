import { adminDb, verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import { applicationsPath, json, parseBody, salonEventsPath, sendSalonAlimtalk } from "./_lib/salonShared.mjs";

const ALLOWED_STATUSES = new Set(["submitted", "waitlisted", "rejected", "cancelled"]);

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    await verifyAdminRequest(event);
    const { applicationId, action, status } = parseBody(event);
    if (!applicationId) return json(400, { error: "applicationId가 필요합니다." });
    const ref = adminDb.collection(applicationsPath).doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().trackType !== "salon") return json(404, { error: "SALON 신청자를 찾을 수 없습니다." });
    const application = { id: snap.id, ...snap.data() };

    if (action === "status") {
      if (!ALLOWED_STATUSES.has(status)) return json(400, { error: "지원하지 않는 상태입니다." });
      await ref.update({ status, updatedAt: new Date() });
      return json(200, { ok: true, status });
    }
    if (action === "resend-welcome") {
      if (!application.checkedInAt) return json(400, { error: "입장 완료 참가자만 재발송할 수 있습니다." });
      const salonSnap = await adminDb.collection(salonEventsPath).doc(application.salonId).get();
      if (!salonSnap.exists) return json(404, { error: "SALON 행사를 찾을 수 없습니다." });
      const salon = salonSnap.data();
      try {
        const sent = await sendSalonAlimtalk({ kind: "welcome", application, salon, checkedInAt: application.checkedInAt });
        const statusValue = sent.disabled ? "disabled" : "sent";
        await ref.update({
          welcomeNotificationStatus: statusValue,
          welcomeNotificationSentAt: sent.disabled ? null : new Date(),
          welcomeNotificationError: null,
          updatedAt: new Date(),
        });
        return json(200, { ok: true, notificationStatus: statusValue });
      } catch (error) {
        await ref.update({ welcomeNotificationStatus: "failed", welcomeNotificationError: String(error.message).slice(0, 500), updatedAt: new Date() });
        return json(502, { error: error.message || "환영 알림톡 발송 실패" });
      }
    }
    return json(400, { error: "지원하지 않는 작업입니다." });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || "참가자 처리에 실패했습니다." });
  }
}

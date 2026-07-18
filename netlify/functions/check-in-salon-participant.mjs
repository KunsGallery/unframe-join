import { adminDb, verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import {
  applicationsPath,
  asDate,
  hashToken,
  isExpired,
  json,
  parseBody,
  salonEventsPath,
  salonLogsPath,
  sendSalonAlimtalk,
} from "./_lib/salonShared.mjs";

const logAttempt = async (data) => {
  try { await adminDb.collection(salonLogsPath).add({ ...data, createdAt: new Date() }); } catch { /* check-in must survive audit failures */ }
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  let admin;
  try {
    admin = await verifyAdminRequest(event);
    const { token = "", salonId = "", applicationId = "", method = "qr" } = parseBody(event);
    if (!salonId || (!token && !applicationId)) return json(400, { error: "체크인 정보가 부족합니다." });
    const salonSnap = await adminDb.collection(salonEventsPath).doc(salonId).get();
    if (!salonSnap.exists) return json(404, { error: "SALON 행사를 찾을 수 없습니다." });
    const salon = salonSnap.data();
    const checkInStart = asDate(salon.checkInSettings?.checkInStartAt);
    const checkInEnd = asDate(salon.checkInSettings?.checkInEndAt);
    if (salon.checkInSettings?.enabled === false) return json(409, { error: "체크인이 비활성화된 행사입니다." });
    if (checkInStart && Date.now() < checkInStart.getTime()) return json(409, { error: "아직 체크인 가능 시간이 아닙니다." });
    if (checkInEnd && Date.now() > checkInEnd.getTime()) return json(410, { error: "체크인 가능 시간이 종료되었습니다." });
    let appRef;
    if (applicationId) {
      appRef = adminDb.collection(applicationsPath).doc(applicationId);
    } else {
      const found = await adminDb.collection(applicationsPath).where("qrTokenHash", "==", hashToken(token)).limit(1).get();
      if (found.empty) {
        await logAttempt({ salonId, applicationId: null, result: "invalid", method: "qr", adminUid: admin.uid, adminEmail: admin.email });
        return json(404, { error: "유효하지 않은 QR입니다.", result: "invalid" });
      }
      appRef = found.docs[0].ref;
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(appRef);
      if (!snap.exists) throw Object.assign(new Error("신청자를 찾을 수 없습니다."), { statusCode: 404, result: "invalid" });
      const application = { id: snap.id, ...snap.data() };
      if (application.trackType !== "salon" || application.salonId !== salonId) {
        throw Object.assign(new Error("다른 SALON의 참가자입니다."), { statusCode: 400, result: "invalid" });
      }
      if (application.status !== "approved") {
        throw Object.assign(new Error("승인된 참가자만 입장할 수 있습니다."), { statusCode: 403, result: "invalid" });
      }
      if (!applicationId && isExpired(application.qrExpiresAt)) {
        throw Object.assign(new Error("만료된 QR입니다."), { statusCode: 410, result: "expired" });
      }
      if (application.checkedInAt) return { duplicate: true, application };
      const checkedInAt = new Date();
      transaction.update(appRef, {
        checkedInAt,
        checkedInBy: admin.uid,
        checkInMethod: applicationId || method === "manual" ? "manual" : "qr",
        welcomeNotificationStatus: "pending",
        welcomeNotificationError: null,
        updatedAt: checkedInAt,
      });
      return { duplicate: false, application: { ...application, checkedInAt } };
    });

    if (result.duplicate) {
      await logAttempt({ salonId, applicationId: result.application.id, result: "already_checked_in", method: applicationId ? "manual" : "qr", adminUid: admin.uid, adminEmail: admin.email });
      return json(200, {
        ok: true,
        duplicate: true,
        message: "이미 입장 처리된 참가자입니다.",
        checkedInAt: result.application.checkedInAt,
        participant: { id: result.application.id, name: result.application.applicantName || result.application.nickname || "참가자" },
      });
    }

    const application = result.application;
    let notificationStatus = "disabled";
    if (salon.notificationSettings?.welcomeEnabled !== false) {
      try {
        await sendSalonAlimtalk({ kind: "welcome", application, salon, checkedInAt: application.checkedInAt });
        notificationStatus = "sent";
        await appRef.update({ welcomeNotificationStatus: "sent", welcomeNotificationSentAt: new Date(), welcomeNotificationError: null, updatedAt: new Date() });
      } catch (error) {
        notificationStatus = "failed";
        await appRef.update({ welcomeNotificationStatus: "failed", welcomeNotificationError: String(error.message).slice(0, 500), updatedAt: new Date() });
      }
    } else {
      await appRef.update({ welcomeNotificationStatus: "disabled", updatedAt: new Date() });
    }
    await logAttempt({ salonId, applicationId: application.id, result: "success", method: applicationId ? "manual" : "qr", adminUid: admin.uid, adminEmail: admin.email });
    return json(200, {
      ok: true,
      duplicate: false,
      message: "입장이 확인되었습니다.",
      checkedInAt: application.checkedInAt,
      notificationStatus,
      participant: { id: application.id, name: application.applicantName || application.nickname || "참가자" },
    });
  } catch (error) {
    if (admin) {
      const body = parseBody(event);
      await logAttempt({ salonId: body.salonId || "", applicationId: body.applicationId || null, result: error.result || "invalid", method: body.applicationId ? "manual" : "qr", adminUid: admin.uid, adminEmail: admin.email });
    }
    return json(error.statusCode || 500, { error: error.message || "체크인에 실패했습니다.", result: error.result || "invalid" });
  }
}

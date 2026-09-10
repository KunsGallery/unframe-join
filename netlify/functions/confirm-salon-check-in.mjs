import crypto from "crypto";
import { adminDb } from "./_lib/firebaseAdmin.mjs";
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

const getHeader = (event, name) => event.headers?.[name] || event.headers?.[name.toLowerCase()] || "";

const extractToken = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).searchParams.get("token") || raw;
  } catch {
    return raw;
  }
};

const verifySalonIntegration = (event) => {
  const expected = String(process.env.SALON_CHECKIN_SHARED_SECRET || "");
  const received = getHeader(event, "x-salon-checkin-secret");
  if (!expected || !received) throw Object.assign(new Error("SALON 체크인 연동 키가 설정되지 않았습니다."), { statusCode: 503 });
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw Object.assign(new Error("SALON 체크인 연동 인증에 실패했습니다."), { statusCode: 401 });
  }
};

const logAttempt = async (data) => {
  try {
    await adminDb.collection(salonLogsPath).add({ ...data, source: "salon.unframe.kr", createdAt: new Date() });
  } catch {
    // A logging failure must not change the outcome of a valid check-in.
  }
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const body = parseBody(event);
  const salonId = String(body.salonId || "").trim();
  const token = extractToken(body.token || body.qrPayload);

  try {
    verifySalonIntegration(event);
    if (!salonId || !token) return json(400, { error: "salonId와 QR token이 필요합니다." });
    if (token.length < 32) return json(400, { error: "유효하지 않은 QR입니다.", result: "invalid" });

    const salonSnap = await adminDb.collection(salonEventsPath).doc(salonId).get();
    if (!salonSnap.exists) return json(404, { error: "SALON 행사를 찾을 수 없습니다.", result: "invalid" });
    const salon = { id: salonSnap.id, ...salonSnap.data() };
    const checkInStart = asDate(salon.checkInSettings?.checkInStartAt);
    const checkInEnd = asDate(salon.checkInSettings?.checkInEndAt);
    if (salon.checkInSettings?.enabled === false) return json(409, { error: "체크인이 비활성화된 행사입니다.", result: "disabled" });
    if (checkInStart && Date.now() < checkInStart.getTime()) return json(409, { error: "아직 체크인 가능 시간이 아닙니다.", result: "too_early" });
    if (checkInEnd && Date.now() > checkInEnd.getTime()) return json(410, { error: "체크인 가능 시간이 종료되었습니다.", result: "too_late" });

    const found = await adminDb.collection(applicationsPath)
      .where("qrTokenHash", "==", hashToken(token))
      .limit(1)
      .get();
    if (found.empty) {
      await logAttempt({ salonId, applicationId: null, result: "invalid", method: "qr" });
      return json(404, { error: "유효하지 않은 QR입니다.", result: "invalid" });
    }

    const appRef = found.docs[0].ref;
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
      if (isExpired(application.qrExpiresAt)) {
        throw Object.assign(new Error("만료된 QR입니다."), { statusCode: 410, result: "expired" });
      }
      if (application.checkedInAt) return { duplicate: true, application };

      const checkedInAt = new Date();
      transaction.update(appRef, {
        checkedInAt,
        checkedInBy: "salon.unframe.kr",
        checkInMethod: "qr",
        welcomeNotificationStatus: "pending",
        welcomeNotificationError: null,
        updatedAt: checkedInAt,
      });
      return { duplicate: false, application: { ...application, checkedInAt } };
    });

    const participant = {
      id: result.application.id,
      name: result.application.applicantName || result.application.nickname || "참가자",
    };
    if (result.duplicate) {
      await logAttempt({ salonId, applicationId: result.application.id, result: "already_checked_in", method: "qr" });
      return json(200, {
        ok: true,
        duplicate: true,
        status: "already_checked_in",
        message: "이미 입장 처리된 참가자입니다.",
        checkedInAt: result.application.checkedInAt,
        notificationStatus: result.application.welcomeNotificationStatus || "unknown",
        ...(result.application.welcomeNotificationError ? { notificationError: result.application.welcomeNotificationError } : {}),
        participant,
      });
    }

    let notificationStatus = "disabled";
    if (salon.notificationSettings?.welcomeEnabled !== false) {
      try {
        await sendSalonAlimtalk({ kind: "welcome", application: result.application, salon, checkedInAt: result.application.checkedInAt });
        notificationStatus = "sent";
        await appRef.update({ welcomeNotificationStatus: "sent", welcomeNotificationSentAt: new Date(), welcomeNotificationError: null, updatedAt: new Date() });
      } catch (error) {
        notificationStatus = "failed";
        const notificationError = String(error.message || "알림톡 발송 실패").slice(0, 500);
        await appRef.update({ welcomeNotificationStatus: "failed", welcomeNotificationError: notificationError, updatedAt: new Date() });
        result.notificationError = notificationError;
      }
    } else {
      await appRef.update({ welcomeNotificationStatus: "disabled", updatedAt: new Date() });
    }

    await logAttempt({ salonId, applicationId: result.application.id, result: "success", method: "qr", notificationStatus });
    return json(200, {
      ok: true,
      duplicate: false,
      status: "checked_in",
      message: "입장이 확인되었습니다.",
      checkedInAt: result.application.checkedInAt,
      notificationStatus,
      ...(result.notificationError ? { notificationError: result.notificationError } : {}),
      participant,
    });
  } catch (error) {
    await logAttempt({ salonId, applicationId: null, result: error.result || "error", method: "qr", error: String(error.message || "").slice(0, 500) });
    return json(error.statusCode || 500, { error: error.message || "입장 확인에 실패했습니다.", result: error.result || "error" });
  }
}

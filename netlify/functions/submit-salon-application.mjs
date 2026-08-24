import crypto from "crypto";
import { adminDb, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";
import { applicationsPath, asDate, json, parseBody, salonEventsPath } from "./_lib/salonShared.mjs";

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 20);
const isEmptyAnswer = (value) =>
  Array.isArray(value)
    ? value.length === 0
    : value === undefined || value === null || value === "" || value === false;
const sanitizeAnswerValue = (value) => {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => clean(item, 300)).filter(Boolean);
  if (value && typeof value === "object") {
    const selected = value.selected && typeof value.selected === "object" ? value.selected : {};
    return {
      query: clean(value.query, 120),
      manual: clean(value.manual, 500),
      selected: selected.videoId ? {
        videoId: clean(selected.videoId, 80),
        title: clean(selected.title, 300),
        channelTitle: clean(selected.channelTitle, 200),
        thumbnailUrl: clean(selected.thumbnailUrl, 500),
        url: clean(selected.url, 500),
      } : null,
    };
  }
  return clean(value, 1000);
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await verifyUserRequest(event);
    const { salonId, applicantName, phone, email, nickname, privacyAgreed, customFieldAnswers = {} } = parseBody(event);
    if (!salonId) return json(400, { error: "SALON 정보가 없습니다." });
    const salonRef = adminDb.collection(salonEventsPath).doc(salonId);
    const salonSnap = await salonRef.get();
    if (!salonSnap.exists) return json(404, { error: "SALON을 찾을 수 없습니다." });
    const salon = salonSnap.data();
    const now = new Date();
    const start = asDate(salon.applicationStartAt);
    const end = asDate(salon.applicationEndAt);
    if (salon.status !== "open" || salon.isVisible === false || (start && now < start) || (end && now > end)) {
      return json(409, { error: "현재 신청할 수 없는 SALON입니다." });
    }
    const fields = salon.formSettings?.fields || {};
    const safeName = clean(applicantName, 100);
    const safePhone = normalizePhone(phone);
    const safeEmail = clean(email, 200);
    const safeNickname = clean(nickname, 100);
    if (fields.name?.enabled !== false && fields.name?.required !== false && !safeName) return json(400, { error: "이름을 입력해 주세요." });
    if (fields.phone?.enabled !== false && fields.phone?.required !== false && !safePhone) return json(400, { error: "연락처를 입력해 주세요." });
    if (fields.email?.enabled !== false && fields.email?.required === true && !safeEmail) return json(400, { error: "이메일을 입력해 주세요." });
    if (fields.nickname?.enabled !== false && fields.nickname?.required === true && !safeNickname) return json(400, { error: `${fields.nickname?.label || "관심 분야"} 항목을 입력해 주세요.` });
    if (salon.formSettings?.privacy?.enabled !== false && salon.formSettings?.privacy?.required !== false && !privacyAgreed) {
      return json(400, { error: "개인정보 수집 및 이용에 동의해 주세요." });
    }
    for (const field of salon.formSettings?.customFields || []) {
      const answer = customFieldAnswers?.[field.id]?.value;
      if (field.required && isEmptyAnswer(answer)) {
        return json(400, { error: `${field.label || "필수 질문"} 항목을 입력해 주세요.` });
      }
    }

    const customFieldOrderMap = new Map(
      (Array.isArray(salon.formSettings?.customFields) ? salon.formSettings.customFields : [])
        .map((field, index) => [String(field?.id || ""), index])
    );

    const result = await adminDb.runTransaction(async (transaction) => {
      const stableId = crypto.createHash("sha256").update(`${salonId}:${user.uid}`).digest("hex").slice(0, 40);
      const ref = adminDb.collection(applicationsPath).doc(stableId);
      const existing = await transaction.get(ref);
      if (existing.exists && existing.data().status !== "cancelled") {
        throw Object.assign(new Error("이미 신청한 SALON입니다."), { statusCode: 409 });
      }
      const activeQuery = adminDb.collection(applicationsPath)
        .where("salonId", "==", salonId);
      const active = await transaction.get(activeQuery);
      const occupied = active.docs.filter((doc) => doc.data().trackType === "salon" && ["submitted", "approved"].includes(doc.data().status)).length;
      const capacity = Number(salon.capacity || 0);
      const status = capacity > 0 && occupied >= capacity ? "waitlisted" : "submitted";
      transaction.set(ref, {
        trackType: "salon",
        salonId,
        salonTitle: salon.title || "UNFRAME SALON",
        userId: user.uid,
        applicantName: safeName,
        phone: safePhone,
        email: safeEmail,
        nickname: safeNickname,
        status,
        privacyAgreed: Boolean(privacyAgreed),
        customFieldAnswers: Object.fromEntries(Object.entries(customFieldAnswers || {}).slice(0, 30).map(([key, value]) => {
          const normalizedKey = clean(key, 80);
          const submittedOrder = Number(value?.order);
          return [normalizedKey, {
            label: clean(value?.label || key, 100),
            description: clean(value?.description, 500),
            type: clean(value?.type || "text", 30),
            order: Number.isFinite(submittedOrder) ? submittedOrder : customFieldOrderMap.get(String(key)) ?? 999,
            value: sanitizeAnswerValue(value?.value),
            options: Array.isArray(value?.options) ? value.options.slice(0, 50).map((option) => clean(option, 300)).filter(Boolean) : [],
          }];
        })),
        qrTokenHash: null,
        qrTokenNonce: null,
        qrTokenVersion: 0,
        qrIssuedAt: null,
        qrExpiresAt: null,
        approvalNotificationStatus: "pending",
        approvalNotificationSentAt: null,
        approvalNotificationError: null,
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
        welcomeNotificationStatus: "pending",
        welcomeNotificationSentAt: null,
        welcomeNotificationError: null,
        submittedAt: now,
        updatedAt: now,
      });
      return { applicationId: ref.id, status };
    });
    return json(201, { ok: true, ...result });
  } catch (error) {
    const message = String(error.message || "신청 저장에 실패했습니다.");
    const indexHint = message.includes("index") ? "Firestore 복합 색인이 필요합니다." : message;
    return json(error.statusCode || 500, { error: indexHint });
  }
}

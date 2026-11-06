import {
  OPEN_CALL_TITLE,
  normalizeOpenCallNotificationSettings,
  parseOpenCallDate,
  renderOpenCallTemplate,
} from "../../../src/constants/openCall.js";
import { adminDb, verifyUserRequest } from "./firebaseAdmin.mjs";
import { ROOT_PATH, applicationsPath, asDate, getBaseUrl } from "./salonShared.mjs";

const openCallsPath = `${ROOT_PATH}/openCalls`;
const DAILY_LIMIT_PER_USER = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const singleLine = (value, max) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);

const formatSeoulDateTime = (date) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const SCHEDULE_FALLBACK = "추후 안내";

const formatSeoulDate = (value) => {
  const date = parseOpenCallDate(value);
  if (!date) return SCHEDULE_FALLBACK;
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}년 ${part("month")}월 ${part("day")}일`;
};

// Applicants trigger their own receipt notice, so everything sent is derived from
// stored documents. Request bodies only ever identify which application it is.
export const loadApplicantNotification = async (event, applicationId) => {
  const identity = await verifyUserRequest(event);
  if (typeof applicationId !== "string" || !applicationId || applicationId.includes("/")) {
    throw fail(400, "신청 정보가 없습니다.");
  }

  const ref = adminDb.collection(applicationsPath).doc(applicationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw fail(404, "신청서를 찾을 수 없습니다.");

  const application = snapshot.data();
  if (application.userId !== identity.uid) throw fail(403, "본인 신청에 대해서만 발송할 수 있습니다.");
  if (application.trackType !== "open-call") throw fail(403, "이 신청 유형은 접수 알림을 발송하지 않습니다.");

  const openCallSnapshot = await adminDb.collection(openCallsPath).doc(String(application.openCallId || "-")).get();
  if (!openCallSnapshot.exists) throw fail(404, "공고를 찾을 수 없습니다.");
  const openCall = openCallSnapshot.data();

  const title = singleLine(openCall.title || OPEN_CALL_TITLE, 200);
  const submittedAt = asDate(application.submittedAt) || new Date();
  const context = {
    name: singleLine(application.name, 50) || "지원자",
    email: singleLine(application.email || application.applicantEmail, 200),
    phone: String(application.phone || "").replace(/\D/g, "").slice(0, 20),
    openCallTitle: title,
    openCallId: application.openCallId,
    applicationId,
    submittedAt: formatSeoulDateTime(submittedAt),
  };

  return {
    identity,
    ref,
    context,
    settings: normalizeOpenCallNotificationSettings(openCall.notificationSettings || {}),
    render: (template) => renderOpenCallTemplate(template, context),
    details: {
      title,
      dateLabel: singleLine(openCall.subtitle || title, 200),
      program: { name: title, price: 0 },
      stageName: singleLine(openCall.heroAccent, 100),
      submittedAtIso: submittedAt.toISOString(),
      deadlineLabel: formatSeoulDate(openCall.applicationEndAt),
      announcementLabel: formatSeoulDate(openCall.announcementAt),
      detailUrl: `${getBaseUrl()}/?view=my-page&applicationId=${encodeURIComponent(applicationId)}&app=${encodeURIComponent(applicationId)}`,
    },
  };
};

// Returns false when this application already used its one send on this channel.
export const claimApplicantNotification = ({ ref, uid, field }) =>
  adminDb.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (current.data()?.[field]) return false;

    const owned = await transaction.get(adminDb.collection(applicationsPath).where("userId", "==", uid));
    const since = Date.now() - DAY_MS;
    const recentSends = owned.docs.filter((doc) => {
      const sentAt = asDate(doc.data()[field]);
      return sentAt && sentAt.getTime() > since;
    }).length;
    if (recentSends >= DAILY_LIMIT_PER_USER) {
      throw fail(429, "오늘 발송 가능한 접수 알림 횟수를 초과했습니다.");
    }

    transaction.update(ref, { [field]: new Date() });
    return true;
  });

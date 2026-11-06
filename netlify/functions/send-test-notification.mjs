import { buildOpenCallNotice } from "./_lib/applicationNotifications.mjs";
import { adminDb, verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import {
  INQUIRY_KAKAO_TEMPLATE_ID,
  buildInquiryKakaoVariables,
  sendInquiryKakao,
  sendInquiryMailTo,
} from "./_lib/inquiryNotifications.mjs";
import { ROOT_PATH, getBaseUrl, json, parseBody, salonEventsPath, sendSalonAlimtalk } from "./_lib/salonShared.mjs";
import { buildReceiptMessage, deliver } from "./send-application-emails.mjs";
import { buildReceiptKakaoPayload, sendKakaoMessage } from "./send-kakao-alimtalk.mjs";

const NAME = "[테스트] 홍길동";
const NO_EMAIL = "받을 메일 주소를 입력하지 않았습니다.";
const NO_PHONE = "받을 휴대폰 번호를 입력하지 않았습니다.";
const SWITCHED_OFF = "설정에서 꺼져 있어 실제로도 나가지 않습니다.";

const SAMPLE_INQUIRIES = {
  "rental-received": {
    trackType: "rental",
    title: "[테스트] 봄 팝업 전시",
    organization: "스튜디오 봄",
    name: NAME,
    purpose: "전시",
    date: "2027-03-02",
    hours: "2주",
    attendees: "하루 50명",
    budget: "300만원 내외",
    supportScope: "공간 이용",
    plan: "테스트 발송입니다. 실제 문의가 아닙니다.",
    equipment: "프로젝터 1대",
  },
  "collaboration-received": {
    trackType: "collaboration",
    title: "[테스트] 브랜드 협업 제안",
    organization: "브랜드 팀",
    name: NAME,
    category: "공동 기획",
    idea: "테스트 발송입니다. 실제 제안이 아닙니다.",
    desiredRole: "공간과 기획 협력",
    timelineBudget: "내년 상반기, 예산 협의",
    referenceUrl: "https://join.unframe.kr",
  },
};

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const readRecipients = (body) => {
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "메일 주소 형식을 확인해 주세요.");
  if (phone && (phone.length < 10 || phone.length > 11)) throw fail(400, "휴대폰 번호를 확인해 주세요.");
  if (!email && !phone) throw fail(400, "받을 메일 주소나 휴대폰 번호를 입력해 주세요.");
  return { email, phone };
};

const readDocument = async (path, id, missingMessage) => {
  if (typeof id !== "string" || !id || id.includes("/")) throw fail(400, missingMessage);
  const snapshot = await adminDb.collection(path).doc(id).get();
  if (!snapshot.exists) throw fail(404, missingMessage);
  return snapshot.data();
};

// One channel's outcome; a failure here is the finding, not an error of this request.
const attempt = async ({ channel, audience, to, skip, details = {}, send }) => {
  const base = { channel, audience, to, ...details };
  if (skip) return { ...base, status: "skipped", note: skip };
  try {
    return { ...base, status: "sent", ...(await send()) };
  } catch (error) {
    console.error("test notification failed:", channel, audience);
    return { ...base, status: "failed", error: String(error?.message || "발송에 실패했습니다.").slice(0, 300) };
  }
};

const sendInquiry = async ({ scenario, email, phone }) => {
  const fields = { ...SAMPLE_INQUIRIES[scenario], email, phone };
  return Promise.all([
    attempt({
      channel: "메일",
      audience: "운영자",
      to: email,
      skip: email ? "" : NO_EMAIL,
      details: { realRecipient: "운영자 수신 메일" },
      send: async () => ({ subject: (await sendInquiryMailTo(fields, email)).subject }),
    }),
    attempt({
      channel: "알림톡",
      audience: "문의자",
      to: phone,
      skip: phone ? "" : NO_PHONE,
      details: { templateId: INQUIRY_KAKAO_TEMPLATE_ID, variables: buildInquiryKakaoVariables(fields) },
      send: async () => {
        await sendInquiryKakao(fields);
        return {};
      },
    }),
  ]);
};

const sendOpenCallReceipt = async ({ body, email, phone }) => {
  const openCall = await readDocument(`${ROOT_PATH}/openCalls`, body.openCallId, "공고를 찾을 수 없습니다.");
  const notice = buildOpenCallNotice({
    application: { name: NAME, email, phone, openCallId: body.openCallId },
    applicationId: "test",
    openCall,
  });
  const { settings, render } = notice;
  const mail = { apiKey: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, adminTo: email };
  const sendMail = (flags) =>
    deliver({ ...mail, message: buildReceiptMessage(notice, { applicantEmail: email, sendApplicantEmail: false, sendAdminEmail: false, ...flags }) });
  const mailSkip = (enabled) => (!enabled ? SWITCHED_OFF : email ? "" : NO_EMAIL);
  const kakaoPayload = phone ? buildReceiptKakaoPayload(notice) : null;

  return [
    await attempt({
      channel: "메일",
      audience: "지원자",
      to: email,
      skip: mailSkip(settings.applicantEmailEnabled),
      details: { subject: render(settings.applicantEmailSubject) },
      send: async () => {
        await sendMail({ sendApplicantEmail: true });
        return {};
      },
    }),
    await attempt({
      channel: "메일",
      audience: "운영자",
      to: email,
      skip: mailSkip(settings.adminEmailEnabled),
      details: { realRecipient: "운영자 수신 메일", subject: render(settings.adminEmailSubject) },
      send: async () => {
        await sendMail({ sendAdminEmail: true });
        return {};
      },
    }),
    await attempt({
      channel: "알림톡",
      audience: "지원자",
      to: phone,
      skip: !settings.kakaoEnabled ? SWITCHED_OFF : phone ? "" : NO_PHONE,
      details: kakaoPayload ? { templateId: kakaoPayload.kakaoOptions.templateId, variables: kakaoPayload.kakaoOptions.variables } : {},
      send: async () => {
        await sendKakaoMessage({ apiKey: process.env.SOLAPI_API_KEY, apiSecret: process.env.SOLAPI_API_SECRET, payload: kakaoPayload });
        return {};
      },
    }),
  ];
};

const sendSalonNotice = async ({ scenario, body, phone }) => {
  const salon = await readDocument(salonEventsPath, body.salonId, "SALON을 찾을 수 없습니다.");
  const kind = scenario === "salon-approval" ? "approval" : "welcome";
  const application = { applicantName: NAME, phone, salonId: body.salonId };
  const result = await attempt({
    channel: "알림톡",
    audience: "참가자",
    to: phone,
    skip: phone ? "" : NO_PHONE,
    send: async () => {
      const sent = await sendSalonAlimtalk({
        kind,
        application,
        salon,
        passUrl: `${getBaseUrl()}/salon/pass?token=test`,
        checkedInAt: new Date(),
      });
      return sent.disabled ? { status: "skipped", note: SWITCHED_OFF } : { templateId: sent.templateId, variables: sent.variables };
    },
  });
  return [result];
};

const SCENARIOS = {
  "open-call-received": sendOpenCallReceipt,
  "rental-received": sendInquiry,
  "collaboration-received": sendInquiry,
  "salon-approval": sendSalonNotice,
  "salon-welcome": sendSalonNotice,
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    await verifyAdminRequest(event);
    const body = parseBody(event);
    const run = Object.hasOwn(SCENARIOS, body.scenario) ? SCENARIOS[body.scenario] : null;
    if (!run) return json(400, { error: "알 수 없는 테스트 항목입니다." });
    const sends = await run({ scenario: body.scenario, body, ...readRecipients(body) });
    return json(200, { ok: true, sends });
  } catch (error) {
    if (!error.statusCode) console.error("send-test-notification error");
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "테스트 발송에 실패했습니다." });
  }
}

import { enforceRateLimit } from "./rateLimit.mjs";
import { buildAuthHeaders, getBaseUrl } from "./salonShared.mjs";

const SEND_TIMEOUT_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const KAKAO_DAILY_LIMIT = 3;
const KAKAO_VALUE_MAX = 60;
export const INQUIRY_KAKAO_TEMPLATE_ID = "KA01TP260325034339068F1cDumvabAJ";
const KAKAO_PF_ID = "KA01PF260325031321194kcKwc6ZYXsv";
const SCHEDULE_UNDECIDED = "협의 후 결정";

const INQUIRIES = {
  rental: {
    label: "대관 문의",
    rows: [
      ["팀 / 브랜드", "organization"],
      ["담당자", "name"],
      ["연락처", "phone"],
      ["이메일", "email"],
      ["이용 목적", "purpose"],
      ["희망 날짜", "date"],
      ["이용 시간 / 기간", "hours"],
      ["예상 인원", "attendees"],
      ["예산 범위", "budget"],
      ["필요한 지원", "supportScope"],
      ["공간 활용 계획", "plan"],
      ["반입 장비 / 설치 요청", "equipment"],
    ],
  },
  collaboration: {
    label: "협업 제안",
    rows: [
      ["팀 / 브랜드", "organization"],
      ["담당자", "name"],
      ["연락처", "phone"],
      ["이메일", "email"],
      ["협업 분야", "category"],
      ["아이디어와 목표", "idea"],
      ["희망하는 역할", "desiredRole"],
      ["일정 / 예산 메모", "timelineBudget"],
      ["참고 링크", "referenceUrl"],
    ],
  },
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const singleLine = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

const buildMail = ({ label, rows }, fields) => {
  const body = rows
    .filter(([, key]) => fields[key])
    .map(
      ([title, key]) =>
        `<p style="margin:0 0 16px"><strong>${title}</strong><br /><span style="white-space:pre-line">${escapeHtml(fields[key])}</span></p>`
    )
    .join("");

  return {
    subject: `[UNFRAME] 새 ${label} - ${singleLine(fields.title)}`,
    html: `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
<h2 style="margin:0 0 20px">${label}: ${escapeHtml(fields.title)}</h2>
${body}
<p><a href="${escapeHtml(getBaseUrl())}/?view=admin">관리자 화면에서 확인</a></p>
</div>`,
  };
};

const sendAdminMail = async (mail, fields, recipients) => {
  const { RESEND_API_KEY, MAIL_FROM, MAIL_TO_ADMIN } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM || !MAIL_TO_ADMIN) throw new Error("mail environment missing");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    body: JSON.stringify({
      from: MAIL_FROM,
      to: recipients || MAIL_TO_ADMIN.split(",").map((address) => address.trim()).filter(Boolean),
      ...(fields.email ? { reply_to: fields.email } : {}),
      ...mail,
    }),
  });
  if (!response.ok) throw new Error(`mail service responded ${response.status}`);
};

// The inquiry is already saved by the time this runs, so a mail problem is recorded
// on the document and never turned into a failed submission.
export const notifyAdminOfInquiry = async (ref, fields) => {
  const inquiry = Object.hasOwn(INQUIRIES, fields.trackType) ? INQUIRIES[fields.trackType] : null;
  if (!inquiry) return;

  try {
    await sendAdminMail(buildMail(inquiry, fields), fields);
    await ref.update({ adminNotifiedAt: new Date() });
  } catch (error) {
    console.error("inquiry notification failed:", error?.message);
    await ref.update({ adminNotifyError: new Date() }).catch(() => {});
  }
};

const kakaoValue = (value, fallback) => singleLine(value).slice(0, KAKAO_VALUE_MAX) || fallback;

export const buildInquiryKakaoVariables = (fields) => ({
  "#{name}": kakaoValue(fields.name, "신청자"),
  "#{project_name}": kakaoValue(fields.title, "-"),
  "#{selected_date}": kakaoValue(fields.trackType === "rental" ? fields.date : "", SCHEDULE_UNDECIDED),
  "#{program_name}": kakaoValue(fields.trackType === "rental" ? fields.purpose : fields.category, "-"),
});

export const sendInquiryKakao = async (fields) => {
  const { SOLAPI_API_KEY: apiKey, SOLAPI_API_SECRET: apiSecret, SOLAPI_PF_ID: pfId } = process.env;
  const response = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: buildAuthHeaders({ apiKey, apiSecret }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    body: JSON.stringify({
      message: {
        to: fields.phone,
        kakaoOptions: { pfId: pfId || KAKAO_PF_ID, templateId: INQUIRY_KAKAO_TEMPLATE_ID, variables: buildInquiryKakaoVariables(fields) },
      },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.errorCode) {
    throw new Error(result?.errorMessage || result?.message || `kakao service responded ${response.status}`);
  }
};

// Applicants choose the number and the title, so the channel's sends per account are capped.
// As with the admin mail, a problem here never turns into a failed submission.
export const notifyApplicantOfInquiry = async (ref, fields, uid) => {
  if (!Object.hasOwn(INQUIRIES, fields.trackType)) return;

  try {
    if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) throw new Error("kakao environment missing");
    await enforceRateLimit({ scope: "inquiry-kakao", subject: uid, limit: KAKAO_DAILY_LIMIT, windowMs: DAY_MS });
    await sendInquiryKakao(fields);
    await ref.update({ applicantKakaoSentAt: new Date() });
  } catch (error) {
    console.error("inquiry kakao failed:", error?.message);
    await ref.update({ applicantKakaoError: new Date() }).catch(() => {});
  }
};

// The real inquiry mail, addressed to whoever is testing instead of the operators.
export const sendInquiryMailTo = async (fields, recipient) => {
  const mail = buildMail(INQUIRIES[fields.trackType], fields);
  await sendAdminMail(mail, fields, [recipient]);
  return mail;
};

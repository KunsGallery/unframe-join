import { getBaseUrl } from "./salonShared.mjs";

const SEND_TIMEOUT_MS = 5000;

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

const sendAdminMail = async (mail, fields) => {
  const { RESEND_API_KEY, MAIL_FROM, MAIL_TO_ADMIN } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM || !MAIL_TO_ADMIN) throw new Error("mail environment missing");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    body: JSON.stringify({
      from: MAIL_FROM,
      to: MAIL_TO_ADMIN.split(",").map((address) => address.trim()).filter(Boolean),
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

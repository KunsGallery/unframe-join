const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const formatProgram = (program) => {
  if (!program) return "-";
  return `${program.name} · ${program.price}만원`;
};

const formatPartner = (partnerType) => {
  if (partnerType === "brand") return "Brand / Team";
  if (partnerType === "artist") return "Artist";
  return partnerType || "-";
};

const buildApprovedHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 신청이 승인되었습니다.</h2>

    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      언프레임 전시/협업 신청이 내부 검토를 거쳐 승인되었습니다.
    </p>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa; margin-bottom: 20px;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
    </div>

    <p style="margin-bottom: 16px;">
      이후 진행에 필요한 세부 사항은 별도로 안내드리겠습니다.<br />
      감사합니다.
    </p>

    <p style="font-size: 12px; color: #666;">UNFRAME</p>
  </div>
`;

const buildRejectedHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  rejectionReason,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 신청 결과 안내</h2>

    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      언프레임 전시/협업 신청에 대한 내부 검토가 완료되었습니다.
    </p>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa; margin-bottom: 20px;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
      ${
        rejectionReason
          ? `<p><strong>안내 메모</strong><br />${rejectionReason}</p>`
          : ""
      }
    </div>

    <p style="margin-bottom: 16px;">
      이번에는 함께하지 못하게 되었지만, 보내주신 제안은 감사히 검토했습니다.<br />
      감사합니다.
    </p>

    <p style="font-size: 12px; color: #666;">UNFRAME</p>
  </div>
`;

const sendMail = async ({ apiKey, from, to, subject, html }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result?.message || `Resend error (${response.status})`);
  }

  return result;
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;

    if (!apiKey || !from) {
      return json(500, { error: "Missing mail environment variables" });
    }

    const payload = JSON.parse(event.body || "{}");
    const {
      applicantName,
      applicantEmail,
      exhibitionTitle,
      selectedDate,
      selectedProgram,
      partnerType,
      rejectionReason,
      status,
    } = payload;

    if (!applicantEmail) {
      return json(400, { error: "Applicant email is required" });
    }

    if (!status || !["confirmed", "rejected"].includes(status)) {
      return json(400, { error: "Valid status is required" });
    }

    const subject =
      status === "confirmed"
        ? `[UNFRAME] 신청이 승인되었습니다`
        : `[UNFRAME] 신청 결과를 안내드립니다`;

    const html =
      status === "confirmed"
        ? buildApprovedHtml({
            applicantName,
            exhibitionTitle,
            selectedDate,
            selectedProgram,
            partnerType,
          })
        : buildRejectedHtml({
            applicantName,
            exhibitionTitle,
            selectedDate,
            selectedProgram,
            partnerType,
            rejectionReason,
          });

    await sendMail({
      apiKey,
      from,
      to: [applicantEmail],
      subject,
      html,
    });

    return json(200, { ok: true });
  } catch (error) {
    console.error("send-application-status-email error:", error);
    return json(500, {
      error: error?.message || "Failed to send status email",
    });
  }
}
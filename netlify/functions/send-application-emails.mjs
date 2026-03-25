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

const buildApplicantHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  myPageUrl,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 신청이 접수되었습니다.</h2>
    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      언프레임 전시/협업 신청이 정상적으로 접수되었습니다.
    </p>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa; margin-bottom: 20px;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
    </div>

    <p style="margin-bottom: 16px;">
      내부 검토 후 등록하신 이메일로 순차 안내드리겠습니다.
    </p>

    ${
      myPageUrl
        ? `<p style="margin-bottom: 16px;"><a href="${myPageUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">신청내역 확인하기</a></p>`
        : ""
    }

    <p style="font-size: 12px; color: #666;">UNFRAME</p>
  </div>
`;

const buildAdminHtml = ({
  applicantName,
  applicantEmail,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  phone,
  brandName,
  stageName,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">새 신청서가 접수되었습니다.</h2>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>신청자명</strong><br />${applicantName || "-"}</p>
      <p><strong>이메일</strong><br />${applicantEmail || "-"}</p>
      <p><strong>연락처</strong><br />${phone || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>브랜드명</strong><br />${brandName || "-"}</p>
      <p><strong>활동명</strong><br />${stageName || "-"}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
    </div>
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
    const adminTo = process.env.MAIL_TO_ADMIN;

    if (!apiKey || !from || !adminTo) {
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
      phone,
      brandName,
      stageName,
      myPageUrl = "",
    } = payload;

    if (!applicantEmail) {
      return json(400, { error: "Applicant email is required" });
    }

    await sendMail({
      apiKey,
      from,
      to: [applicantEmail],
      subject: `[UNFRAME] 신청이 접수되었습니다`,
      html: buildApplicantHtml({
        applicantName,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        myPageUrl,
      }),
    });

    await sendMail({
      apiKey,
      from,
      to: adminTo.split(",").map((v) => v.trim()).filter(Boolean),
      subject: `[UNFRAME] 새 신청 접수 - ${exhibitionTitle || applicantName || "Untitled"}`,
      html: buildAdminHtml({
        applicantName,
        applicantEmail,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        phone,
        brandName,
        stageName,
      }),
    });

    return json(200, { ok: true });
  } catch (error) {
    console.error("send-application-emails error:", error);
    return json(500, {
      error: error?.message || "Failed to send emails",
    });
  }
}
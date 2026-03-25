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

const buildApprovedHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  applicationDetailUrl,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 신청이 승인되었습니다.</h2>
    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      신청해주신 프로젝트가 내부 검토를 거쳐 승인되었습니다.
    </p>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa; margin-bottom: 20px;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
    </div>

    ${
      applicationDetailUrl
        ? `<p style="margin-bottom: 16px;"><a href="${applicationDetailUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">신청 상세 페이지 확인하기</a></p>`
        : ""
    }

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
  applicationDetailUrl,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 신청 검토 결과 안내</h2>
    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      신청해주신 프로젝트는 내부 검토를 진행했으며, 이번 회차에는 함께하지 못하게 되었습니다.
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

    ${
      applicationDetailUrl
        ? `<p style="margin-bottom: 16px;"><a href="${applicationDetailUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">신청 상세 페이지 확인하기</a></p>`
        : ""
    }

    <p style="font-size: 12px; color: #666;">UNFRAME</p>
  </div>
`;

const buildAdditionalRequestedHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  requestMessage,
  applicationDetailUrl,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">UNFRAME 추가자료 요청 안내</h2>
    <p style="margin-bottom: 16px;">
      안녕하세요, ${applicantName}님.<br />
      신청하신 프로젝트를 검토하는 과정에서 추가 확인이 필요한 자료가 있어 안내드립니다.
    </p>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa; margin-bottom: 20px;">
      <p><strong>프로젝트명</strong><br />${exhibitionTitle || "-"}</p>
      <p><strong>파트너 유형</strong><br />${formatPartner(partnerType)}</p>
      <p><strong>선택 프로그램</strong><br />${formatProgram(selectedProgram)}</p>
      <p><strong>선택 일정</strong><br />${selectedDate || "-"}</p>
      <p><strong>추가 요청 사항</strong><br />${requestMessage || "-"}</p>
    </div>

    ${
      applicationDetailUrl
        ? `<p style="margin-bottom: 16px;"><a href="${applicationDetailUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">추가 정보 제출하기</a></p>`
        : ""
    }

    <p style="font-size: 12px; color: #666;">UNFRAME</p>
  </div>
`;

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
      type,
      applicantName,
      applicantEmail,
      exhibitionTitle,
      selectedDate,
      selectedProgram,
      partnerType,
      rejectionReason = "",
      requestMessage = "",
      applicationDetailUrl = "",
    } = payload;

    if (!applicantEmail) {
      return json(400, { error: "Applicant email is required" });
    }

    if (!type || !["approved", "rejected", "additional_requested"].includes(type)) {
      return json(400, { error: "Invalid email type" });
    }

    let subject = "";
    let html = "";

    if (type === "approved") {
      subject = `[UNFRAME] 신청이 승인되었습니다`;
      html = buildApprovedHtml({
        applicantName,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        applicationDetailUrl,
      });
    }

    if (type === "rejected") {
      subject = `[UNFRAME] 신청 검토 결과를 안내드립니다`;
      html = buildRejectedHtml({
        applicantName,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        rejectionReason,
        applicationDetailUrl,
      });
    }

    if (type === "additional_requested") {
      subject = `[UNFRAME] 추가자료 요청 안내`;
      html = buildAdditionalRequestedHtml({
        applicantName,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        requestMessage,
        applicationDetailUrl,
      });
    }

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
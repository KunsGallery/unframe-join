const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatProgram = (program) => {
  if (!program) return "-";
  return `${program.name} · ${program.price}만원`;
};

const formatPartner = (partnerType) => {
  if (partnerType === "brand") return "Brand / Team";
  if (partnerType === "artist") return "Artist";
  return partnerType || "-";
};

const pad2 = (num) => String(num).padStart(2, "0");

const formatReceiptStamp = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}.${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
};

const formatKoreanDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = date.getHours();
  const minute = pad2(date.getMinutes());
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${year}.${month}.${day} ${period} ${hour12}:${minute}`;
};

const buildReferenceId = ({
  applicationId,
  selectedDate,
  applicantEmail,
  exhibitionTitle,
}) => {
  if (applicationId) return String(applicationId).slice(0, 16).toUpperCase();

  const base = `${selectedDate || ""}-${applicantEmail || ""}-${exhibitionTitle || ""}`;
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 16) || "UNFRAME-ENTRY";
};

const buildApplicantHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  applicationDetailUrl,
  submittedAt,
  applicationId,
}) => {
  const stamp = formatReceiptStamp(submittedAt); // 예: 03.26.08:00
  const receivedAt = formatKoreanDateTime(submittedAt);
  const referenceId = buildReferenceId({
    applicationId,
    selectedDate,
    applicantEmail: "",
    exhibitionTitle,
  });

  const safeApplicantName = escapeHtml(applicantName || "신청자");
  const safeExhibitionTitle = escapeHtml(exhibitionTitle || "-");
  const safePartnerType = escapeHtml(formatPartner(partnerType));
  const safeProgram = escapeHtml(formatProgram(selectedProgram));
  const safeDate = escapeHtml(selectedDate || "-");
  const safeApplicationDetailUrl = escapeHtml(applicationDetailUrl || "");
  const safeStamp = escapeHtml(stamp || "--.--.--:--");
  const safeReferenceId = escapeHtml(referenceId || "UNFRAME-ENTRY");
  const safeReceivedAt = escapeHtml(receivedAt || "-");

  return `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UNFRAME - Submission Received</title>
  </head>
  <body style="margin:0;padding:0;background-color:#004aad;-webkit-font-smoothing:antialiased;">
    <center style="width:100%;background-color:#004aad;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-spacing:0;width:100%;background-color:#004aad;">
        <tr>
          <td align="center" style="padding:60px 20px;background-color:#004aad;">
            
            <!-- Main receipt card -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:440px;border-spacing:0;width:100%;margin:0 auto;background-color:#f6f4ee;color:#004aad;border-radius:4px 4px 0 0;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.3);">
              
              <!-- Header -->
              <tr>
                <td style="padding:40px;border-bottom:2px solid #004aad;text-align:center;">
                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:20px;font-weight:900;letter-spacing:10px;text-transform:uppercase;color:#004aad;">
                    UNFRAME
                  </div>
                </td>
              </tr>

              <!-- Date section -->
              <tr>
                <td style="padding:50px 40px;text-align:center;background-color:rgba(0,74,173,0.03);">
                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:4px;opacity:0.6;margin-bottom:10px;text-transform:uppercase;color:#004aad;">
                    Inspiration Date
                  </div>

                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:56px;line-height:1;font-weight:900;letter-spacing:-2px;color:#004aad;margin:0;">
                    ${safeStamp}
                  </div>

                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:10px;opacity:0.5;margin-top:10px;letter-spacing:2px;color:#004aad;">
                    STATUS: ARRIVED
                  </div>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px;text-align:left;">
                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.4;margin-bottom:20px;color:#004aad;word-break:keep-all;">
                    당신이 보내주신 영감이<br/>언프레임에 도착했습니다.
                  </div>

                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.9;color:#444444;margin-bottom:30px;font-weight:400;word-break:keep-all;">
                    안녕하세요, ${safeApplicantName}님.<br/><br/>
                    반갑습니다. 언프레임의 새로운 페이지를 당신과 함께 채울 수 있을지 설레는 마음으로 검토를 시작합니다. 
                    보내주신 비전의 조각들은 저희 큐레이션 보드에 의해 소중히 다루어질 것입니다.
                  </div>

                  <!-- Data table -->
                  <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:12px;border-top:1px dashed rgba(0,74,173,0.3);padding-top:25px;margin-top:25px;">
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">REF.ID</span>
                      <span style="float:right;font-weight:700;color:#004aad;">${safeReferenceId}</span>
                    </div>
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">QUEUE</span>
                      <span style="float:right;font-weight:700;color:#004aad;">CURATORIAL BOARD</span>
                    </div>
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">PARTNER</span>
                      <span style="float:right;font-weight:700;color:#004aad;">${safePartnerType}</span>
                    </div>
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">PROGRAM</span>
                      <span style="float:right;font-weight:700;color:#004aad;">${safeProgram}</span>
                    </div>
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">DATE</span>
                      <span style="float:right;font-weight:700;color:#004aad;">${safeDate}</span>
                    </div>
                    <div style="margin-bottom:8px;overflow:hidden;">
                      <span style="float:left;opacity:0.5;color:#004aad;">TIME</span>
                      <span style="float:right;font-weight:700;color:#004aad;">${safeReceivedAt}</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Button -->
              ${
                safeApplicationDetailUrl
                  ? `
              <tr>
                <td style="padding:0 40px 10px 40px;">
                  <a href="${safeApplicationDetailUrl}" style="display:block;background-color:#004aad;color:#f6f4ee;text-align:center;padding:18px 0;font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-decoration:none;text-transform:uppercase;border-radius:2px;">
                    신청내역 보기
                  </a>
                </td>
              </tr>
              `
                  : ""
              }

              <!-- Barcode -->
              <tr>
                <td style="padding:30px 40px 20px 40px;text-align:center;opacity:0.6;">
                  <div style="width:100%;height:40px;background-image:repeating-linear-gradient(90deg,#004aad,#004aad 2px,transparent 2px,transparent 4px,#004aad 4px,#004aad 5px,transparent 5px,transparent 8px);"></div>
                  <div style="font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:9px;margin-top:10px;letter-spacing:5px;opacity:0.6;color:#004aad;">
                    * UNFRAME SYSTEM AUTHENTICATED *
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="text-align:center;padding:0 40px 40px 40px;font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:10px;opacity:0.4;letter-spacing:1px;line-height:1.6;color:#004aad;">
                  WE WILL REVIEW YOUR VISION WITHIN 5 DAYS.<br/>
                  THANK YOU FOR YOUR PATIENCE.<br/>
                  PLEASE RETAIN THIS RECEIPT.
                </td>
              </tr>
            </table>

            <!-- Jagged bottom -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:440px;border-spacing:0;width:100%;margin:0 auto;box-shadow:none;">
              <tr>
                <td style="background:#f6f4ee;height:20px;position:relative;border-radius:0 0 4px 4px;"></td>
              </tr>
              <tr>
                <td style="height:15px;background-image:linear-gradient(135deg,#f6f4ee 25%,transparent 25%),linear-gradient(225deg,#f6f4ee 25%,transparent 25%);background-position:left top;background-size:20px 30px;background-repeat:repeat-x;"></td>
              </tr>
            </table>

            <!-- Copyright -->
            <div style="margin-top:60px;color:#f6f4ee;font-family:Inter,'Noto Sans KR',Arial,sans-serif;font-size:10px;opacity:0.3;letter-spacing:3px;text-transform:uppercase;">
              © 2026 UNFRAME ARCHIVE. ALL RIGHTS RESERVED.
            </div>
          </td>
        </tr>
      </table>
    </center>
  </body>
  </html>
  `;
};

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
  submittedAt,
  applicationId,
}) => `
  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
    <h2 style="margin-bottom: 20px;">새 신청서가 접수되었습니다.</h2>

    <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa;">
      <p><strong>접수 코드</strong><br />${escapeHtml(
        buildReferenceId({
          applicationId,
          selectedDate,
          applicantEmail,
          exhibitionTitle,
        })
      )}</p>
      <p><strong>접수 시각</strong><br />${escapeHtml(formatKoreanDateTime(submittedAt))}</p>
      <p><strong>프로젝트명</strong><br />${escapeHtml(exhibitionTitle || "-")}</p>
      <p><strong>신청자명</strong><br />${escapeHtml(applicantName || "-")}</p>
      <p><strong>이메일</strong><br />${escapeHtml(applicantEmail || "-")}</p>
      <p><strong>연락처</strong><br />${escapeHtml(phone || "-")}</p>
      <p><strong>파트너 유형</strong><br />${escapeHtml(formatPartner(partnerType))}</p>
      <p><strong>브랜드명</strong><br />${escapeHtml(brandName || "-")}</p>
      <p><strong>활동명</strong><br />${escapeHtml(stageName || "-")}</p>
      <p><strong>선택 프로그램</strong><br />${escapeHtml(formatProgram(selectedProgram))}</p>
      <p><strong>선택 일정</strong><br />${escapeHtml(selectedDate || "-")}</p>
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
      applicationDetailUrl = "",
      submittedAt = new Date().toISOString(),
      applicationId = "",
    } = payload;

    if (!applicantEmail) {
      return json(400, { error: "Applicant email is required" });
    }

    await sendMail({
      apiKey,
      from,
      to: [applicantEmail],
      subject: `[UNFRAME] 신청이 정상적으로 접수되었습니다`,
      html: buildApplicantHtml({
        applicantName,
        exhibitionTitle,
        selectedDate,
        selectedProgram,
        partnerType,
        applicationDetailUrl,
        submittedAt,
        applicationId,
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
        submittedAt,
        applicationId,
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
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
}) => {
  const safeApplicantName = escapeHtml(applicantName || "신청자");
  const safeExhibitionTitle = escapeHtml(exhibitionTitle || "-");
  const safeSelectedDate = escapeHtml(selectedDate || "-");
  const safeSelectedProgram = escapeHtml(formatProgram(selectedProgram));
  const safePartnerType = escapeHtml(formatPartner(partnerType));
  const safeApplicationDetailUrl = escapeHtml(applicationDetailUrl || "");

  return `
  <!doctype html>
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>UNFRAME - Let's fill the page</title>
    </head>
    <body style="margin:0;padding:0;background-color:#004aad;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;background-color:#004aad;">
        <tr>
          <td align="center" style="padding:80px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;">
              <tr>
                <td style="background-color:#f6f4ee;border-radius:4px 4px 0 0;overflow:hidden;color:#004aad;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding:40px;text-align:left;border-bottom:1px solid rgba(0,74,173,0.1);font-family:Arial,sans-serif;font-size:28px;font-weight:900;letter-spacing:-1px;text-transform:uppercase;color:#004aad;">
                        UNFRAME
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:60px 40px 40px 40px;">
                        <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:30px;display:block;opacity:0.6;color:#004aad;">
                          The First Page
                        </div>

                        <div style="font-family:Arial,sans-serif;font-size:38px;font-weight:900;line-height:1.1;letter-spacing:-2px;margin-bottom:40px;color:#004aad;">
                          우리가 함께<br/>채워갈 시간들.
                        </div>

                        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;margin-bottom:24px;color:#333333;word-break:keep-all;">
                          안녕하세요, ${safeApplicantName}님.<br/><br/>
                          보내주신 <strong>${safeExhibitionTitle}</strong>은 언프레임의 방향성과 잘 맞닿아 있다고 판단되어 이번 회차 협업/전시 진행 대상으로 선정되었습니다.
                        </div>

                        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;margin-bottom:40px;color:#333333;word-break:keep-all;">
                          이제 이 흰 여백 위에 우리가 함께 그려나갈 이야기를 시작하려 합니다.<br/>
                          아래 내용을 기준으로 이후 진행 안내는 마이페이지와 이메일을 통해 이어집니다.
                        </div>

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;border-collapse:collapse;">
                          <tr>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);width:110px;">
                              Project
                            </td>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                              ${safeExhibitionTitle}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                              Partner
                            </td>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                              ${safePartnerType}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                              Program
                            </td>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                              ${safeSelectedProgram}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);border-bottom:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                              Schedule
                            </td>
                            <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);border-bottom:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                              ${safeSelectedDate}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="height:2px;background-color:#f6f4ee;border-left:0;border-right:0;border-top:0;border-bottom:0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="height:2px;background-image:linear-gradient(to right,#004aad 50%,rgba(255,255,255,0) 0%);background-position:bottom;background-size:15px 1px;background-repeat:repeat-x;background-color:#f6f4ee;"></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background-color:#f6f4ee;color:#004aad;padding:40px;border-radius:0 0 4px 4px;">
                  ${
                    safeApplicationDetailUrl
                      ? `
                      <a href="${safeApplicationDetailUrl}" style="display:block;width:100%;background-color:#004aad;color:#f6f4ee;text-align:center;padding:22px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:4px;text-decoration:none;text-transform:uppercase;border-radius:2px;">
                        진행 가이드 보기
                      </a>
                    `
                      : ""
                  }

                  <div style="margin-top:30px;border-top:1px solid rgba(0,74,173,0.1);padding-top:20px;">
                    <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;opacity:0.5;line-height:1.8;color:#004aad;">
                      DESTINATION: COLLABORATION<br/>
                      GATE: OPENED<br/>
                      VALID FOR: THIS PROJECT
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildRejectedHtml = ({
  applicantName,
  reviewSummary,
  improvementSuggestions,
  rejectionReason,
  applicationDetailUrl,
}) => {
  const safeApplicantName = escapeHtml(applicantName || "신청자");
  const safeReviewSummary = escapeHtml(
    reviewSummary ||
      rejectionReason ||
      "이번 회차에서는 제출 자료의 방향성과 전시 구성의 전달 밀도를 중심으로 검토했습니다. 현재 단계에서는 프로젝트의 핵심 메시지가 다소 넓게 퍼져 있어, 강점이 한 번에 응집되어 보이기 어려웠습니다."
  );
  const safeImprovementSuggestions = escapeHtml(
    improvementSuggestions ||
      "대표 이미지의 선명도와 프로젝트 설명의 구조를 조금 더 정리해 주시면, 다음 검토에서 강점이 더 분명하게 전달될 수 있습니다."
  );
  const safeApplicationDetailUrl = escapeHtml(applicationDetailUrl || "");

  return `
  <!doctype html>
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>UNFRAME - Archived in Memory</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f6f4ee;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f6f4ee;">
        <tr>
          <td align="center" style="padding:100px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:460px;margin:0 auto;background-color:#ffffff;border:1px solid rgba(0,74,173,0.15);box-shadow:0 10px 30px rgba(0,74,173,0.05);">
              <tr>
                <td style="padding:70px 50px;position:relative;">
                  <div style="position:absolute;top:40px;right:40px;border:2px solid rgba(0,74,173,0.3);padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;transform:rotate(15deg);color:rgba(0,74,173,0.4);text-transform:uppercase;">
                    Permanently Recorded
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:900;letter-spacing:6px;margin-bottom:60px;color:#004aad;">
                    UNFRAME
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:26px;font-weight:700;line-height:1.5;margin-bottom:30px;word-break:keep-all;color:#004aad;">
                    당신이 남겨준 페이지는<br/>우리의 서가에 기록되었습니다.
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;margin-bottom:26px;font-weight:400;word-break:keep-all;">
                    안녕하세요, ${safeApplicantName}님.<br/><br/>
                    이번 회차에서는 함께하지 않게 되었지만, 보내주신 기획과 시도는 언프레임 내부 기록 안에 분명한 인상으로 남았습니다.
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;margin-bottom:22px;font-weight:400;word-break:keep-all;">
                    <strong style="color:#004aad;">검토 결과</strong><br/>
                    ${safeReviewSummary}
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;margin-bottom:34px;font-weight:400;word-break:keep-all;">
                    <strong style="color:#004aad;">다음 지원 시 참고하실 점</strong><br/>
                    ${safeImprovementSuggestions}
                  </div>

                  ${
                    safeApplicationDetailUrl
                      ? `
                      <div style="margin-bottom:18px;">
                        <a href="${safeApplicationDetailUrl}" style="display:inline-block;padding:14px 22px;background:#004aad;color:#f6f4ee;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border-radius:999px;">
                          심사결과 상세보기
                        </a>
                      </div>
                    `
                      : ""
                  }

                  <div style="margin-top:60px;font-family:Arial,sans-serif;font-size:10px;opacity:0.5;border-left:2px solid #004aad;padding-left:15px;text-transform:uppercase;letter-spacing:1px;line-height:1.8;color:#004aad;">
                    UNFRAME CURATORIAL BOARD<br/>
                    SEOUL / ARCHIVE DIVISION
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildAdditionalRequestedHtml = ({
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  requestMessage,
  applicationDetailUrl,
}) => {
  const safeApplicantName = escapeHtml(applicantName || "신청자");
  const safeExhibitionTitle = escapeHtml(exhibitionTitle || "-");
  const safeSelectedDate = escapeHtml(selectedDate || "-");
  const safeSelectedProgram = escapeHtml(formatProgram(selectedProgram));
  const safePartnerType = escapeHtml(formatPartner(partnerType));
  const safeRequestMessage = escapeHtml(
    requestMessage || "추가 확인이 필요한 사항이 등록되면 이곳에 표시됩니다."
  );
  const safeApplicationDetailUrl = escapeHtml(applicationDetailUrl || "");

  return `
  <!doctype html>
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>UNFRAME - Additional Materials Requested</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f6f4ee;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f6f4ee;">
        <tr>
          <td align="center" style="padding:100px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:460px;margin:0 auto;background-color:#ffffff;border:1px solid rgba(0,74,173,0.15);box-shadow:0 10px 30px rgba(0,74,173,0.05);">
              <tr>
                <td style="padding:70px 50px;position:relative;">
                  <div style="position:absolute;top:40px;right:40px;border:2px solid rgba(0,74,173,0.3);padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;transform:rotate(15deg);color:rgba(0,74,173,0.4);text-transform:uppercase;">
                    Additional Review
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:900;letter-spacing:6px;margin-bottom:60px;color:#004aad;">
                    UNFRAME
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:26px;font-weight:700;line-height:1.5;margin-bottom:30px;word-break:keep-all;color:#004aad;">
                    당신의 페이지를 조금 더<br/>선명하게 보고 싶습니다.
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;margin-bottom:26px;font-weight:400;word-break:keep-all;">
                    안녕하세요, ${safeApplicantName}님.<br/><br/>
                    신청해주신 프로젝트를 검토하는 과정에서 몇 가지를 더 확인하면 좋겠다고 판단되어 추가자료를 요청드립니다.
                  </div>

                  <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;margin-bottom:26px;font-weight:400;word-break:keep-all;">
                    이는 부족함의 의미라기보다, 프로젝트의 방향과 강점을 조금 더 정확히 읽기 위한 과정에 가깝습니다.
                  </div>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border-collapse:collapse;">
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);width:110px;">
                        Project
                      </td>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                        ${safeExhibitionTitle}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                        Partner
                      </td>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                        ${safePartnerType}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                        Program
                      </td>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                        ${safeSelectedProgram}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);border-bottom:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(0,74,173,0.5);">
                        Schedule
                      </td>
                      <td style="padding:10px 0;border-top:1px solid rgba(0,74,173,0.1);border-bottom:1px solid rgba(0,74,173,0.1);font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#004aad;">
                        ${safeSelectedDate}
                      </td>
                    </tr>
                  </table>

                  <div style="margin-bottom:34px;padding:22px 20px;border:1px solid rgba(0,74,173,0.12);background:#f8fbff;">
                    <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#004aad;opacity:0.7;margin-bottom:12px;">
                      Additional Request
                    </div>
                    <div style="font-family:Arial,sans-serif;font-size:14.5px;line-height:2.0;color:#555555;word-break:keep-all;white-space:pre-wrap;">
                      ${safeRequestMessage}
                    </div>
                  </div>

                  ${
                    safeApplicationDetailUrl
                      ? `
                      <div style="margin-bottom:18px;">
                        <a href="${safeApplicationDetailUrl}" style="display:inline-block;padding:14px 22px;background:#004aad;color:#f6f4ee;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border-radius:999px;">
                          추가자료 제출하기
                        </a>
                      </div>
                    `
                      : ""
                  }

                  <div style="margin-top:60px;font-family:Arial,sans-serif;font-size:10px;opacity:0.5;border-left:2px solid #004aad;padding-left:15px;text-transform:uppercase;letter-spacing:1px;line-height:1.8;color:#004aad;">
                    UNFRAME REVIEW DESK<br/>
                    SEOUL / MATERIAL CHECK
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
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
      type,
      applicantName,
      applicantEmail,
      exhibitionTitle,
      selectedDate,
      selectedProgram,
      partnerType,
      rejectionReason = "",
      reviewSummary = "",
      improvementSuggestions = "",
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
      subject = `[UNFRAME] 함께 채워갈 시간이 시작됩니다`;
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
      subject = `[UNFRAME] 심사 결과를 안내드립니다`;
      html = buildRejectedHtml({
        applicantName,
        reviewSummary,
        improvementSuggestions,
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
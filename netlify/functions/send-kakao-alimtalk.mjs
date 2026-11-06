import crypto from "crypto";
import { verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import { claimApplicantNotification, loadApplicantNotification } from "./_lib/applicationNotifications.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const SOLAPI_API_BASE = "https://api.solapi.com";
const PF_ID = "KA01PF260325031321194kcKwc6ZYXsv";

const TEMPLATE_IDS = {
  application_received: "KA01TP261106065800163RqIuHqhyOOW",
  approved: "KA01TP260325034526065GQ9XimofAfW",
  rejected: "KA01TP260325034622780vfd4ywQIfcW",
  additional_requested: "KA01TP260325034817679Im8S9Aminvm",
  additional_submitted_admin: "KA01TP260325034915499qlw3OOYWmK2",
};

const normalizeKoreanPhone = (value = "") => String(value).replace(/\D/g, "");

const formatProgram = (program) => {
  if (!program) return "-";
  return `${program.name} · ${program.price}만원`;
};

const buildApplicationDetailUrl = (rawUrl = "", applicationId = "") => {
  if (rawUrl) return rawUrl;
  if (!applicationId) return "";
  return `https://example.com/?view=my-page&applicationId=${encodeURIComponent(
    applicationId
  )}&app=${encodeURIComponent(applicationId)}`;
};

const buildAuthHeaders = ({
  apiKey,
  apiSecret,
  date = new Date().toISOString(),
  salt = crypto.randomUUID(),
}) => {
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return {
    Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    "Content-Type": "application/json",
  };
};

const SCHEDULE_FALLBACK = "추후 안내";

export const buildKakaoPayload = ({
  type,
  to,
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  requestMessage,
  applicationId,
  applicationDetailUrl,
  kakaoMessage,
  receivedAt,
  deadlineLabel,
  announcementLabel,
}) => {
  const normalizedTo = normalizeKoreanPhone(to);

  if (!normalizedTo) {
    throw new Error("수신번호가 비어 있습니다.");
  }

  const templateId = TEMPLATE_IDS[type];
  if (!templateId) {
    throw new Error("지원하지 않는 알림톡 타입입니다.");
  }

  const detailUrl = buildApplicationDetailUrl(applicationDetailUrl, applicationId);

  const commonVariables = {
    "#{name}": applicantName || "신청자",
    "#{project_name}": exhibitionTitle || "-",
  };

  const customMessage = String(kakaoMessage || "").trim();
  const customVariables = customMessage
    ? {
        "#{message}": customMessage,
        "#{custom_message}": customMessage,
      }
    : {};

  if (type === "application_received") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        // Solapi matches these against the approved template, so they stay exactly these five.
        variables: {
          "#{작가명}": applicantName || "지원자",
          "#{공모명}": exhibitionTitle || "-",
          "#{접수일시}":
            receivedAt ||
            new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date()),
          "#{모집마감일}": deadlineLabel || SCHEDULE_FALLBACK,
          "#{결과발표일}": announcementLabel || SCHEDULE_FALLBACK,
        },
      },
    };
  }

  if (type === "approved") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        variables: {
          ...commonVariables,
          ...customVariables,
          "#{selected_date}": selectedDate || "-",
          "#{program_name}": formatProgram(selectedProgram),
          "#{application_id}": detailUrl,
        },
      },
    };
  }

  if (type === "rejected") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        variables: {
          ...commonVariables,
          ...customVariables,
          "#{selected_date}": selectedDate || "-",
          "#{application_id}": detailUrl,
        },
      },
    };
  }

  if (type === "additional_requested") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        variables: {
          ...commonVariables,
          ...customVariables,
          "#{request_message}": requestMessage || "-",
          "#{application_id}": detailUrl,
        },
      },
    };
  }

  if (type === "additional_submitted_admin") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        variables: {
          ...commonVariables,
          ...customVariables,
        },
      },
    };
  }

  throw new Error("지원하지 않는 알림톡 타입입니다.");
};

export const sendKakaoMessage = async ({ apiKey, apiSecret, payload }) => {
  const headers = buildAuthHeaders({ apiKey, apiSecret });

  const response = await fetch(`${SOLAPI_API_BASE}/messages/v4/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: payload,
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
    const errorMessage =
      result?.errorMessage ||
      result?.message ||
      JSON.stringify(result) ||
      `SOLAPI error (${response.status})`;

    throw new Error(errorMessage);
  }

  if (result?.errorCode) {
    throw new Error(result?.errorMessage || "알림톡 발송 실패");
  }

  return result;
};

export const buildReceiptKakaoPayload = ({ context, details }) =>
  buildKakaoPayload({
    type: "application_received",
    to: context.phone,
    applicantName: context.name,
    exhibitionTitle: details.title,
    receivedAt: context.submittedAt,
    deadlineLabel: details.deadlineLabel,
    announcementLabel: details.announcementLabel,
  });

const handleApplicantReceipt = async (body, event, credentials) => {
  const notice = await loadApplicantNotification(event, body.applicationId);
  const { identity, ref, context, settings } = notice;

  if (!settings.kakaoEnabled) return json(200, { ok: true, skipped: true });
  if (!context.phone) return json(400, { error: "Recipient phone is required" });

  const claimed = await claimApplicantNotification({ ref, uid: identity.uid, field: "receivedKakaoClaimedAt" });
  if (!claimed) return json(200, { ok: true, duplicate: true });

  try {
    const result = await sendKakaoMessage({
      ...credentials,
      payload: buildReceiptKakaoPayload(notice),
    });
    return json(200, { ok: true, result });
  } catch (error) {
    await ref.update({ receivedKakaoError: String(error?.message || "알림톡 발송 실패").slice(0, 500) });
    throw error;
  }
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const adminCaller = body.type !== "application_received" || body.adminTest === true;
    if (adminCaller) await verifyAdminRequest(event);
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;

    if (!apiKey || !apiSecret) {
      return json(500, { error: "Missing SOLAPI env vars" });
    }

    if (!adminCaller) return await handleApplicantReceipt(body, event, { apiKey, apiSecret });

    const {
      type,
      to,
      applicantName,
      exhibitionTitle,
      selectedDate = "",
      selectedProgram = null,
      requestMessage = "",
      applicationId = "",
      applicationDetailUrl = "",
      kakaoMessage = "",
    } = body;

    if (
      !type ||
      ![
        "application_received",
        "approved",
        "rejected",
        "additional_requested",
        "additional_submitted_admin",
      ].includes(type)
    ) {
      return json(400, { error: "Invalid kakao type" });
    }

    if (!to) {
      return json(400, { error: "Recipient phone is required" });
    }

    const payload = buildKakaoPayload({
      type,
      to,
      applicantName,
      exhibitionTitle,
      selectedDate,
      selectedProgram,
      requestMessage,
      applicationId,
      applicationDetailUrl,
      kakaoMessage,
    });

    const result = await sendKakaoMessage({
      apiKey,
      apiSecret,
      payload,
    });

    return json(200, { ok: true, result });
  } catch (error) {
    console.error("send-kakao-alimtalk error:", error?.statusCode || 500);
    return json(error?.statusCode || 500, {
      error: error?.statusCode ? error.message : "Failed to send kakao alimtalk",
    });
  }
}

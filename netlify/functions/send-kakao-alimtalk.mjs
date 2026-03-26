import crypto from "crypto";

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
  application_received: "KA01TP260325034339068F1cDumvabAJ",
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

const buildKakaoPayload = ({
  type,
  to,
  applicantName,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  requestMessage,
  applicationId,
  applicationDetailUrl,
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

  if (type === "application_received") {
    return {
      to: normalizedTo,
      kakaoOptions: {
        pfId: PF_ID,
        templateId,
        variables: {
          ...commonVariables,
          "#{selected_date}": selectedDate || "-",
          "#{program_name}": formatProgram(selectedProgram),
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
        },
      },
    };
  }

  throw new Error("지원하지 않는 알림톡 타입입니다.");
};

const sendKakaoMessage = async ({ apiKey, apiSecret, payload }) => {
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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;

    if (!apiKey || !apiSecret) {
      return json(500, { error: "Missing SOLAPI env vars" });
    }

    const body = JSON.parse(event.body || "{}");
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
    });

    const result = await sendKakaoMessage({
      apiKey,
      apiSecret,
      payload,
    });

    return json(200, { ok: true, result });
  } catch (error) {
    console.error("send-kakao-alimtalk error:", error);
    return json(500, {
      error: error?.message || "Failed to send kakao alimtalk",
    });
  }
}
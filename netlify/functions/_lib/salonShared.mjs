import crypto from "crypto";

export const APP_ID = "unframe-join";
export const ROOT_PATH = `artifacts/${APP_ID}/public/data`;
export const applicationsPath = `${ROOT_PATH}/applications`;
export const salonEventsPath = `${ROOT_PATH}/salonEvents`;
export const salonLogsPath = `${ROOT_PATH}/salonCheckInLogs`;

export const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

export const parseBody = (event) => {
  try { return JSON.parse(event.body || "{}"); } catch { return {}; }
};

export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const getQrSecret = () => {
  if (process.env.SALON_QR_TOKEN_SECRET) return process.env.SALON_QR_TOKEN_SECRET;
  if (process.env.FIREBASE_PRIVATE_KEY) return process.env.FIREBASE_PRIVATE_KEY;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).private_key || ""; } catch { return ""; }
  }
  throw new Error("SALON_QR_TOKEN_SECRET 환경변수가 없습니다.");
};

export const issueQrToken = ({ applicationId, version }) => {
  const nonce = crypto.randomBytes(32).toString("base64url");
  return { nonce, token: deriveQrToken({ applicationId, version, nonce }) };
};

export const deriveQrToken = ({ applicationId, version, nonce }) => {
  if (!applicationId || !nonce) throw new Error("QR 재구성 정보가 없습니다.");
  return crypto.createHmac("sha256", getQrSecret()).update(`${applicationId}:${version}:${nonce}`).digest("base64url");
};

export const getBaseUrl = () => {
  const raw = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
  return raw.replace(/\/$/, "");
};

export const asDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isExpired = (value) => {
  const date = asDate(value);
  return Boolean(date && date.getTime() < Date.now());
};

export const formatDateParts = (value) => {
  const date = asDate(value);
  if (!date) return { eventDate: "일정 미정", eventTime: "", eventDateTime: "일정 미정" };
  const eventDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
  const eventTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" }).format(date);
  return { eventDate, eventTime, eventDateTime: `${eventDate} ${eventTime}` };
};

const replaceMessageVariables = (message, variables) =>
  Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value ?? "")),
    String(message || "")
  );

const buildAuthHeaders = ({ apiKey, apiSecret }) => {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return {
    Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    "Content-Type": "application/json",
  };
};

export const sendSalonAlimtalk = async ({ kind, application, salon, passUrl = "", checkedInAt = null }) => {
  const setting = salon.notificationSettings || {};
  const enabled = kind === "approval" ? setting.approvalEnabled !== false : setting.welcomeEnabled !== false;
  if (!enabled) return { disabled: true };

  const templateId = kind === "approval"
    ? setting.approvalTemplateId || process.env.SOLAPI_SALON_APPROVAL_TEMPLATE_ID
    : setting.welcomeTemplateId || process.env.SOLAPI_SALON_WELCOME_TEMPLATE_ID;
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PF_ID || "KA01PF260325031321194kcKwc6ZYXsv";
  if (!templateId) throw new Error("SALON 알림톡 템플릿 ID가 없습니다.");
  if (!apiKey || !apiSecret) throw new Error("SOLAPI 환경변수가 없습니다.");

  const phone = String(application.phone || "").replace(/\D/g, "");
  if (!phone) throw new Error("수신 연락처가 없습니다.");
  const dateParts = formatDateParts(salon.eventStartAt);
  const values = {
    name: application.applicantName || application.nickname || "참가자",
    salonTitle: salon.title || application.salonTitle || "UNFRAME SALON",
    ...dateParts,
    venueName: salon.venueName || "",
    venueAddress: salon.venueAddress || "",
    passUrl,
    checkedInAt: formatDateParts(checkedInAt).eventDateTime,
    programUrl: salon.links?.programUrl || "",
    guestbookUrl: salon.links?.guestbookUrl || "",
    instagramUrl: salon.links?.instagramUrl || "",
  };
  const customMessage = kind === "approval" ? setting.approvalMessage : setting.welcomeMessage;
  const variables = Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => [[`#{${key}}`, value], [`{{${key}}}`, value]])
  );
  if (customMessage !== undefined && customMessage !== null) {
    variables["#{message}"] = replaceMessageVariables(customMessage, values);
  }

  const response = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: buildAuthHeaders({ apiKey, apiSecret }),
    body: JSON.stringify({ message: { to: phone, kakaoOptions: { pfId, templateId, variables } } }),
  });
  const text = await response.text();
  let result = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }
  if (!response.ok || result?.errorCode) {
    throw new Error(result?.errorMessage || result?.message || `SOLAPI error (${response.status})`);
  }
  return { ok: true, result };
};

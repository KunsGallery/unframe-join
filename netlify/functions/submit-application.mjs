import {
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  normalizeOpenCallFormSettings,
} from "../../src/constants/openCall.js";
import { adminDb, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";
import { enforceRateLimit } from "./_lib/rateLimit.mjs";
import { ROOT_PATH, applicationsPath, json, parseBody } from "./_lib/salonShared.mjs";

const openCallsPath = `${ROOT_PATH}/openCalls`;
const HOUR_MS = 60 * 60 * 1000;
const SHORT = 200;
const MEDIUM = 1000;
const LONG = 10000;
const MAX_STORED_WORKS = 3;

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const text = (value, max, label) => {
  const result = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (result.length > max) throw fail(400, `${label} 항목이 너무 깁니다.`);
  return result;
};

const required = (value, label) => {
  if (!value) throw fail(400, `${label} 항목을 입력해 주세요.`);
  return value;
};

const readEmail = (value, label = "이메일") => {
  const email = text(value, SHORT, label);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "이메일 형식을 확인해 주세요.");
  return email;
};

const readPhone = (value, { min, max }) => {
  const digits = text(value, 40, "연락처").replace(/\D/g, "");
  required(digits, "연락처");
  if (digits.length < min || digits.length > max) throw fail(400, "연락처 형식을 확인해 주세요.");
  return digits;
};

const isStoredFileUrl = (value, folder) => {
  try {
    const url = new URL(value);
    const base = new URL(process.env.R2_PUBLIC_BASE_URL);
    return (
      url.protocol === "https:" &&
      url.origin === base.origin &&
      url.pathname.startsWith(`${base.pathname.replace(/\/$/, "")}/${folder}/`)
    );
  } catch {
    return false;
  }
};

const readFileUrl = (value, folder, label) => {
  const url = text(value, MEDIUM, label);
  if (url && !isStoredFileUrl(url, folder)) throw fail(400, `${label} 파일을 다시 업로드해 주세요.`);
  return url;
};

const readCustomAnswers = (submitted, fields) =>
  fields
    .filter((field) => field.enabled !== false)
    .reduce((answers, field) => {
      const label = field.label || field.id;
      const raw = submitted?.[field.id]?.value;
      const limit = field.maxLength > 0 ? field.maxLength : LONG;
      const value = field.type === "checkbox" ? raw === true : text(raw, limit, label);
      if (field.required && !value) throw fail(400, `'${label}' 항목을 입력해 주세요.`);
      if (field.type === "select" && value && !field.options.includes(value)) {
        throw fail(400, `'${label}' 항목을 다시 선택해 주세요.`);
      }
      answers[field.id] = { label, type: field.type, value };
      return answers;
    }, {});

const readWorks = (submitted, section) => {
  const enabled = section?.enabled !== false;
  const maxCount = enabled ? Number(section?.maxCount || 0) : 0;
  const requiredCount = enabled ? Number(section?.requiredCount || 0) : 0;
  const list = Array.isArray(submitted) ? submitted : [];

  // Review screens index works[0..2], so the stored shape stays three entries.
  return Array.from({ length: MAX_STORED_WORKS }, (_, index) => {
    const work = index < maxCount && list[index] && typeof list[index] === "object" ? list[index] : {};
    const label = `대표 작품 ${index + 1}`;
    const stored = {
      imageUrl: readFileUrl(work.imageUrl, "open-call/works", `${label} 이미지`),
      title: text(work.title, SHORT, `${label} 제목`),
      material: text(work.material, SHORT, `${label} 재료`),
      size: text(work.size, SHORT, `${label} 크기`),
      year: text(work.year, 20, `${label} 제작연도`),
    };
    if (index < requiredCount && !Object.values(stored).every(Boolean)) {
      throw fail(400, `${label} 정보를 모두 입력해 주세요.`);
    }
    return stored;
  });
};

const buildOpenCall = async (body, identity) => {
  const openCallId = text(body.openCallId, SHORT, "공고");
  if (!openCallId || openCallId.includes("/")) throw fail(404, "공고를 찾을 수 없습니다.");
  const snapshot = await adminDb.collection(openCallsPath).doc(openCallId).get();
  if (!snapshot.exists) throw fail(404, "공고를 찾을 수 없습니다.");

  const openCall = createFallbackOpenCall({ ...snapshot.data(), id: openCallId });
  if (openCall.isVisible === false || !getOpenCallDisplayStatus(openCall).canApply) {
    throw fail(409, "현재 접수 가능한 오픈콜이 아닙니다.");
  }

  const { fields, sections, customFields } = normalizeOpenCallFormSettings(openCall.formSettings);
  const enabled = (setting) => setting?.enabled !== false;
  const mustFill = (setting) => enabled(setting) && setting?.required !== false;
  const optionalField = (key, setting, max, label) => {
    if (!enabled(setting)) return "";
    const value = text(body[key], max, label);
    return mustFill(setting) ? required(value, label) : value;
  };

  const birthYear = optionalField("birthYear", fields.birthYear, 4, "출생연도");
  if (birthYear && !/^\d{4}$/.test(birthYear)) throw fail(400, "출생연도는 4자리 숫자로 입력해 주세요.");

  const statementLimit = Number(sections.statement?.maxLength || 0) || LONG;
  const artistStatement = enabled(sections.statement)
    ? required(text(body.artistStatement, statementLimit, "작업 소개"), "작업 소개")
    : "";

  let portfolioUrl = "";
  if (enabled(sections.portfolio)) {
    portfolioUrl = readFileUrl(body.portfolioUrl, "open-call/portfolio", "포트폴리오");
    if (mustFill(sections.portfolio)) required(portfolioUrl, "포트폴리오");
  }

  const privacyAgreed = enabled(sections.privacy) && body.privacyAgreed === true;
  if (mustFill(sections.privacy) && !privacyAgreed) throw fail(400, "개인정보 수집 및 이용에 동의해 주세요.");

  const email = required(readEmail(body.email), "이메일");
  const searchAddress = fields.address?.mode === "search";

  return {
    trackType: "open-call",
    openCallId,
    openCallTitle: openCall.title,
    applicantEmail: email || identity.email || "",
    name: required(text(body.name, 100, "이름"), "이름"),
    phone: readPhone(body.phone, { min: 10, max: 11 }),
    email,
    birthYear,
    addressMain: optionalField("addressMain", fields.address, 300, "주소"),
    addressDetail: enabled(fields.address) && searchAddress ? text(body.addressDetail, 300, "상세 주소") : "",
    postalCode: enabled(fields.address) && searchAddress ? text(body.postalCode, 20, "우편번호") : "",
    medium: optionalField("medium", fields.medium, SHORT, "매체"),
    snsLink: optionalField("snsLink", fields.snsLink, MEDIUM, "SNS / 웹사이트 링크"),
    artistStatement,
    works: readWorks(body.works, sections.works),
    portfolioUrl,
    privacyAgreed,
    customFieldAnswers: readCustomAnswers(body.customFieldAnswers, customFields),
  };
};

const requirePrivacyAgreement = (body) => {
  if (body.privacyAgreed !== true) throw fail(400, "개인정보 수집 및 이용에 동의해 주세요.");
};

const buildRental = (body, identity) => {
  requirePrivacyAgreement(body);
  const name = required(text(body.name, 100, "담당자 이름"), "담당자 이름");
  const email = readEmail(body.email) || identity.email || "";
  return {
    trackType: "rental",
    inquiryType: "space-rental",
    title: required(text(body.title, SHORT, "문의 제목"), "문의 제목"),
    organization: text(body.organization, SHORT, "팀 / 브랜드명"),
    name,
    realName: name,
    phone: readPhone(body.phone, { min: 9, max: 15 }),
    email,
    applicantEmail: email,
    purpose: text(body.purpose, SHORT, "이용 목적"),
    date: text(body.date, 40, "희망 날짜"),
    hours: text(body.hours, SHORT, "이용 시간 / 기간"),
    attendees: text(body.attendees, 100, "예상 인원"),
    budget: text(body.budget, SHORT, "예산 범위"),
    supportScope: text(body.supportScope, SHORT, "필요한 지원 범위") || "공간 이용",
    plan: required(text(body.plan, LONG, "공간 활용 계획"), "공간 활용 계획"),
    equipment: text(body.equipment, LONG, "반입 장비 / 설치 요청"),
    privacyAgreed: true,
  };
};

const buildCollaboration = (body, identity) => {
  requirePrivacyAgreement(body);
  const name = required(text(body.name, 100, "담당자 이름"), "담당자 이름");
  const email = readEmail(body.email) || identity.email || "";
  const referenceUrl = text(body.referenceUrl, MEDIUM, "참고 링크");
  if (referenceUrl && !/^https?:\/\//i.test(referenceUrl)) throw fail(400, "참고 링크는 http 또는 https 주소로 입력해 주세요.");
  return {
    trackType: "collaboration",
    title: required(text(body.title, SHORT, "제안 제목"), "제안 제목"),
    organization: text(body.organization, SHORT, "팀 / 브랜드명"),
    name,
    realName: name,
    phone: readPhone(body.phone, { min: 9, max: 15 }),
    email,
    applicantEmail: email,
    category: text(body.category, SHORT, "협업 분야"),
    idea: required(text(body.idea, LONG, "아이디어와 목표"), "아이디어와 목표"),
    desiredRole: text(body.desiredRole, LONG, "희망하는 역할"),
    timelineBudget: text(body.timelineBudget, LONG, "일정 / 예산 메모"),
    referenceUrl,
    privacyAgreed: true,
  };
};

const BUILDERS = {
  "open-call": buildOpenCall,
  rental: buildRental,
  collaboration: buildCollaboration,
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const identity = await verifyUserRequest(event);
    const body = parseBody(event);
    const build = Object.hasOwn(BUILDERS, body.trackType) ? BUILDERS[body.trackType] : null;
    if (!build) return json(400, { error: "지원하지 않는 신청 유형입니다." });

    const fields = await build(body, identity);
    await enforceRateLimit({ scope: "submit-application", subject: identity.uid, limit: 5, windowMs: HOUR_MS });

    const ref = adminDb.collection(applicationsPath).doc();
    await ref.set({ ...fields, status: "review", userId: identity.uid, submittedAt: new Date() });
    return json(201, { ok: true, applicationId: ref.id });
  } catch (error) {
    if (!error.statusCode) console.error("submit-application error");
    return json(error.statusCode || 500, {
      error: error.statusCode ? error.message : "신청 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
}

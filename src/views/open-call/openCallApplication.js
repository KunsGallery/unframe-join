import { OPEN_CALL_BIO_MAX_LENGTH, OPEN_CALL_MAX_WORKS, OPEN_CALL_MIN_WORKS } from "../../constants/openCall.js";

export const createEmptyWork = () => ({ imageUrl: "", title: "", material: "", height: "", width: "", year: "", price: "" });

export const createEmptyApplication = () => ({
  birthYear: "",
  name: "",
  englishName: "",
  stageName: "",
  phone: "",
  email: "",
  snsLink: "",
  otherLink: "",
  artistStatement: "",
  portfolioUrl: "",
  works: Array.from({ length: OPEN_CALL_MIN_WORKS }, createEmptyWork),
});

const REQUIRED_FIELDS = [
  ["birthYear", "출생연도를 입력해 주세요."],
  ["name", "이름을 입력해 주세요."],
  ["englishName", "영어 이름을 입력해 주세요."],
  ["phone", "휴대폰번호를 입력해 주세요."],
  ["email", "이메일을 입력해 주세요."],
  ["snsLink", "홈페이지 또는 SNS를 입력해 주세요."],
  ["portfolioUrl", "포트폴리오 파일을 올려 주세요."],
];
const WORK_FIELDS = [
  ["imageUrl", "이미지를 올려 주세요."],
  ["title", "작품명을 입력해 주세요."],
  ["material", "재료를 입력해 주세요."],
  ["height", "세로를 입력해 주세요."],
  ["width", "가로를 입력해 주세요."],
  ["year", "제작연도를 입력해 주세요."],
  ["price", "작품가격을 입력해 주세요."],
];

const hasText = (value) => Boolean(String(value ?? "").trim());
const isCentimetres = (value) => /^\d+(\.\d+)?$/.test(String(value ?? "").trim()) && Number(value) > 0;
const isBlankWork = (work) => WORK_FIELDS.every(([key]) => !hasText(work[key]));

export const validateApplication = (data, customFields = [], customValues = {}) => {
  const errors = {};
  REQUIRED_FIELDS.forEach(([key, message]) => {
    if (!hasText(data[key])) errors[key] = message;
  });

  if (hasText(data.birthYear) && !/^\d{4}$/.test(data.birthYear.trim())) errors.birthYear = "출생연도는 4자리 숫자로 입력해 주세요.";
  const phoneDigits = String(data.phone ?? "").replace(/\D/g, "");
  if (hasText(data.phone) && (phoneDigits.length < 10 || phoneDigits.length > 11)) errors.phone = "휴대폰번호를 확인해 주세요.";
  if (hasText(data.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "이메일 형식을 확인해 주세요.";
  if (String(data.artistStatement ?? "").trim().length > OPEN_CALL_BIO_MAX_LENGTH) errors.artistStatement = `작가 소개는 ${OPEN_CALL_BIO_MAX_LENGTH}자 이내로 입력해 주세요.`;

  const filled = data.works.filter((work) => !isBlankWork(work));
  if (filled.length < OPEN_CALL_MIN_WORKS) errors.works = `작품을 ${OPEN_CALL_MIN_WORKS}점 이상 올려 주세요.`;
  if (filled.length > OPEN_CALL_MAX_WORKS) errors.works = `작품은 ${OPEN_CALL_MAX_WORKS}점까지 올릴 수 있습니다.`;
  data.works.forEach((work, index) => {
    if (isBlankWork(work) && index >= OPEN_CALL_MIN_WORKS) return;
    if (isBlankWork(work) && filled.length >= OPEN_CALL_MIN_WORKS) return;
    WORK_FIELDS.forEach(([key, message]) => {
      if (!hasText(work[key])) errors[`work-${index}-${key}`] = message;
    });
    ["height", "width"].forEach((key) => {
      if (hasText(work[key]) && !isCentimetres(work[key])) errors[`work-${index}-${key}`] = "숫자만 입력해 주세요.";
    });
  });

  customFields.filter((field) => field.required).forEach((field) => {
    const value = customValues[field.id];
    if (field.type === "checkbox" ? value !== true : !hasText(value)) errors[`custom-${field.id}`] = `${field.label || "이 항목"}을 입력해 주세요.`;
  });
  return errors;
};

export const buildSubmission = (data, customFields = [], customValues = {}) => ({
  trackType: "open-call",
  birthYear: data.birthYear.trim(),
  name: data.name.trim(),
  englishName: data.englishName.trim(),
  stageName: data.stageName.trim(),
  phone: data.phone.replace(/\D/g, ""),
  email: data.email.trim(),
  snsLink: data.snsLink.trim(),
  otherLink: data.otherLink.trim(),
  artistStatement: data.artistStatement.trim(),
  portfolioUrl: data.portfolioUrl.trim(),
  works: data.works.filter((work) => !isBlankWork(work)),
  customFieldAnswers: Object.fromEntries(customFields.map((field) => [field.id, { value: customValues[field.id] ?? (field.type === "checkbox" ? false : "") }])),
});

// Fills empty fields from the saved profile without overwriting what was already typed.
export const applySavedProfile = (data, profile = {}, email = "") => ({
  ...data,
  name: data.name || profile?.realName || "",
  englishName: data.englishName || profile?.englishName || "",
  stageName: data.stageName || profile?.stageName || "",
  phone: data.phone || profile?.phone || "",
  snsLink: data.snsLink || profile?.snsLink || "",
  email: data.email || email || "",
});

// New uploads fill empty rows first, then add rows up to the limit.
export const addUploadedImages = (works, urls) => {
  const next = works.map((work) => ({ ...work }));
  urls.forEach((url) => {
    const empty = next.find((work) => !work.imageUrl);
    if (empty) empty.imageUrl = url;
    else if (next.length < OPEN_CALL_MAX_WORKS) next.push({ ...createEmptyWork(), imageUrl: url });
  });
  return next;
};

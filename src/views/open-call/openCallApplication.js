import { OPEN_CALL_BIO_MAX_LENGTH, OPEN_CALL_MAX_WORKS, OPEN_CALL_MIN_WORKS } from "../../constants/openCall.js";

// Empty required fields are only highlighted; a sentence is kept for values that need correcting.
export const MISSING_FIELD = "missing";

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

const REQUIRED_FIELDS = ["birthYear", "name", "englishName", "phone", "email", "snsLink", "portfolioUrl"];
const WORK_FIELDS = ["imageUrl", "title", "material", "height", "width", "year", "price"];

const hasText = (value) => Boolean(String(value ?? "").trim());
const isCentimetres = (value) => /^\d+(\.\d+)?$/.test(String(value ?? "").trim()) && Number(value) > 0;
const isBlankWork = (work) => WORK_FIELDS.every((key) => !hasText(work[key]));

export const validateApplication = (data, customFields = [], customValues = {}) => {
  const errors = {};
  REQUIRED_FIELDS.forEach((key) => {
    if (!hasText(data[key])) errors[key] = MISSING_FIELD;
  });

  if (hasText(data.birthYear) && !/^\d{4}$/.test(data.birthYear.trim())) errors.birthYear = "출생연도는 4자리 숫자로 입력해 주세요.";
  const phoneDigits = String(data.phone ?? "").replace(/\D/g, "");
  if (hasText(data.phone) && (phoneDigits.length < 10 || phoneDigits.length > 11)) errors.phone = "휴대폰번호를 확인해 주세요.";
  if (hasText(data.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "이메일 형식을 확인해 주세요.";
  if (String(data.artistStatement ?? "").trim().length > OPEN_CALL_BIO_MAX_LENGTH) errors.artistStatement = `작가 소개는 ${OPEN_CALL_BIO_MAX_LENGTH}자 이내로 입력해 주세요.`;

  const filled = data.works.filter((work) => !isBlankWork(work));
    if (filled.length > OPEN_CALL_MAX_WORKS) errors.works = `작품은 ${OPEN_CALL_MAX_WORKS}점까지 올릴 수 있습니다.`;
  data.works.forEach((work, index) => {
    if (isBlankWork(work) && index >= OPEN_CALL_MIN_WORKS) return;
    if (isBlankWork(work) && filled.length >= OPEN_CALL_MIN_WORKS) return;
    WORK_FIELDS.forEach((key) => {
      if (!hasText(work[key])) errors[`work-${index}-${key}`] = MISSING_FIELD;
    });
    ["height", "width"].forEach((key) => {
      if (hasText(work[key]) && !isCentimetres(work[key])) errors[`work-${index}-${key}`] = "숫자만 입력해 주세요.";
    });
  });

  customFields.filter((field) => field.required).forEach((field) => {
    const value = customValues[field.id];
    if (field.type === "checkbox" ? value !== true : !hasText(value)) errors[`custom-${field.id}`] = MISSING_FIELD;
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
  works: data.works.filter((work) => !isBlankWork(work)).map(omitUploadId),
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

export const formatKRW = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || BigInt(digits) === 0n) return "";

  const amount = BigInt(digits);
  const eok = amount / 100000000n;
  const man = (amount % 100000000n) / 10000n;
  const rest = amount % 10000n;
  const parts = [
    eok > 0n ? `${eok.toLocaleString("en-US")}억` : "",
    man > 0n ? `${man.toLocaleString("en-US")}만` : "",
    rest > 0n ? rest.toLocaleString("en-US") : "",
  ].filter(Boolean);
  return `${parts.join(" ")}원`;
};

// Prices stay free text on the server, so only plain numbers get grouped as they are typed.
export const formatPriceInput = (value) => {
  const text = String(value ?? "");
  const digits = text.replace(/,/g, "");
  return /^\d+$/.test(digits) ? BigInt(digits).toLocaleString("en-US") : text;
};

const omitUploadId = (work) => {
  const { uploadId: _uploadId, ...rest } = work;
  return rest;
};

export const stripUploadState = (data) => ({ ...data, works: data.works.map(omitUploadId) });

// Rows are claimed when files are picked, so they stay in the order the applicant chose them.
export const reserveWorkRows = (works, ids) => {
  const next = works.map((work) => ({ ...work }));
  const reservedIds = [];
  ids.forEach((id) => {
    const empty = next.find((work) => !work.imageUrl && !work.uploadId);
    if (empty) empty.uploadId = id;
    else if (next.length < OPEN_CALL_MAX_WORKS) next.push({ ...createEmptyWork(), uploadId: id });
    else return;
    reservedIds.push(id);
  });
  return { works: next, reservedIds };
};

export const completeWorkUpload = (works, id, url) =>
  works.map((work) => (work.uploadId === id ? { ...work, imageUrl: url } : work));

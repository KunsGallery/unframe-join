import {
  DEFAULT_OPEN_CALL_ACCENT,
  DEFAULT_OPEN_CALL_SALES_CONSENT,
  DEFAULT_OPEN_CALL_TERMS,
  normalizeOpenCallCompletionSettings,
  normalizeOpenCallFormSettings,
  normalizeOpenCallLandingLabels,
  normalizeOpenCallNotificationSettings,
  parseOpenCallDate,
} from "../../../constants/openCall.js";

export const createOpenCallId = () =>
  `open-call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const UNPUBLISHED = { status: "draft", isVisible: false, isFeatured: false };
const NO_DATES = { applicationStartAt: null, applicationEndAt: null, announcementAt: null };

// Readers fill any missing field from the fallback call, so a new call states every
// text field as empty. Otherwise another call's wording would appear on its public page.
export const buildBlankOpenCall = ({ id, title }) => ({
  id,
  title,
  trackType: "open-call",
  subtitle: "",
  slug: "",
  edition: "",
  year: "",
  badgeText: "",
  themeKeyword: "",
  themeHanja: "",
  heroTitle: "",
  heroAccent: "",
  statusNoticeText: "현재 지원서를 접수하고 있습니다.",
  introText: "",
  posterUrl: "",
  accentColor: DEFAULT_OPEN_CALL_ACCENT,
  requirementItems: [],
  termsText: DEFAULT_OPEN_CALL_TERMS,
  salesConsentText: DEFAULT_OPEN_CALL_SALES_CONSENT,
  descriptionSections: [],
  landingLabels: normalizeOpenCallLandingLabels(),
  mediumText: "",
  eligibilityText: "",
  benefitText: "",
  magazineText: "",
  applyButtonText: "지원하기",
  faqs: [],
  formSettings: normalizeOpenCallFormSettings(),
  completionSettings: normalizeOpenCallCompletionSettings(),
  notificationSettings: normalizeOpenCallNotificationSettings(),
  ...NO_DATES,
  ...UNPUBLISHED,
});

export const buildDuplicateOpenCall = (source, { id, title }) => {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...content } = source;
  return { ...structuredClone(content), id, title, ...NO_DATES, ...UNPUBLISHED };
};

export const getOpenCallChecklist = (draft = {}) =>
  [
    ["title", "공고명", draft.title],
    ["introText", "공고 소개", draft.introText],
    ["applicationEndAt", "접수 마감일", draft.applicationEndAt],
    ["termsText", "오픈콜 약관", draft.termsText],
  ].map(([key, label, value]) => ({ key, label, ok: Boolean(String(value ?? "").trim()) }));

export const getOpenCallDateProblem = ({ applicationStartAt, applicationEndAt, announcementAt } = {}) => {
  const start = parseOpenCallDate(applicationStartAt);
  const end = parseOpenCallDate(applicationEndAt);
  const announcement = parseOpenCallDate(announcementAt);

  if (start && end && start >= end) return "접수 마감일이 접수 시작일보다 빠릅니다.";
  if (end && announcement && announcement < end) return "결과 발표일이 접수 마감일보다 빠릅니다.";
  return "";
};

// A bare datetime-local value would be read as UTC on the server, nine hours off from Seoul.
export const toStoredOpenCallDate = (value) => parseOpenCallDate(value)?.toISOString() ?? null;

export const moveListItem = (list, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, position) => ({ ...item, order: position + 1 }));
};

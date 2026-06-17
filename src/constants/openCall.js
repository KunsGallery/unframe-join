export const OPEN_CALL_ID = "2026-unframe-open-call-01-afterimage";
export const OPEN_CALL_TITLE = "2026 UNFRAME OPEN CALL 01. 잔상";
export const OPEN_CALL_SUBTITLE = "UNFRAME OPEN CALL 01 : 잔상(殘像)";

export const OPEN_CALL_TEMPLATE_VARIABLES = [
  "{{name}}",
  "{{email}}",
  "{{phone}}",
  "{{openCallTitle}}",
  "{{openCallId}}",
  "{{applicationId}}",
  "{{submittedAt}}",
];

export const DEFAULT_OPEN_CALL_FORM_SECTIONS = {
  applicant: {
    enabled: true,
    title: "지원자 정보",
    description: "지원자 기본 정보를 입력해 주세요.",
  },
  works: {
    enabled: true,
    title: "대표 작품",
    description: "대표 작품 1개는 필수이며, 최대 3개까지 입력할 수 있습니다.",
    requiredCount: 1,
    maxCount: 3,
  },
  statement: {
    enabled: true,
    title: "작업 소개",
    description: "작업 소개를 500자 이내로 입력해 주세요.",
    maxLength: 500,
  },
  portfolio: {
    enabled: true,
    title: "포트폴리오",
    description: "PDF 형식의 포트폴리오를 업로드해 주세요.",
    required: true,
  },
  privacy: {
    enabled: true,
    title: "개인정보 수집 및 이용 동의",
    required: true,
  },
};

export const DEFAULT_OPEN_CALL_FORM_FIELDS = {
  birthYear: {
    enabled: true,
    required: true,
    label: "출생연도",
    placeholder: "예: 1994",
  },
  address: {
    enabled: true,
    required: true,
    label: "주소",
    placeholder: "주소를 입력해 주세요.",
  },
  medium: {
    enabled: true,
    required: true,
    label: "매체",
    placeholder: "예: 회화, 사진, 설치, 영상",
  },
  snsLink: {
    enabled: true,
    required: false,
    label: "SNS / 웹사이트",
    placeholder: "인스타그램, 홈페이지, 포트폴리오 링크",
  },
};

export const DEFAULT_OPEN_CALL_FAQS = [
  {
    question: "지원 가능한 작품 분야에 제한이 있나요?",
    answer:
      "회화, 드로잉, 사진, 오브제, 조각, 설치, 공예, 영상 등 매체와 장르는 제한하지 않습니다.",
    isVisible: true,
    order: 1,
  },
  {
    question: "미완성 작업도 지원할 수 있나요?",
    answer:
      "이번 오픈콜은 전시 또는 온라인 공개가 가능한 독립적인 완성작을 대상으로 합니다. 미완성 아이디어나 과정 기록만으로는 지원이 어렵습니다.",
    isVisible: true,
    order: 2,
  },
  {
    question: "포트폴리오는 꼭 제출해야 하나요?",
    answer:
      "기본적으로 PDF 포트폴리오 제출을 권장합니다. 단, 관리자 입력양식 설정에서 포트폴리오 필수 여부가 변경될 수 있습니다.",
    isVisible: true,
    order: 3,
  },
  {
    question: "선정 이후에는 어떤 방식으로 소개되나요?",
    answer:
      "1차 선정 일부 작업은 UNFRAME 공식 홈페이지 온라인 쇼케이스에 공개될 수 있으며, 좋은 반응을 얻은 창작자는 U# 매거진 비대면 인터뷰 대상으로 검토될 수 있습니다.",
    isVisible: true,
    order: 4,
  },
];

export const DEFAULT_OPEN_CALL_COMPLETION_SETTINGS = {
  title: "지원이 완료되었습니다.",
  message: "{{name}} 작가님, {{openCallTitle}} 지원이 접수되었습니다.",
  subMessage:
    "접수 일시: {{submittedAt}}\n입력하신 이메일({{email}})과 연락처({{phone}})로 추가 안내가 전달될 수 있습니다.",
  buttonLabel: "메인으로 돌아가기",
  secondaryButtonLabel: "오픈콜 다시 보기",
};

export const DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS = {
  applicantEmailEnabled: true,
  adminEmailEnabled: true,
  kakaoEnabled: true,
  smsEnabled: false,
  applicantEmailSubject: "[UNFRAME] {{openCallTitle}} 지원이 접수되었습니다.",
  applicantEmailBody:
    "{{name}} 작가님, 안녕하세요.\n{{openCallTitle}} 지원이 정상적으로 접수되었습니다.\n접수 일시: {{submittedAt}}",
  adminEmailSubject: "[UNFRAME JOIN] 새 오픈콜 지원서가 접수되었습니다.",
  adminEmailBody:
    "{{openCallTitle}}에 새 지원서가 접수되었습니다.\n지원자: {{name}}\n이메일: {{email}}\n연락처: {{phone}}\n지원서 ID: {{applicationId}}",
  kakaoMessage: "{{name}} 작가님, {{openCallTitle}} 지원이 정상적으로 접수되었습니다.",
  smsMessage:
    "{{name}} 작가님, {{openCallTitle}} 지원이 접수되었습니다. 접수 ID: {{applicationId}}",
};

const cloneFormSection = (section = {}, fallback = {}) => ({
  ...fallback,
  ...section,
});

const cloneFaq = (faq = {}, fallbackOrder = 999) => ({
  question: typeof faq?.question === "string" ? faq.question : "",
  answer: typeof faq?.answer === "string" ? faq.answer : "",
  isVisible: typeof faq?.isVisible === "boolean" ? faq.isVisible : true,
  order: Number.isFinite(Number(faq?.order)) ? Number(faq.order) : fallbackOrder,
});

const toBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;

export const renderOpenCallTemplate = (template = "", context = {}) => {
  const safeTemplate = String(template || "");
  const replacements = {
    "{{name}}": context?.name ?? "",
    "{{email}}": context?.email ?? "",
    "{{phone}}": context?.phone ?? "",
    "{{openCallTitle}}": context?.openCallTitle ?? "",
    "{{openCallId}}": context?.openCallId ?? "",
    "{{applicationId}}": context?.applicationId ?? "",
    "{{submittedAt}}": context?.submittedAt ?? "",
  };

  return Object.entries(replacements).reduce(
    (acc, [needle, value]) => acc.replaceAll(needle, String(value ?? "")),
    safeTemplate
  );
};

export const normalizeOpenCallFormSettings = (formSettings = {}) => {
  const sections = formSettings?.sections || {};
  const fields = formSettings?.fields || {};

  const normalizedWorks = cloneFormSection(sections.works, DEFAULT_OPEN_CALL_FORM_SECTIONS.works);
  const maxCount = Math.min(3, Math.max(1, toNumber(normalizedWorks.maxCount, 3)));
  const requiredCount = Math.min(
    maxCount,
    Math.max(0, toNumber(normalizedWorks.requiredCount, 1))
  );

  return {
    sections: {
      applicant: cloneFormSection(sections.applicant, DEFAULT_OPEN_CALL_FORM_SECTIONS.applicant),
      works: {
        ...DEFAULT_OPEN_CALL_FORM_SECTIONS.works,
        ...normalizedWorks,
        enabled: toBoolean(normalizedWorks.enabled, true),
        requiredCount,
        maxCount,
      },
      statement: {
        ...DEFAULT_OPEN_CALL_FORM_SECTIONS.statement,
        ...cloneFormSection(sections.statement, DEFAULT_OPEN_CALL_FORM_SECTIONS.statement),
        enabled: toBoolean(sections.statement?.enabled, true),
        maxLength: Math.max(
          0,
          toNumber(sections.statement?.maxLength, DEFAULT_OPEN_CALL_FORM_SECTIONS.statement.maxLength)
        ),
      },
      portfolio: {
        ...DEFAULT_OPEN_CALL_FORM_SECTIONS.portfolio,
        ...cloneFormSection(sections.portfolio, DEFAULT_OPEN_CALL_FORM_SECTIONS.portfolio),
        enabled: toBoolean(sections.portfolio?.enabled, true),
        required: toBoolean(sections.portfolio?.required, true),
      },
      privacy: {
        ...DEFAULT_OPEN_CALL_FORM_SECTIONS.privacy,
        ...cloneFormSection(sections.privacy, DEFAULT_OPEN_CALL_FORM_SECTIONS.privacy),
        enabled: toBoolean(sections.privacy?.enabled, true),
        required: toBoolean(sections.privacy?.required, true),
      },
    },
    fields: {
      birthYear: {
        ...DEFAULT_OPEN_CALL_FORM_FIELDS.birthYear,
        ...cloneFormSection(fields.birthYear, DEFAULT_OPEN_CALL_FORM_FIELDS.birthYear),
        enabled: toBoolean(fields.birthYear?.enabled, true),
        required: toBoolean(fields.birthYear?.required, true),
      },
      address: {
        ...DEFAULT_OPEN_CALL_FORM_FIELDS.address,
        ...cloneFormSection(fields.address, DEFAULT_OPEN_CALL_FORM_FIELDS.address),
        enabled: toBoolean(fields.address?.enabled, true),
        required: toBoolean(fields.address?.required, true),
      },
      medium: {
        ...DEFAULT_OPEN_CALL_FORM_FIELDS.medium,
        ...cloneFormSection(fields.medium, DEFAULT_OPEN_CALL_FORM_FIELDS.medium),
        enabled: toBoolean(fields.medium?.enabled, true),
        required: toBoolean(fields.medium?.required, true),
      },
      snsLink: {
        ...DEFAULT_OPEN_CALL_FORM_FIELDS.snsLink,
        ...cloneFormSection(fields.snsLink, DEFAULT_OPEN_CALL_FORM_FIELDS.snsLink),
        enabled: toBoolean(fields.snsLink?.enabled, true),
        required: toBoolean(fields.snsLink?.required, false),
      },
    },
  };
};

export const normalizeOpenCallFaqs = (faqs = DEFAULT_OPEN_CALL_FAQS) => {
  if (!Array.isArray(faqs)) {
    return DEFAULT_OPEN_CALL_FAQS.map((faq, index) => cloneFaq(faq, index + 1));
  }

  return faqs.map((faq, index) => cloneFaq(faq, index + 1));
};

export const normalizeOpenCallCompletionSettings = (completionSettings = {}) => ({
  ...DEFAULT_OPEN_CALL_COMPLETION_SETTINGS,
  ...completionSettings,
  title: toText(
    completionSettings?.title,
    DEFAULT_OPEN_CALL_COMPLETION_SETTINGS.title
  ),
  message: toText(
    completionSettings?.message,
    DEFAULT_OPEN_CALL_COMPLETION_SETTINGS.message
  ),
  subMessage: toText(
    completionSettings?.subMessage,
    DEFAULT_OPEN_CALL_COMPLETION_SETTINGS.subMessage
  ),
  buttonLabel: toText(
    completionSettings?.buttonLabel,
    DEFAULT_OPEN_CALL_COMPLETION_SETTINGS.buttonLabel
  ),
  secondaryButtonLabel: toText(
    completionSettings?.secondaryButtonLabel,
    DEFAULT_OPEN_CALL_COMPLETION_SETTINGS.secondaryButtonLabel
  ),
});

export const normalizeOpenCallNotificationSettings = (
  notificationSettings = {}
) => ({
  ...DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS,
  ...notificationSettings,
  applicantEmailEnabled: toBoolean(
    notificationSettings?.applicantEmailEnabled,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.applicantEmailEnabled
  ),
  adminEmailEnabled: toBoolean(
    notificationSettings?.adminEmailEnabled,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.adminEmailEnabled
  ),
  kakaoEnabled: toBoolean(
    notificationSettings?.kakaoEnabled,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.kakaoEnabled
  ),
  smsEnabled: toBoolean(
    notificationSettings?.smsEnabled,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.smsEnabled
  ),
  applicantEmailSubject: toText(
    notificationSettings?.applicantEmailSubject,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.applicantEmailSubject
  ),
  applicantEmailBody: toText(
    notificationSettings?.applicantEmailBody,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.applicantEmailBody
  ),
  adminEmailSubject: toText(
    notificationSettings?.adminEmailSubject,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.adminEmailSubject
  ),
  adminEmailBody: toText(
    notificationSettings?.adminEmailBody,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.adminEmailBody
  ),
  kakaoMessage: toText(
    notificationSettings?.kakaoMessage,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.kakaoMessage
  ),
  smsMessage: toText(
    notificationSettings?.smsMessage,
    DEFAULT_OPEN_CALL_NOTIFICATION_SETTINGS.smsMessage
  ),
});

export const OPEN_CALL_FALLBACK = {
  id: OPEN_CALL_ID,
  trackType: "open-call",
  title: OPEN_CALL_TITLE,
  subtitle: OPEN_CALL_SUBTITLE,
  slug: "afterimage",
  edition: "01",
  year: "2026",
  status: "open",
  badgeText: "OPEN",
  themeKeyword: "잔상",
  themeHanja: "殘像",
  heroTitle: "2026 UNFRAME OPEN CALL 01.",
  heroAccent: "잔상",
  introText:
    "설명보다 먼저 마음에 남는 작품이 있습니다. 한 번 보고 나면 쉽게 사라지지 않는 작업, 조용히 다시 떠오르는 작품을 찾습니다.",
  descriptionSections: [
    {
      title: "이런 작품을 찾습니다",
      body: "특정 장르나 어려운 설명보다, 작품 자체의 힘으로 보는 사람의 시선을 붙잡는 창작자를 찾습니다.",
    },
    {
      title: "지원 대상",
      body: "전시 또는 온라인 공개가 가능한 독립적인 완성작을 대상으로 합니다. 미완성 아이디어나 과정 기록은 이번 회차의 대상이 아닙니다.",
    },
    {
      title: "대상 매체",
      body: "회화, 드로잉, 사진, 오브제, 조각, 설치, 공예, 영상 등 매체와 장르는 제한하지 않습니다.",
    },
    {
      title: "선정 이후",
      body: "1차 선정 작가의 일부 작업은 UNFRAME 공식 홈페이지를 통해 온라인 쇼케이스로 공개될 예정이며, 관람객 리뷰는 최종 심사와 아카이빙에 참고됩니다.",
    },
    {
      title: "U# 매거진 인터뷰 검토",
      body: "좋은 반응을 얻은 창작자는 최종 전시 선정 여부와 별개로 U# 매거진 비대면 인터뷰 대상으로 검토됩니다.",
    },
  ],
  mediumText:
    "회화, 드로잉, 사진, 오브제, 조각, 설치, 공예, 영상 등 매체와 장르는 제한하지 않습니다.",
  eligibilityText:
    "이번 공모는 미완성 아이디어나 과정 기록이 아닌, 전시 또는 온라인 공개가 가능한 독립적인 완성작을 대상으로 합니다.",
  benefitText:
    "1차 선정 작가의 일부 작업은 UNFRAME 공식 홈페이지를 통해 온라인 쇼케이스로 공개될 예정입니다.",
  magazineText:
    "좋은 반응을 얻은 창작자는 U# 매거진 비대면 인터뷰 대상으로 검토됩니다.",
  applyButtonText: "잔상 오픈콜 지원하기",
  applicationStartAt: null,
  applicationEndAt: null,
  announcementAt: null,
  isFeatured: true,
  isVisible: true,
  formSettings: normalizeOpenCallFormSettings(),
  faqs: DEFAULT_OPEN_CALL_FAQS,
  completionSettings: normalizeOpenCallCompletionSettings(),
  notificationSettings: normalizeOpenCallNotificationSettings(),
};

export const parseOpenCallDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getOpenCallDisplayStatus = (openCall, now = new Date()) => {
  const current = now instanceof Date ? now : new Date(now);
  const startAt = parseOpenCallDate(openCall?.applicationStartAt);
  const endAt = parseOpenCallDate(openCall?.applicationEndAt);

  if (openCall?.status === "archived") {
    return { key: "archived", label: "아카이브", canApply: false };
  }

  if (openCall?.status === "draft") {
    return { key: "draft", label: "준비 중", canApply: false };
  }

  if (openCall?.status === "closed") {
    return { key: "closed", label: "접수 마감", canApply: false };
  }

  if (startAt && startAt.getTime() > current.getTime()) {
    return { key: "upcoming", label: "접수 예정", canApply: false };
  }

  if (endAt && endAt.getTime() < current.getTime()) {
    return { key: "closed", label: "접수 마감", canApply: false };
  }

  return { key: "open", label: "접수 중", canApply: true };
};

export const createFallbackOpenCall = (overrides = {}) => ({
  ...OPEN_CALL_FALLBACK,
  ...overrides,
  descriptionSections: Array.isArray(overrides.descriptionSections)
    ? overrides.descriptionSections
    : OPEN_CALL_FALLBACK.descriptionSections,
  faqs: normalizeOpenCallFaqs(
    Object.prototype.hasOwnProperty.call(overrides, "faqs")
      ? overrides.faqs
      : OPEN_CALL_FALLBACK.faqs
  ),
  formSettings: normalizeOpenCallFormSettings(
    overrides.formSettings || OPEN_CALL_FALLBACK.formSettings
  ),
  completionSettings: normalizeOpenCallCompletionSettings(
    overrides.completionSettings || OPEN_CALL_FALLBACK.completionSettings
  ),
  notificationSettings: normalizeOpenCallNotificationSettings(
    overrides.notificationSettings || OPEN_CALL_FALLBACK.notificationSettings
  ),
});

export const OPEN_CALL_ID = "2026-unframe-open-call-01-afterimage";
export const OPEN_CALL_TITLE = "2026 UNFRAME OPEN CALL 01. 잔상";
export const OPEN_CALL_SUBTITLE = "UNFRAME OPEN CALL 01 : 잔상(殘像)";

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

const cloneFormSection = (section = {}, fallback = {}) => ({
  ...fallback,
  ...section,
});

const toBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  formSettings: normalizeOpenCallFormSettings(
    overrides.formSettings || OPEN_CALL_FALLBACK.formSettings
  ),
});

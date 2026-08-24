export const SALON_EVENT_COLLECTION = "salonEvents";
export const SALON_APPLICATION_TRACK = "salon";

export const SALON_APPLICATION_STATUSES = [
  { value: "submitted", label: "신청 완료" },
  { value: "approved", label: "승인" },
  { value: "waitlisted", label: "대기" },
  { value: "rejected", label: "미선정" },
  { value: "cancelled", label: "취소" },
];

export const DEFAULT_SALON_PAYMENT_SETTINGS = {
  enabled: true,
  amount: "",
  bankName: "카카오뱅크",
  accountNumber: "3333-36-4153287",
  accountHolder: "언프레임(UNFRAME)",
  depositorGuide: "입금자명은 신청자명과 동일하게 입력해 주세요.",
  note: "입금 확인 후 참가 확정 안내를 보내드립니다.",
};

export const DEFAULT_SALON_EVENT = {
  id: "",
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  posterImageUrl: "",
  status: "draft",
  isVisible: true,
  isFeatured: false,
  applicationStartAt: "",
  applicationEndAt: "",
  eventStartAt: "",
  eventEndAt: "",
  venueName: "",
  venueAddress: "",
  capacity: 0,
  applicationButtonText: "참가 신청",
  formSettings: {
    fields: {
      name: { enabled: true, required: true, label: "이름" },
      phone: { enabled: true, required: true, label: "연락처" },
      email: { enabled: false, required: false, label: "이메일" },
      nickname: { enabled: true, required: false, label: "관심 분야" },
    },
    privacy: {
      enabled: true,
      required: true,
      title: "개인정보 수집 및 이용 동의",
      body: "SALON 참가 신청과 현장 운영을 위해 개인정보를 수집·이용합니다.",
      checkboxLabel: "개인정보 수집 및 이용에 동의합니다.",
    },
    customFields: [],
  },
  links: { programUrl: "", guestbookUrl: "", instagramUrl: "" },
  paymentSettings: DEFAULT_SALON_PAYMENT_SETTINGS,
  checkInSettings: {
    enabled: true,
    checkInStartAt: "",
    checkInEndAt: "",
    qrExpiresAt: "",
    welcomeScreenTitle: "어서 오세요",
    welcomeScreenMessage: "",
  },
  notificationSettings: {
    approvalEnabled: true,
    approvalTemplateId: "",
    approvalMessage: "",
    welcomeEnabled: true,
    welcomeTemplateId: "",
    welcomeMessage: "",
  },
};

const mergeDefined = (defaults, source) => {
  const result = { ...defaults };
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) result[key] = value;
  });
  return result;
};

const mergePaymentSettings = (source) => {
  const merged = mergeDefined(DEFAULT_SALON_PAYMENT_SETTINGS, source);
  ["bankName", "accountNumber", "accountHolder"].forEach((key) => {
    if (typeof merged[key] === "string" && !merged[key].trim()) {
      merged[key] = DEFAULT_SALON_PAYMENT_SETTINGS[key];
    }
  });
  return merged;
};

const normalizeCustomFieldOption = (option, index) => ({
  id: String(option?.id || `option-${index + 1}`).trim() || `option-${index + 1}`,
  label: String(option?.label || option || `선택지 ${index + 1}`).trim(),
});

const normalizeSalonCustomFields = (customFields) =>
  (Array.isArray(customFields) ? customFields : []).slice(0, 40).map((field, index) => {
    const type = String(field?.type || "text");
    const options = Array.isArray(field?.options)
      ? field.options.map(normalizeCustomFieldOption).filter((option) => option.label)
      : [];
    return {
      id: String(field?.id || `custom-${index + 1}`).trim() || `custom-${index + 1}`,
      label: String(field?.label || "추가 질문").trim(),
      description: String(field?.description || "").trim(),
      type,
      layout: field?.layout === "full" ? "full" : "half",
      required: Boolean(field?.required),
      ...(options.length ? { options } : {}),
    };
  });

export const normalizeSalonEvent = (source = {}) => {
  const base = mergeDefined(DEFAULT_SALON_EVENT, source);
  const sourceForm = source.formSettings || {};
  const sourceFields = sourceForm.fields || {};
  return {
    ...base,
    formSettings: {
      ...DEFAULT_SALON_EVENT.formSettings,
      ...sourceForm,
      fields: Object.fromEntries(
        Object.entries(DEFAULT_SALON_EVENT.formSettings.fields).map(([key, value]) => [
          key,
          mergeDefined(value, sourceFields[key]),
        ])
      ),
      privacy: mergeDefined(DEFAULT_SALON_EVENT.formSettings.privacy, sourceForm.privacy),
      customFields: normalizeSalonCustomFields(sourceForm.customFields),
    },
    links: mergeDefined(DEFAULT_SALON_EVENT.links, source.links),
    paymentSettings: mergePaymentSettings(source.paymentSettings),
    checkInSettings: mergeDefined(DEFAULT_SALON_EVENT.checkInSettings, source.checkInSettings),
    notificationSettings: mergeDefined(
      DEFAULT_SALON_EVENT.notificationSettings,
      source.notificationSettings
    ),
  };
};

export const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDateTimeLocalValue = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const formatSalonDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "일정 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getSalonAvailability = (event, now = new Date()) => {
  const normalized = normalizeSalonEvent(event);
  if (normalized.status !== "open" || normalized.isVisible === false) {
    return { available: false, reason: "현재 신청을 받고 있지 않습니다." };
  }
  const starts = toDate(normalized.applicationStartAt);
  const ends = toDate(normalized.applicationEndAt);
  if (starts && now < starts) return { available: false, reason: "아직 신청 기간이 아닙니다." };
  if (ends && now > ends) return { available: false, reason: "신청 기간이 종료되었습니다." };
  return { available: true, reason: "" };
};

export const isSalonApplicationApproved = (application) =>
  application?.trackType === SALON_APPLICATION_TRACK && application?.status === "approved";

export const isSalonCheckedIn = (application) => Boolean(application?.checkedInAt);

export const canIssueSalonQr = (application) => isSalonApplicationApproved(application);

export const canSendSalonWelcome = (application) =>
  isSalonCheckedIn(application) && !application?.welcomeNotificationSentAt;

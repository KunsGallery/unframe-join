export const JOIN_POPUP_COLLECTION = "joinPopups";
export const JOIN_POPUP_DISMISS_PREFIX = "unframe-join-popup-dismissed-";

export const DEFAULT_JOIN_POPUPS = [];

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeString = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const normalizeNumber = (value, fallback = 999) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseJoinPopupDate = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]) - 1;
      const day = Number(dateOnly[3]);
      const date = new Date(year, month, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getPopupVisibilityStatus = (popup = {}, now = new Date()) => {
  const current = now instanceof Date ? now : new Date(now);
  const rawStartAt = normalizeString(popup?.startAt || "");
  const rawEndAt = normalizeString(popup?.endAt || "");

  if (!popup) {
    return {
      canShow: false,
      reason: "팝업 데이터가 없습니다.",
      rawStartAt,
      rawEndAt,
      startAt: null,
      endAt: null,
      hasDateFormatIssue: false,
    };
  }

  if (popup.enabled !== true) {
    return {
      canShow: false,
      reason: "enabled가 true가 아닙니다.",
      rawStartAt,
      rawEndAt,
      startAt: null,
      endAt: null,
      hasDateFormatIssue: false,
    };
  }

  const startAt = rawStartAt ? parseJoinPopupDate(rawStartAt) : null;
  const endAt = rawEndAt ? parseJoinPopupDate(rawEndAt) : null;

  if (rawStartAt && !startAt) {
    return {
      canShow: false,
      reason: `startAt 날짜 형식이 올바르지 않습니다: ${rawStartAt}`,
      rawStartAt,
      rawEndAt,
      startAt: null,
      endAt,
      hasDateFormatIssue: true,
    };
  }

  if (rawEndAt && !endAt) {
    return {
      canShow: false,
      reason: `endAt 날짜 형식이 올바르지 않습니다: ${rawEndAt}`,
      rawStartAt,
      rawEndAt,
      startAt,
      endAt: null,
      hasDateFormatIssue: true,
    };
  }

  if (startAt && current.getTime() < startAt.getTime()) {
    return {
      canShow: false,
      reason: `아직 노출 시작 전입니다. startAt: ${rawStartAt}`,
      rawStartAt,
      rawEndAt,
      startAt,
      endAt,
      hasDateFormatIssue: false,
    };
  }

  let effectiveEndAt = endAt;
  if (effectiveEndAt && DATE_ONLY_PATTERN.test(rawEndAt)) {
    effectiveEndAt = new Date(effectiveEndAt);
    effectiveEndAt.setHours(23, 59, 59, 999);
  }

  if (effectiveEndAt && current.getTime() > effectiveEndAt.getTime()) {
    return {
      canShow: false,
      reason: `노출 종료일이 지났습니다. endAt: ${rawEndAt}`,
      rawStartAt,
      rawEndAt,
      startAt,
      endAt: effectiveEndAt,
      hasDateFormatIssue: false,
    };
  }

  return {
    canShow: true,
    reason: "현재 JoinHome 노출 조건을 만족합니다.",
    rawStartAt,
    rawEndAt,
    startAt,
    endAt: effectiveEndAt,
    hasDateFormatIssue: false,
  };
};

export const isPopupDismissed = (popupId) => {
  if (typeof window === "undefined" || !popupId) return false;

  try {
    return !!window.localStorage.getItem(`${JOIN_POPUP_DISMISS_PREFIX}${popupId}`);
  } catch {
    return false;
  }
};

export const normalizeJoinPopup = (popup = {}) => {
  const targetTrack = ["rental", "open-call", "salon", "collaboration"].includes(
    popup?.targetTrack
  )
    ? popup.targetTrack
    : "open-call";

  return {
    id: normalizeString(popup.id || ""),
    title: normalizeString(popup.title || ""),
    subtitle: normalizeString(popup.subtitle || ""),
    body: normalizeString(popup.body || ""),
    posterImageUrl: normalizeString(popup.posterImageUrl || ""),
    enabled: normalizeBoolean(popup.enabled, false),
    priority: normalizeNumber(popup.priority, 999),
    targetTrack,
    ctaLabel: normalizeString(popup.ctaLabel || "신청하러 가기"),
    dismissLabel: normalizeString(popup.dismissLabel || "닫기"),
    startAt: normalizeString(popup.startAt || ""),
    endAt: normalizeString(popup.endAt || ""),
  };
};

export const sortJoinPopups = (popups = []) =>
  [...(Array.isArray(popups) ? popups : [])]
    .map((popup) => normalizeJoinPopup(popup))
    .sort((a, b) => {
      const priorityDiff = normalizeNumber(a.priority) - normalizeNumber(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title, "ko");
    });

export const isJoinPopupWithinRange = (popup, now = new Date()) => {
  return getPopupVisibilityStatus(popup, now).canShow;
};

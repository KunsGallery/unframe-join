export const JOIN_POPUP_COLLECTION = "joinPopups";

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

export const getJoinPopupWindowStatus = (popup = {}, now = new Date()) => {
  const current = now instanceof Date ? now : new Date(now);
  const startRaw = normalizeString(popup?.startAt || "");
  const endRaw = normalizeString(popup?.endAt || "");

  const startAt = startRaw ? parseJoinPopupDate(startRaw) : null;
  const endAt = endRaw ? parseJoinPopupDate(endRaw) : null;
  const startAtInvalid = !!startRaw && !startAt;
  const endAtInvalid = !!endRaw && !endAt;

  let effectiveEndAt = endAt;
  if (effectiveEndAt && DATE_ONLY_PATTERN.test(endRaw)) {
    effectiveEndAt = new Date(effectiveEndAt);
    effectiveEndAt.setHours(23, 59, 59, 999);
  }

  const withinRange =
    !startAtInvalid &&
    !endAtInvalid &&
    (!startAt || startAt.getTime() <= current.getTime()) &&
    (!effectiveEndAt || effectiveEndAt.getTime() >= current.getTime());

  return {
    current,
    startRaw,
    endRaw,
    startAt,
    endAt: effectiveEndAt,
    startAtInvalid,
    endAtInvalid,
    hasDateFormatIssue: startAtInvalid || endAtInvalid,
    withinRange,
    statusLabel: startAtInvalid || endAtInvalid ? "날짜 형식 확인 필요" : withinRange ? "YES" : "NO",
  };
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
  return getJoinPopupWindowStatus(popup, now).withinRange;
};

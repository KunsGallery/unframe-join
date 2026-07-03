export const JOIN_TRACK_COLLECTION = "joinTracks";

export const DEFAULT_JOIN_TRACKS = [
  {
    id: "rental",
    routeTrack: "rental",
    order: 1,
    enabled: true,
    entryStatus: "active",
    preparingTitle: "준비 중입니다.",
    preparingMessage: "현재 해당 접수는 준비 중입니다.",
    preparingConfirmLabel: "확인",
    title: "공간 대관 / 파트너십 신청",
    eyebrow: "Open Now",
    description: "전시, 팝업, 브랜드 협업,\n공간 활용 제안",
    ctaLabel: "신청 시작하기",
    statusLabel: "신청하기",
    shortLabel: "SPACE",
    badgeText: "OPEN",
    accentColor: "#004AAD",
    backgroundImageUrl: "",
  },
  {
    id: "open-call",
    routeTrack: "open-call",
    order: 2,
    enabled: true,
    entryStatus: "active",
    preparingTitle: "준비 중입니다.",
    preparingMessage: "현재 해당 접수는 준비 중입니다.",
    preparingConfirmLabel: "확인",
    title: "공개 모집 / 오픈콜 지원",
    eyebrow: "Open Call",
    description: "언프레임이 기획하는 전시와\n프로젝트에 지원",
    ctaLabel: "공개모집 보기",
    statusLabel: "공모보기",
    shortLabel: "OPEN CALL",
    badgeText: "OPEN",
    accentColor: "#AAD004",
    backgroundImageUrl: "",
  },
  {
    id: "salon",
    routeTrack: "salon",
    order: 3,
    enabled: true,
    entryStatus: "active",
    preparingTitle: "준비 중입니다.",
    preparingMessage: "현재 해당 접수는 준비 중입니다.",
    preparingConfirmLabel: "확인",
    title: "프로그램 / 살롱 참여",
    eyebrow: "Preparing",
    description: "모임, 워크숍, 토크, 네트워킹\n프로그램 참여",
    ctaLabel: "준비 중",
    statusLabel: "PREPARING",
    shortLabel: "SALON",
    badgeText: "Preparing",
    accentColor: "#1F1F1F",
    backgroundImageUrl: "",
  },
  {
    id: "collaboration",
    routeTrack: "collaboration",
    order: 4,
    enabled: true,
    entryStatus: "preparing",
    preparingTitle: "준비 중입니다.",
    preparingMessage: "현재 협업 제안 접수는 준비 중입니다.",
    preparingConfirmLabel: "확인",
    title: "기타 협업 제안",
    eyebrow: "Preparing",
    description: "브랜드, 매체, 플랫폼,\n콘텐츠 협업",
    ctaLabel: "준비 중",
    statusLabel: "PREPARING",
    shortLabel: "COLLAB",
    badgeText: "Preparing",
    accentColor: "#6B7280",
    backgroundImageUrl: "",
  },
];

const DEFAULT_JOIN_TRACK_MAP = DEFAULT_JOIN_TRACKS.reduce((acc, track) => {
  acc[track.id] = track;
  return acc;
}, {});

const normalizeString = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeOrder = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEnabled = (value, fallback = true) =>
  typeof value === "boolean" ? value : fallback;

export const JOIN_TRACK_ENTRY_STATUSES = ["active", "preparing", "hidden"];

const normalizeEntryStatus = (value, enabled) =>
  JOIN_TRACK_ENTRY_STATUSES.includes(value)
    ? value
    : enabled === false
    ? "hidden"
    : "active";

const normalizeColor = (value, fallback = "#004AAD") => {
  const color = normalizeString(value, fallback);
  return color || fallback;
};

export const hasOwnField = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

export const getSavedTextValue = (object, key) => {
  if (!hasOwnField(object, key)) return "";

  const value = object[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
};

export const getPreviewTextValue = (object, key, fallback = "") => {
  if (hasOwnField(object, key)) {
    const value = object[key];
    if (typeof value === "string") return value.trim();
    if (value == null) return "";
    return String(value).trim();
  }

  return fallback;
};

export const normalizeJoinTrack = (track = {}) => {
  const base = DEFAULT_JOIN_TRACK_MAP[track.id] || {};
  const enabled = normalizeEnabled(track.enabled, base.enabled !== false);
  const entryStatus = normalizeEntryStatus(track.entryStatus, enabled);

  return {
    id: normalizeString(track.id || base.id),
    routeTrack: normalizeString(track.routeTrack || base.routeTrack || track.id || base.id),
    order: normalizeOrder(track.order, base.order || 0),
    enabled: entryStatus !== "hidden",
    entryStatus,
    preparingTitle: normalizeString(
      track.preparingTitle || base.preparingTitle,
      "준비 중입니다."
    ),
    preparingMessage: normalizeString(
      track.preparingMessage || base.preparingMessage,
      "현재 해당 접수는 준비 중입니다."
    ),
    preparingConfirmLabel: normalizeString(
      track.preparingConfirmLabel || base.preparingConfirmLabel,
      "확인"
    ),
    title: normalizeString(track.title ?? base.title),
    eyebrow: normalizeString(track.eyebrow ?? base.eyebrow),
    description: normalizeString(track.description ?? base.description),
    ctaLabel: normalizeString(track.ctaLabel ?? base.ctaLabel),
    statusLabel: normalizeString(
      track.statusLabel ?? track.badgeText ?? base.statusLabel ?? base.badgeText
    ),
    shortLabel: normalizeString(track.shortLabel ?? base.shortLabel),
    badgeText: normalizeString(track.badgeText ?? base.badgeText),
    accentColor: normalizeColor(track.accentColor || base.accentColor),
    backgroundImageUrl: normalizeString(track.backgroundImageUrl || base.backgroundImageUrl),
  };
};

export const mergeJoinTracks = (tracks = []) => {
  const incoming = Array.isArray(tracks) ? tracks : [];
  const byId = new Map(
    incoming
      .filter((track) => track && (track.id || track.routeTrack))
      .map((track) => [track.id || track.routeTrack, normalizeJoinTrack(track)])
  );

  const mergedDefaults = DEFAULT_JOIN_TRACKS.map((track) =>
    normalizeJoinTrack({
      ...track,
      ...(byId.get(track.id) || {}),
    })
  );

  const extras = incoming
    .filter((track) => {
      const key = track?.id || track?.routeTrack;
      return key && !DEFAULT_JOIN_TRACK_MAP[key];
    })
    .map((track, index) =>
      normalizeJoinTrack({
        ...track,
        id: track.id || track.routeTrack || `track-${index + 1}`,
      })
    );

  return [...mergedDefaults, ...extras].sort((a, b) => {
    const orderDiff = normalizeOrder(a.order) - normalizeOrder(b.order);
    if (orderDiff !== 0) return orderDiff;
    return a.title.localeCompare(b.title, "ko");
  });
};

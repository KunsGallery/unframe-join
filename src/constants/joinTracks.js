export const JOIN_TRACK_COLLECTION = "joinTracks";

export const DEFAULT_JOIN_TRACKS = [
  {
    id: "rental",
    routeTrack: "rental",
    order: 1,
    enabled: true,
    title: "공간 대관 / 파트너십 신청",
    eyebrow: "Open Now",
    description: "전시, 팝업, 브랜드 협업, 공간 활용 제안",
    badgeText: "OPEN",
    accentColor: "#004AAD",
    backgroundImageUrl: "",
  },
  {
    id: "open-call",
    routeTrack: "open-call",
    order: 2,
    enabled: true,
    title: "공개 모집 / 오픈콜 지원",
    eyebrow: "Open Call",
    description: "언프레임이 기획하는 전시와 프로젝트에 지원",
    badgeText: "OPEN",
    accentColor: "#AAD004",
    backgroundImageUrl: "",
  },
  {
    id: "salon",
    routeTrack: "salon",
    order: 3,
    enabled: true,
    title: "프로그램 / 살롱 참여",
    eyebrow: "Preparing",
    description: "모임, 워크숍, 토크, 네트워킹 프로그램 참여",
    badgeText: "Preparing",
    accentColor: "#1F1F1F",
    backgroundImageUrl: "",
  },
  {
    id: "collaboration",
    routeTrack: "collaboration",
    order: 4,
    enabled: true,
    title: "기타 협업 제안",
    eyebrow: "Preparing",
    description: "브랜드, 매체, 플랫폼, 콘텐츠 협업",
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

const normalizeColor = (value, fallback = "#004AAD") => {
  const color = normalizeString(value, fallback);
  return color || fallback;
};

export const normalizeJoinTrack = (track = {}) => {
  const base = DEFAULT_JOIN_TRACK_MAP[track.id] || {};

  return {
    id: normalizeString(track.id || base.id),
    routeTrack: normalizeString(track.routeTrack || base.routeTrack || track.id || base.id),
    order: normalizeOrder(track.order, base.order || 0),
    enabled: normalizeEnabled(track.enabled, base.enabled !== false),
    title: normalizeString(track.title || base.title),
    eyebrow: normalizeString(track.eyebrow || base.eyebrow),
    description: normalizeString(track.description || base.description),
    badgeText: normalizeString(track.badgeText || base.badgeText),
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


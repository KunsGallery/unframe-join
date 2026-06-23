export const DEFAULT_JOIN_HOME_CONTENT = {
  heroBadgeText: "UNFRAME JOIN",
  heroTitle: "하나의 방식으로만\n연결되지 않습니다.",
  heroDescription:
    "공간을 제안할 수도, 전시에 지원할 수도, 프로그램에 참여할 수도 있습니다.\n각 트랙은 열리는 방식이 다르고, 그 입구를 선택하는 순간부터 여정이 시작됩니다.",
  heroPrimaryChip: "입구 선택",
  heroSecondaryChip: "LIVE TRACKS",
  brandNoteEnabled: true,
  brandNoteLabel: "BRAND NOTE",
  brandNoteTitle: "UNFRAME과 연결되는 방식",
  brandNoteLiveLabel: "LIVE",
  brandNoteLeftLabel: "NOW OPEN",
  brandNoteLeftText: "현재 신청 가능한 항목을 한눈에 볼 수 있습니다.",
  brandNoteRightLabel: "FEATURED",
  brandNoteRightText: "대표 공고의 주요 내용을 아래에서 먼저 확인하세요.",
  waysToJoinEnabled: true,
  waysToJoinEyebrow: "WAYS TO JOIN",
  waysToJoinTitle: "필요한 방식에 맞는 입구를 선택해 주세요.",
  waysToJoinDescription: "",
  activeTrackCountEnabled: true,
  activeTrackCountLabelTemplate: "활성 트랙 {{count}}개",
  trackMetaNote: "",
  currentProgramLabel: "CURRENT PROGRAM",
  preparedProgramLabel: "PREPARING",
  featuredProgramLabel: "FEATURED",
  featuredProjectsLabel: "FEATURED PROJECTS",
  auxiliaryEntryPointsLabel: "AUXILIARY ENTRY POINTS",
  auxiliaryEntryPointsSubLabel: "MORE THAN FOUR TRACKS",
  footerNoteEnabled: false,
  footerNoteText: "",
};

const normalizeString = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export const normalizeJoinHomeContent = (content = {}) => {
  const source = content || {};

  return {
    heroBadgeText: normalizeString(
      source.heroBadgeText,
      DEFAULT_JOIN_HOME_CONTENT.heroBadgeText
    ),
    heroTitle: normalizeString(source.heroTitle, DEFAULT_JOIN_HOME_CONTENT.heroTitle),
    heroDescription: normalizeString(
      source.heroDescription,
      DEFAULT_JOIN_HOME_CONTENT.heroDescription
    ),
    heroPrimaryChip: normalizeString(
      source.heroPrimaryChip,
      DEFAULT_JOIN_HOME_CONTENT.heroPrimaryChip
    ),
    heroSecondaryChip: normalizeString(
      source.heroSecondaryChip,
      DEFAULT_JOIN_HOME_CONTENT.heroSecondaryChip
    ),
    brandNoteEnabled: normalizeBoolean(
      source.brandNoteEnabled,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteEnabled
    ),
    brandNoteLabel: normalizeString(
      source.brandNoteLabel,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteLabel
    ),
    brandNoteTitle: normalizeString(
      source.brandNoteTitle,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteTitle
    ),
    brandNoteLiveLabel: normalizeString(
      source.brandNoteLiveLabel,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteLiveLabel
    ),
    brandNoteLeftLabel: normalizeString(
      source.brandNoteLeftLabel ?? source.entryCardLabel,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteLeftLabel
    ),
    brandNoteLeftText: normalizeString(
      source.brandNoteLeftText ?? source.entryCardText,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteLeftText
    ),
    brandNoteRightLabel: normalizeString(
      source.brandNoteRightLabel ?? source.noticeCardLabel,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteRightLabel
    ),
    brandNoteRightText: normalizeString(
      source.brandNoteRightText ?? source.noticeCardText,
      DEFAULT_JOIN_HOME_CONTENT.brandNoteRightText
    ),
    waysToJoinEnabled: normalizeBoolean(
      source.waysToJoinEnabled,
      DEFAULT_JOIN_HOME_CONTENT.waysToJoinEnabled
    ),
    waysToJoinEyebrow: normalizeString(
      source.waysToJoinEyebrow,
      DEFAULT_JOIN_HOME_CONTENT.waysToJoinEyebrow
    ),
    waysToJoinTitle: normalizeString(
      source.waysToJoinTitle,
      DEFAULT_JOIN_HOME_CONTENT.waysToJoinTitle
    ),
    waysToJoinDescription: normalizeString(
      source.waysToJoinDescription,
      DEFAULT_JOIN_HOME_CONTENT.waysToJoinDescription
    ),
    activeTrackCountEnabled: normalizeBoolean(
      source.activeTrackCountEnabled,
      DEFAULT_JOIN_HOME_CONTENT.activeTrackCountEnabled
    ),
    activeTrackCountLabelTemplate: normalizeString(
      source.activeTrackCountLabelTemplate,
      DEFAULT_JOIN_HOME_CONTENT.activeTrackCountLabelTemplate
    ),
    trackMetaNote: normalizeString(
      source.trackMetaNote,
      DEFAULT_JOIN_HOME_CONTENT.trackMetaNote
    ),
    currentProgramLabel: normalizeString(
      source.currentProgramLabel,
      DEFAULT_JOIN_HOME_CONTENT.currentProgramLabel
    ),
    preparedProgramLabel: normalizeString(
      source.preparedProgramLabel,
      DEFAULT_JOIN_HOME_CONTENT.preparedProgramLabel
    ),
    featuredProgramLabel: normalizeString(
      source.featuredProgramLabel,
      DEFAULT_JOIN_HOME_CONTENT.featuredProgramLabel
    ),
    featuredProjectsLabel: normalizeString(
      source.featuredProjectsLabel,
      DEFAULT_JOIN_HOME_CONTENT.featuredProjectsLabel
    ),
    auxiliaryEntryPointsLabel: normalizeString(
      source.auxiliaryEntryPointsLabel,
      DEFAULT_JOIN_HOME_CONTENT.auxiliaryEntryPointsLabel
    ),
    auxiliaryEntryPointsSubLabel: normalizeString(
      source.auxiliaryEntryPointsSubLabel,
      DEFAULT_JOIN_HOME_CONTENT.auxiliaryEntryPointsSubLabel
    ),
    footerNoteEnabled: normalizeBoolean(
      source.footerNoteEnabled,
      DEFAULT_JOIN_HOME_CONTENT.footerNoteEnabled
    ),
    footerNoteText: normalizeString(
      source.footerNoteText,
      DEFAULT_JOIN_HOME_CONTENT.footerNoteText
    ),
  };
};

export const mergeJoinHomeContent = (content = {}) =>
  normalizeJoinHomeContent(content);

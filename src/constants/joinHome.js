export const DEFAULT_JOIN_HOME_CONTENT = {
  heroBadgeText: "UNFRAME JOIN",
  heroTitle: "하나의 방식으로만\n연결되지 않습니다.",
  heroDescription:
    "공간을 제안할 수도, 전시에 지원할 수도, 프로그램에 참여할 수도 있습니다.\n각 트랙은 열리는 방식이 다르고, 그 입구를 선택하는 순간부터 여정이 시작됩니다.",
  heroPrimaryChip: "입구 선택",
  heroSecondaryChip: "LIVE TRACKS",
  brandNoteLabel: "BRAND NOTE",
  brandNoteTitle: "UNFRAME의 입구는 하나가 아닙니다.",
  brandNoteLiveLabel: "LIVE",
  entryCardLabel: "ENTRY",
  entryCardText: "신청 트랙은 살아 있고,\n필요한 입구만 선택하면 됩니다.",
  noticeCardLabel: "NOTICE",
  noticeCardText:
    "현재 노출 중인 공지와 대표 프로젝트는\n아래 영역에서 이어집니다.",
};

export const mergeJoinHomeContent = (content = {}) => ({
  ...DEFAULT_JOIN_HOME_CONTENT,
  ...(content || {}),
});

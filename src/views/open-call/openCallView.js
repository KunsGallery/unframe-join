import {
  DEFAULT_OPEN_CALL_ACCENT,
  DEFAULT_OPEN_CALL_FAQS,
  OPEN_CALL_FALLBACK,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  getOpenCallDescriptionSections,
  normalizeOpenCallFaqs,
  parseOpenCallDate,
} from "../../constants/openCall.js";

const HEADING_EMOJI = /^\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*\s*/u;

// Admins write requirements as blank-line separated blocks with an emoji heading line.
export const splitIntroText = (text) => {
  const lead = [];
  const details = [];

  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => {
      const [firstLine, ...rest] = block.split("\n");
      if (HEADING_EMOJI.test(firstLine) && rest.length > 0) {
        details.push({ title: firstLine.replace(HEADING_EMOJI, "").trim(), body: rest.join("\n").trim() });
      } else if (details.length > 0) {
        details[details.length - 1].body += `\n\n${block}`;
      } else {
        lead.push(block);
      }
    });

  return { lead: lead.join("\n\n"), details };
};

const INK = "#151413";
const PAPER = "#F6F4EE";
const WHITE = "#FFFFFF";

const hexToRgb = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const getContrastRatio = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

// accentText only colours large numerals, where 3:1 is the readable threshold.
const darkenUntilReadable = (hex) => {
  let channels = hexToRgb(hex);
  const toHex = (values) => `#${values.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  while (getContrastRatio(toHex(channels), WHITE) < 3) channels = channels.map((value) => value * 0.92);
  return toHex(channels);
};

// Admins pick one colour; everything drawn with it stays readable whichever colour they pick.
export const getOpenCallTheme = (color) => {
  const accent = /^#[0-9a-f]{6}$/i.test(String(color ?? "").trim())
    ? String(color).trim().toUpperCase()
    : DEFAULT_OPEN_CALL_ACCENT;
  const paper = hexToRgb(PAPER);
  const tint = hexToRgb(accent)
    .map((value, index) => Math.round(value * 0.2 + paper[index] * 0.8).toString(16).padStart(2, "0"))
    .join("");

  return {
    accent,
    accentText: darkenUntilReadable(accent),
    on: getContrastRatio(accent, WHITE) >= getContrastRatio(accent, INK) ? WHITE : INK,
    tint: `#${tint.toUpperCase()}`,
  };
};

// Korean characters are about twice as wide as Latin ones, which sets how large a theme word can go.
export const getThemeWordWeight = (word) =>
  Math.max(2, [...String(word ?? "")].reduce((sum, char) => sum + (char === " " ? 0.4 : char.charCodeAt(0) < 128 ? 0.62 : 1), 0));

export const parseThemeKeywords = (value) =>
  String(value ?? "").split(",").map((word) => word.trim()).filter(Boolean);

// Keywords appear one at a time, so only the longest one has to fit.
export const getKeywordsWeight = (keywords) => Math.max(2, ...keywords.map(getThemeWordWeight));

// An intro only holds requirement blocks on calls written before requirement rows existed.
const getIntroLead = (openCall) => {
  const hasRows = (Array.isArray(openCall?.requirementItems) ? openCall.requirementItems : []).some(
    (item) => String(item?.title ?? "").trim() || String(item?.body ?? "").trim()
  );
  return hasRows ? String(openCall?.introText ?? "").trim() : splitIntroText(openCall?.introText).lead;
};

const TITLE_WEIGHT = 3;
const SUGGESTED_KEYWORDS = 5;
const ENGLISH_TO_KOREAN = {
  christmas: "크리스마스", spring: "봄", summer: "여름", autumn: "가을", winter: "겨울", memory: "기억", memories: "기억",
  light: "빛", love: "사랑", dream: "꿈", dreams: "꿈", home: "집", city: "도시", forest: "숲", gift: "선물", gifts: "선물",
};
const ENGLISH_STOPWORDS = new Set(["unframe", "open", "call", "calls", "want", "with", "from", "that", "this", "your", "edition", "exhibition", "artist", "artists", "project", "gallery"]);
const KOREAN_STOPWORDS = new Set([
  "작품", "작가", "전시", "예술", "미술", "모집", "참여", "단체전", "기획전", "오픈콜", "공모", "지원", "지원서", "선정", "신청", "접수", "소개", "장르",
  "이번", "올해", "내년", "당신", "우리", "여러분", "누군가", "사람", "공간", "마지막", "시간", "순간", "경험", "하나", "다양", "소중", "특별", "작은", "소형",
  "직접", "함께", "만들어가", "설명", "먼저", "자기", "머무", "고르", "오래", "오래도록", "가까이", "조금", "그리고", "하지만", "대한", "위한", "통해", "모든", "있는", "없는", "같은", "많은",
]);
const KOREAN_VERB_SUFFIX = /(합니다|하는|하며|하고|하여|하기|한다|하다)$/;
const KOREAN_PARTICLE = /(으로부터|에게서|만의|부터|까지|에서|에게|으로|처럼|보다|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)$/;
const NOT_A_NOUN = /(니다|다면|고자|는다|고|며|어|아|여|게)$/;

const toKoreanKeyword = (token) => {
  const word = token.replace(KOREAN_VERB_SUFFIX, "");
  const noun = word === token ? token.replace(KOREAN_PARTICLE, "") : word;
  if (noun.length < 2 || NOT_A_NOUN.test(token) || KOREAN_STOPWORDS.has(noun)) return "";
  return noun;
};

const toEnglishKeyword = (token) => {
  const lower = token.toLowerCase();
  if (Object.hasOwn(ENGLISH_TO_KOREAN, lower)) return ENGLISH_TO_KOREAN[lower];
  return token.length >= 4 && !ENGLISH_STOPWORDS.has(lower) ? token : "";
};

// Picks the words a call talks about most, with its title and subtitle counting for more.
export const suggestThemeKeywords = (openCall) => {
  const scores = new Map();
  const count = (text, weight) => {
    for (const token of String(text ?? "").match(/[가-힣]{2,}|[A-Za-z]{2,}/g) || []) {
      const keyword = /[가-힣]/.test(token) ? toKoreanKeyword(token) : toEnglishKeyword(token);
      if (keyword) scores.set(keyword, (scores.get(keyword) || 0) + weight);
    }
  };

  count(openCall?.title, TITLE_WEIGHT);
  count(openCall?.subtitle, TITLE_WEIGHT);
  count(getIntroLead(openCall), 1);

  // Map keeps first-seen order, so equal scores stay in the order the text uses them.
  return [...scores.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, SUGGESTED_KEYWORDS)
    .map(([keyword]) => keyword);
};

export const resolveThemeKeywords = (openCall) => {
  const written = parseThemeKeywords(openCall?.themeKeyword);
  if (written.length > 0) return written;
  const suggested = suggestThemeKeywords(openCall);
  return suggested.length > 0 ? suggested : ["OPEN"];
};

// Calls written before requirement rows existed keep their emoji-headed intro blocks.
export const getOpenCallRequirements = (openCall) => {
  const rows = (Array.isArray(openCall?.requirementItems) ? openCall.requirementItems : [])
    .map((item) => ({ title: String(item?.title ?? "").trim(), body: String(item?.body ?? "").trim() }))
    .filter((item) => item.title || item.body);
  return rows.length > 0 ? rows : splitIntroText(openCall?.introText).details;
};

const formatDate = (value) => {
  const date = parseOpenCallDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(date);
};

const STATUS_LABELS = {
  draft: "준비 중",
  upcoming: "접수 예정",
  open: "접수 중",
  closed: "접수 마감",
  archived: "아카이브",
};

const STATUS_HELP_TEXTS = {
  draft: "공고 내용을 준비하고 있습니다.",
  upcoming: "접수 시작 전입니다.",
  open: "현재 지원서를 접수하고 있습니다.",
  closed: "이번 오픈콜 접수가 마감되었습니다.",
  archived: "지난 공고입니다.",
};

const STATUS_DISABLED_BUTTON_TEXTS = {
  upcoming: "접수 예정입니다",
  closed: "모집이 마감되었습니다",
  draft: "공고 준비 중입니다",
  archived: "아카이브된 공고입니다",
};

export const buildOpenCallView = (source) => {
  const openCall = createFallbackOpenCall(source || OPEN_CALL_FALLBACK);
  const displayStatus = getOpenCallDisplayStatus(openCall);
  const labels = openCall.landingLabels || OPEN_CALL_FALLBACK.landingLabels;
  const faqSource = Array.isArray(openCall?.faqs) ? openCall.faqs : DEFAULT_OPEN_CALL_FAQS;

  return {
    openCall,
    theme: getOpenCallTheme(openCall.accentColor),
    posterUrl: String(openCall.posterUrl ?? "").trim(),
    lead: getIntroLead(openCall),
    requirements: getOpenCallRequirements(openCall),
    sections: getOpenCallDescriptionSections(source || OPEN_CALL_FALLBACK),
    faqs: normalizeOpenCallFaqs(faqSource)
      .filter((faq) => faq?.isVisible !== false && faq?.question?.trim() && faq?.answer?.trim())
      .sort((a, b) => (a.order || 999) - (b.order || 999)),
    statusLabel: STATUS_LABELS[displayStatus.key] || displayStatus.label,
    // A stored notice is written for the open period, so it only applies while applications are open.
    statusHelpText:
      displayStatus.key === "open"
        ? openCall.statusNoticeText || STATUS_HELP_TEXTS.open
        : STATUS_HELP_TEXTS[displayStatus.key] || "",
    dateEntries: [
      ["접수 시작", openCall.applicationStartAt],
      ["접수 마감", openCall.applicationEndAt],
      ["결과 발표", openCall.announcementAt],
    ]
      .map(([label, value]) => [label, formatDate(value)])
      .filter(([, value]) => value),
    canApply: displayStatus.canApply && openCall.isVisible !== false,
    applyLabel: openCall.applyButtonText?.trim() || "지원하기",
    disabledLabel: STATUS_DISABLED_BUTTON_TEXTS[displayStatus.key] || displayStatus.label,
    faqTitle: labels.faqTitle || OPEN_CALL_FALLBACK.landingLabels.faqTitle,
    faqDescription: labels.faqDescription ?? OPEN_CALL_FALLBACK.landingLabels.faqDescription,
  };
};

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
    on: getContrastRatio(accent, WHITE) >= getContrastRatio(accent, INK) ? WHITE : INK,
    tint: `#${tint.toUpperCase()}`,
  };
};

// Korean characters are about twice as wide as Latin ones, which sets how large a theme word can go.
export const getThemeWordWeight = (word) =>
  Math.max(2, [...String(word ?? "")].reduce((sum, char) => sum + (char === " " ? 0.4 : char.charCodeAt(0) < 128 ? 0.62 : 1), 0));

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
    lead: splitIntroText(openCall.introText).lead,
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

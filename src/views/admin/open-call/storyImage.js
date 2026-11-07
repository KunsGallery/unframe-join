import { getOpenCallDisplayStatus, parseOpenCallDate } from "../../../constants/openCall.js";

export const STORY_SIZE = { width: 1080, height: 1920 };
// Instagram draws its own controls over the top and bottom of a story.
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 1580;

const MARGIN = 80;
const POSTER_AREA = { x: MARGIN, y: STORY_SAFE_TOP, width: STORY_SIZE.width - MARGIN * 2, height: 1000 };
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const INK = "#151413";
const HEADLINES = { open: "지금 모집 중", upcoming: "곧 모집 시작", draft: "곧 모집 시작", closed: "모집 마감", archived: "모집 마감" };

export const STORY_LAYOUTS = [
  { id: "soft", label: "연한 바탕" },
  { id: "accent", label: "포인트 색 바탕" },
];

export const getContainRect = (image, area) => {
  const scale = Math.min(area.width / image.width, area.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height };
};

const clipToWidth = (text, maxWidth, measure) => {
  let clipped = text;
  while (clipped && measure(`${clipped}…`) > maxWidth) clipped = clipped.slice(0, -1);
  return `${clipped.trimEnd()}…`;
};

const splitLongWord = (word, maxWidth, measure) => {
  const pieces = [];
  let piece = "";
  for (const char of word) {
    if (piece && measure(piece + char) > maxWidth) {
      pieces.push(piece);
      piece = "";
    }
    piece += char;
  }
  return piece ? [...pieces, piece] : pieces;
};

// Korean reads best when lines break between words, so characters split only when a word cannot fit.
export const wrapTextLines = (text, maxWidth, measure, maxLines) => {
  const lines = [];
  let line = "";
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    const pieces = measure(word) > maxWidth ? splitLongWord(word, maxWidth, measure) : [word];
    lines.push(...pieces.slice(0, -1));
    line = pieces.at(-1);
  }
  if (line) lines.push(line);

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = clipToWidth(lines.slice(maxLines - 1).join(" "), maxWidth, measure);
  return kept;
};

const formatMonthDay = (value) => {
  const date = parseOpenCallDate(value);
  return date ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(date) : "";
};

export const buildStoryContent = (openCall, now = new Date()) => {
  const start = formatMonthDay(openCall?.applicationStartAt);
  const end = formatMonthDay(openCall?.applicationEndAt);
  const announcement = formatMonthDay(openCall?.announcementAt);
  const period = start && end ? `접수 ${start} — ${end}` : end ? `${end} 마감` : start ? `${start}부터 접수` : "";

  return {
    headline: HEADLINES[getOpenCallDisplayStatus(openCall, now).key] || "",
    title: String(openCall?.title ?? "").trim(),
    period,
    announcement: announcement ? `결과 발표 ${announcement}` : "",
    url: "join.unframe.kr/opencall",
  };
};

export const getStoryFileName = (openCall, layout) => {
  const slug = (String(openCall?.title ?? "").match(/[A-Za-z0-9가-힣]+/g) || []).join("-") || "opencall";
  return `unframe-story-${slug}-${layout}.png`;
};

export const drawStoryImage = (context, { poster, content, theme, layout }) => {
  const { width } = STORY_SIZE;
  const isAccentLayout = layout === "accent";
  const textColor = isAccentLayout ? theme.on : INK;
  const textWidth = width - MARGIN * 2;

  context.fillStyle = isAccentLayout ? theme.accent : theme.tint;
  context.fillRect(0, 0, width, STORY_SIZE.height);

  const rect = getContainRect({ width: poster.width, height: poster.height }, POSTER_AREA);
  context.drawImage(poster, rect.x, rect.y, rect.width, rect.height);

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  const center = width / 2;
  const measure = (text) => context.measureText(text).width;

  let y = POSTER_AREA.y + POSTER_AREA.height + 96;
  context.font = `800 76px ${FONT}`;
  context.fillStyle = isAccentLayout ? theme.on : theme.accentText;
  wrapTextLines(content.headline, textWidth, measure, 1).forEach((line) => context.fillText(line, center, y));

  context.fillStyle = textColor;
  y += 66;
  context.font = `700 40px ${FONT}`;
  wrapTextLines(content.title, textWidth, measure, 1).forEach((line) => context.fillText(line, center, y));

  context.font = `500 36px ${FONT}`;
  const schedule = [content.period, content.announcement].filter(Boolean).join("  ·  ");
  y += 58;
  wrapTextLines(schedule, textWidth, measure, 1).forEach((line) => context.fillText(line, center, y));

  context.font = `700 36px ${FONT}`;
  context.fillText(content.url, center, Math.min(y + 56, STORY_SAFE_BOTTOM - 8));
};

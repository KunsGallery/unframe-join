// Link previews (Open Graph) for pages that are shared on KakaoTalk, Instagram and the like.
// Used by the edge function that rewrites /opencall, so it must stay free of browser and Firebase SDK imports.
import { createFallbackOpenCall, parseOpenCallDate, pickActiveOpenCall } from "../constants/openCall.js";

export const SITE_ORIGIN = "https://join.unframe.kr";
export const DEFAULT_SHARE_IMAGE = `${SITE_ORIGIN}/og-default.jpg`;

// Firestore REST returns typed values ({ stringValue }, { mapValue: { fields } } …); turn them into plain JS.
export const fromFirestoreValue = (value = {}) => {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, inner]) => [key, fromFirestoreValue(inner)]));
  }
  return null;
};

export const openCallsFromRest = (json) =>
  (json?.documents || []).map((doc) => ({
    ...fromFirestoreValue({ mapValue: { fields: doc.fields || {} } }),
    id: String(doc.name || "").split("/").pop(),
  }));

const monthDay = (value) => {
  const date = parseOpenCallDate(value);
  return date ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(date).replace(/\s/g, "").replace(/\.$/, "") : "";
};

// The open call a shared link should show: the one named in ?openCallId=, else the one the page itself would pick.
export const pickSharedOpenCall = (openCalls, requestedId = "") => {
  const visible = openCalls.filter((call) => call.isVisible !== false);
  return (requestedId && visible.find((call) => call.id === requestedId)) || pickActiveOpenCall(visible);
};

export const buildOpenCallShareMeta = (rawCall, url) => {
  if (!rawCall) return null;
  const call = createFallbackOpenCall(rawCall);
  const title = String(call.title || "").trim();
  if (!title) return null;
  const start = monthDay(call.applicationStartAt);
  const end = monthDay(call.applicationEndAt);
  const period = start && end ? `접수 ${start} — ${end}` : end ? `${end} 마감` : "";
  const lead = String(rawCall.subtitle || "").trim();      // the fallback subtitle belongs to an older call, so only the stored one
  const poster = String(call.posterUrl || "").trim();
  return {
    title: /open\s*call|오픈콜/i.test(title) ? `${title} | UNFRAME` : `${title} | UNFRAME 오픈콜`,
    description: [lead, period, "UNFRAME 인사동"].filter(Boolean).join(" · "),
    image: /^https:\/\//.test(poster) ? poster : DEFAULT_SHARE_IMAGE,
    url,
  };
};

const escapeAttribute = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TAGS = [
  ["property", "og:title", "title"],
  ["property", "og:description", "description"],
  ["property", "og:image", "image"],
  ["property", "og:url", "url"],
  ["name", "twitter:title", "title"],
  ["name", "twitter:description", "description"],
  ["name", "twitter:image", "image"],
  ["name", "description", "description"],
];

// Replaces the content of the meta tags index.html already carries, and the <title>.
export const injectShareMeta = (html, meta) => {
  if (!meta) return html;
  let next = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttribute(meta.title)}</title>`);
  for (const [attribute, name, field] of TAGS) {
    const pattern = new RegExp(`(<meta\\s+${attribute}="${name}"\\s+content=")[^"]*(")`);
    next = next.replace(pattern, `$1${escapeAttribute(meta[field])}$2`);
  }
  return next;
};

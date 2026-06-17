export const normalizeSnsOrWebsiteUrl = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^\/\//.test(raw)) {
    return `https:${raw}`;
  }

  if (/^(www\.)?instagram\.com\//i.test(raw)) {
    return `https://${raw.replace(/^www\./i, "www.")}`;
  }

  if (/^www\./i.test(raw)) {
    return `https://${raw}`;
  }

  if (raw.startsWith("@")) {
    const username = raw.slice(1).trim();
    return username ? `https://www.instagram.com/${username}` : "";
  }

  return `https://www.instagram.com/${raw}`;
};

export const getSnsOrWebsiteLinkLabel = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw) || /^www\./i.test(raw)) {
    return /instagram\.com\//i.test(raw) ? "인스타그램 보기" : "웹사이트 보기";
  }

  if (raw.startsWith("@")) {
    return "인스타그램 보기";
  }

  return "인스타그램 보기";
};

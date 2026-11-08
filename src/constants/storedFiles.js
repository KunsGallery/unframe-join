// Applicant files (portfolios, artwork images) live in a private R2 bucket. Documents store a reference,
// "r2-private://<key>", never a public address; a short-lived link is signed for an admin or the file's owner.
// Shared by the browser and the Netlify functions, so no imports here.

export const PRIVATE_REF_PREFIX = "r2-private://";
export const PRIVATE_FOLDERS = ["open-call/portfolio", "open-call/works"];
const UPLOAD_FOLDERS = [...PRIVATE_FOLDERS, "documents", "salon-answers", "salon-posters", "open-call/posters", "images", "join-home", "join-tracks", "join-popups"];

export const isPrivateRef = (value) => typeof value === "string" && value.startsWith(PRIVATE_REF_PREFIX);
export const toPrivateRef = (key) => `${PRIVATE_REF_PREFIX}${key}`;

// Keys are "<folder>/<yyyy>/<mm>/<uid>/<uuid>-<name>" (r2-sign-upload). Returns null for anything else,
// including path tricks, so callers can trust folder and owner.
export const parseStoredKey = (key) => {
  if (typeof key !== "string" || key.length > 600 || key.includes("..") || key.includes("//") || !/^[\w./-]+$/.test(key)) return null;
  const folder = UPLOAD_FOLDERS.find((candidate) => key.startsWith(`${candidate}/`));
  if (!folder) return null;
  const [yyyy, mm, uid, name, ...rest] = key.slice(folder.length + 1).split("/");
  if (rest.length || !/^\d{4}$/.test(yyyy || "") || !/^\d{2}$/.test(mm || "") || !uid || !name) return null;
  return { folder, uid, name, isPrivate: PRIVATE_FOLDERS.includes(folder) };
};

export const keyFromPrivateRef = (ref) => (isPrivateRef(ref) ? ref.slice(PRIVATE_REF_PREFIX.length) : "");

// A public R2 address under base → its key, or "" when it is not one of ours.
export const keyFromPublicUrl = (value, base) => {
  try {
    const url = new URL(value);
    const root = new URL(base);
    const prefix = `${root.pathname.replace(/\/$/, "")}/`;
    if (url.origin !== root.origin || !url.pathname.startsWith(prefix)) return "";
    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return "";
  }
};

// Every stored file an application points at, public or private, for purging.
export const collectApplicationFiles = (app = {}) => {
  const values = [app.portfolioUrl, ...(Array.isArray(app.works) ? app.works.map((work) => work?.imageUrl) : [])];
  if (Array.isArray(app.additionalFiles)) values.push(...app.additionalFiles.map((file) => (typeof file === "string" ? file : file?.url)));
  Object.values(app.customFieldAnswers || {}).forEach((answer) => {
    if (typeof answer?.value === "string" && /^(https:|r2-private:)/.test(answer.value)) values.push(answer.value);
  });
  return [...new Set(values.filter((value) => typeof value === "string" && value))];
};

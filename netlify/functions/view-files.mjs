// Short-lived links to applicant files in the private bucket. An admin may open any of them;
// an applicant only the files uploaded under their own account (the uid is part of every key).
import { isPrivateRef, keyFromPrivateRef, parseStoredKey } from "../../src/constants/storedFiles.js";
import { isAdminToken, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";
import { r2Settings, signPrivateView } from "./_lib/r2.mjs";
import { enforceRateLimit } from "./_lib/rateLimit.mjs";
import { json, parseBody } from "./_lib/salonShared.mjs";

const MAX_REFS = 60;
const LINK_SECONDS = 600;

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const identity = await verifyUserRequest(event);
    const isAdmin = isAdminToken(identity);
    const refs = [...new Set((parseBody(event).refs || []).filter(isPrivateRef))].slice(0, MAX_REFS);
    const settings = r2Settings();
    if (refs.length === 0) return json(200, { urls: {}, expiresIn: LINK_SECONDS });
    if (!settings.privateBucket) return json(503, { error: "비공개 파일 저장소가 설정되지 않았습니다." });
    if (!isAdmin) await enforceRateLimit({ scope: "view-files", subject: identity.uid, limit: 120, windowMs: 60 * 60 * 1000 });

    const urls = {};
    await Promise.all(refs.map(async (ref) => {
      const key = keyFromPrivateRef(ref);
      const parsed = parseStoredKey(key);
      if (!parsed?.isPrivate || (!isAdmin && parsed.uid !== identity.uid)) return;
      urls[ref] = await signPrivateView(key, settings, LINK_SECONDS);
    }));
    return json(200, { urls, expiresIn: LINK_SECONDS });
  } catch (error) {
    if (!error.statusCode) console.error("view-files error");
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "파일 링크를 만들지 못했습니다." });
  }
}

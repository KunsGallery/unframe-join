import crypto from "node:crypto";
import { adminDb } from "./firebaseDatabase.mjs";

const RATE_LIMITS_PATH = "artifacts/unframe-join/admin/data/rateLimits";

// Fixed-window counter in Firestore, since function instances share no memory.
// expiresAt lets a Firestore TTL policy clean up old counters.
export const enforceRateLimit = ({ scope, subject, limit, windowMs }) => {
  const id = crypto.createHash("sha256").update(`${scope}:${subject}`).digest("hex").slice(0, 40);
  const ref = adminDb.collection(RATE_LIMITS_PATH).doc(id);

  return adminDb.runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data();
    const now = Date.now();
    const inWindow = current && now - current.windowStart < windowMs;
    if (inWindow && current.count >= limit) {
      throw Object.assign(new Error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."), { statusCode: 429 });
    }
    const windowStart = inWindow ? current.windowStart : now;
    transaction.set(ref, {
      scope,
      windowStart,
      count: inWindow ? current.count + 1 : 1,
      expiresAt: new Date(windowStart + windowMs),
    });
  });
};

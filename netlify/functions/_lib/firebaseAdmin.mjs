import { getAuth } from "firebase-admin/auth";
import { adminApp } from "./firebaseDatabase.mjs";
export { adminDb } from "./firebaseDatabase.mjs";

export const adminAuth = getAuth(adminApp);
export const SERVER_TIMESTAMP = () => new Date();

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "sylove887@gmail.com",
]);

const decodeBearerToken = async (event, missingMessage) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error(missingMessage), { statusCode: 401 });
  try {
    return await adminAuth.verifyIdToken(match[1]);
  } catch {
    throw Object.assign(new Error(missingMessage), { statusCode: 401 });
  }
};

export const verifyAdminRequest = async (event) => {
  const decoded = await decodeBearerToken(event, "관리자 로그인이 필요합니다.");
  const email = String(decoded.email || "").trim().toLowerCase();
  const isTrustedLogin = decoded.email_verified === true && decoded.firebase?.sign_in_provider === "google.com";
  if (!ADMIN_EMAILS.has(email) || !isTrustedLogin) {
    throw Object.assign(new Error("관리자 권한이 없습니다."), { statusCode: 403 });
  }
  return { uid: decoded.uid, email };
};

export const verifyUserRequest = async (event) => {
  const decoded = await decodeBearerToken(event, "로그인 정보가 필요합니다.");
  if (decoded.firebase?.sign_in_provider === "anonymous") {
    throw Object.assign(new Error("로그인 후 신청해 주세요."), { statusCode: 403 });
  }
  return decoded;
};

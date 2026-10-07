import { getAuth } from "firebase-admin/auth";
import { adminApp } from "./firebaseDatabase.mjs";
export { adminDb } from "./firebaseDatabase.mjs";

export const adminAuth = getAuth(adminApp);
export const SERVER_TIMESTAMP = () => new Date();

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "sylove887@gmail.com",
]);

export const verifyAdminRequest = async (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("관리자 로그인이 필요합니다."), { statusCode: 401 });
  const decoded = await adminAuth.verifyIdToken(match[1]);
  const email = String(decoded.email || "").trim().toLowerCase();
  if (!ADMIN_EMAILS.has(email)) {
    throw Object.assign(new Error("관리자 권한이 없습니다."), { statusCode: 403 });
  }
  return { uid: decoded.uid, email };
};

export const verifyUserRequest = async (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("로그인 정보가 필요합니다."), { statusCode: 401 });
  const decoded = await adminAuth.verifyIdToken(match[1]);
  if (decoded.firebase?.sign_in_provider === "anonymous") {
    throw Object.assign(new Error("로그인 후 신청해 주세요."), { statusCode: 403 });
  }
  return decoded;
};

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const getProjectId = () =>
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "";

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  }
  const projectId = getProjectId();
  if (projectId && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
};

const serviceAccount = parseServiceAccount();
const projectId = serviceAccount?.projectId || getProjectId();

if (!projectId) {
  throw new Error("Firebase Admin 프로젝트 ID가 없습니다. FIREBASE_PROJECT_ID 또는 FIREBASE_SERVICE_ACCOUNT_JSON을 설정해 주세요.");
}

const adminApp = getApps()[0] || initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  projectId,
});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
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

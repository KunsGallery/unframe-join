import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRIVATE_FOLDERS, toPrivateRef } from "../../src/constants/storedFiles.js";
import { verifyAdminRequest, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";
import { isR2Configured, r2Client, r2Settings, usesPrivateBucket } from "./_lib/r2.mjs";
import { enforceRateLimit } from "./_lib/rateLimit.mjs";

const EXTENSIONS_BY_TYPE = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "application/zip": ["zip"],
  "application/x-zip-compressed": ["zip"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/msword": ["doc"],
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const safeName = (name = "file") =>
  name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");

const makeKey = ({ folder = "uploads", userId = "user", fileName }) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const random = crypto.randomUUID();
  return `${folder}/${yyyy}/${mm}/${userId}/${random}-${safeName(fileName)}`;
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { fileName, contentType, fileSize, folder = "documents", isAdminUpload = false } = JSON.parse(event.body || "{}");

    const identity = isAdminUpload
      ? await verifyAdminRequest(event)
      : await verifyUserRequest(event);

    if (!fileName || !contentType) {
      return json(400, { error: "fileName and contentType are required" });
    }

    const settings = r2Settings();
    if (!isR2Configured(settings)) {
      console.error("R2 env check failed");
      return json(500, { error: "Missing R2 environment variables" });
    }

    const allowedFolders = isAdminUpload
      ? new Set([...PRIVATE_FOLDERS, "documents", "salon-answers", "salon-posters", "open-call/posters", "images", "join-home", "join-tracks", "join-popups"])
      : new Set([...PRIVATE_FOLDERS, "documents", "salon-answers"]);
    if (!allowedFolders.has(folder)) return json(400, { error: "허용되지 않은 업로드 위치입니다." });
    const allowedExtensions = Object.hasOwn(EXTENSIONS_BY_TYPE, contentType) ? EXTENSIONS_BY_TYPE[contentType] : null;
    if (!allowedExtensions) return json(400, { error: "허용되지 않은 파일 형식입니다." });
    const extension = String(fileName).includes(".") ? String(fileName).split(".").pop().toLowerCase() : "";
    if (!allowedExtensions.includes(extension)) return json(400, { error: "파일 확장자가 형식과 일치하지 않습니다." });
    const isImage = contentType.startsWith("image/");
    const maxBytes = isImage ? 32 * 1024 * 1024 : 25 * 1024 * 1024;
    const claimedSize = Number(fileSize);
    if (!Number.isFinite(claimedSize) || claimedSize <= 0 || claimedSize > maxBytes) {
      return json(400, { error: "파일 크기가 허용 범위를 벗어났습니다." });
    }
    if (!isAdminUpload) {
      await enforceRateLimit({ scope: "r2-sign-upload", subject: identity.uid, limit: 60, windowMs: 60 * 60 * 1000 });
    }
    const key = makeKey({ folder, userId: identity.uid, fileName });
    const isPrivate = usesPrivateBucket(folder, settings);

    const command = new PutObjectCommand({
      Bucket: isPrivate ? settings.privateBucket : settings.publicBucket,
      Key: key,
      ContentType: contentType,
      ContentLength: claimedSize,
    });

    const signedUrl = await getSignedUrl(r2Client(settings), command, {
      expiresIn: 60 * 5,
      // Otherwise the uploader may choose any Content-Type, such as text/html, at PUT time.
      signableHeaders: new Set(["content-type"]),
    });

    // Applicant files get a private reference instead of an address anyone could open.
    return json(200, isPrivate
      ? { key, signedUrl, publicUrl: "", fileRef: toPrivateRef(key) }
      : { key, signedUrl, publicUrl: `${settings.publicBaseUrl}/${key}`, fileRef: `${settings.publicBaseUrl}/${key}` });
  } catch (error) {
    console.error("r2-sign-upload error:", error?.statusCode || 500);
    return json(error?.statusCode || 500, {
      error: error?.statusCode ? error.message : "Failed to create signed upload URL",
    });
  }
}

import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyAdminRequest, verifyUserRequest } from "./_lib/firebaseAdmin.mjs";

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

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      console.error("R2 env check failed", {
        hasAccountId: !!accountId,
        hasAccessKeyId: !!accessKeyId,
        hasSecretAccessKey: !!secretAccessKey,
        hasBucket: !!bucket,
        hasPublicBaseUrl: !!publicBaseUrl,
      });

      return json(500, { error: "Missing R2 environment variables" });
    }

    const allowedFolders = isAdminUpload
      ? new Set(["documents", "open-call/portfolio", "salon-answers", "salon-posters", "images", "join-home", "join-tracks", "join-popups"])
      : new Set(["documents", "open-call/portfolio", "salon-answers"]);
    if (!allowedFolders.has(folder)) return json(400, { error: "허용되지 않은 업로드 위치입니다." });
    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
      "application/zip", "application/x-zip-compressed",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword",
    ]);
    if (!allowedTypes.has(contentType)) return json(400, { error: "허용되지 않은 파일 형식입니다." });
    const isImage = contentType.startsWith("image/");
    const maxBytes = isImage ? 32 * 1024 * 1024 : 25 * 1024 * 1024;
    const claimedSize = Number(fileSize);
    if (!Number.isFinite(claimedSize) || claimedSize <= 0 || claimedSize > maxBytes) {
      return json(400, { error: "파일 크기가 허용 범위를 벗어났습니다." });
    }
    const key = makeKey({ folder, userId: identity.uid, fileName });

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: claimedSize,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: 60 * 5,
    });

    return json(200, {
      key,
      signedUrl,
      publicUrl: `${publicBaseUrl}/${key}`,
    });
  } catch (error) {
    console.error("r2-sign-upload error:", error?.statusCode || 500);
    return json(error?.statusCode || 500, {
      error: error?.statusCode ? error.message : "Failed to create signed upload URL",
    });
  }
}

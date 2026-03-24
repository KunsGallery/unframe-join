import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const safeName = (name = "file") =>
  name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");

const makeKey = ({ folder = "uploads", userId = "anonymous", fileName }) => {
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
    const {
      fileName,
      contentType,
      folder = "documents",
      userId = "anonymous",
    } = JSON.parse(event.body || "{}");

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

    const key = makeKey({ folder, userId, fileName });

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
    console.error("r2-sign-upload error:", error);
    return json(500, {
      error: error?.message || "Failed to create signed upload URL",
    });
  }
}
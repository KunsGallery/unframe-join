import { DeleteObjectsCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRIVATE_FOLDERS, isPrivateRef, keyFromPrivateRef, keyFromPublicUrl, parseStoredKey } from "../../../src/constants/storedFiles.js";

export const r2Settings = () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  publicBucket: process.env.R2_BUCKET_NAME,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  // Until this is set, applicant files keep going to the public bucket as before (see docs/private-files.md).
  privateBucket: process.env.R2_PRIVATE_BUCKET_NAME || "",
});

export const isR2Configured = (settings = r2Settings()) =>
  Boolean(settings.accountId && settings.accessKeyId && settings.secretAccessKey && settings.publicBucket && settings.publicBaseUrl);

export const r2Client = (settings = r2Settings()) =>
  new S3Client({
    region: "auto",
    endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
  });

export const usesPrivateBucket = (folder, settings = r2Settings()) => Boolean(settings.privateBucket) && PRIVATE_FOLDERS.includes(folder);

export const signPrivateView = (key, settings = r2Settings(), expiresIn = 600) =>
  getSignedUrl(r2Client(settings), new GetObjectCommand({ Bucket: settings.privateBucket, Key: key }), { expiresIn });

// Where a stored value lives: { bucket, key } in the private or the public bucket, or null if it is not our file.
export const locateStoredFile = (value, settings = r2Settings()) => {
  if (isPrivateRef(value)) {
    const key = keyFromPrivateRef(value);
    return settings.privateBucket && parseStoredKey(key) ? { bucket: settings.privateBucket, key } : null;
  }
  const key = settings.publicBaseUrl ? keyFromPublicUrl(value, settings.publicBaseUrl) : "";
  return key && parseStoredKey(key) ? { bucket: settings.publicBucket, key } : null;
};

export const deleteStoredFiles = async (values, settings = r2Settings()) => {
  const byBucket = new Map();
  values.map((value) => locateStoredFile(value, settings)).filter(Boolean).forEach(({ bucket, key }) => {
    byBucket.set(bucket, [...(byBucket.get(bucket) || []), key]);
  });
  if (byBucket.size === 0) return 0;
  const client = r2Client(settings);
  let deleted = 0;
  for (const [bucket, keys] of byBucket) {
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
      if (result.Errors?.length) throw Object.assign(new Error("일부 파일을 지우지 못했습니다."), { statusCode: 502 });
      deleted += chunk.length;
    }
  }
  return deleted;
};

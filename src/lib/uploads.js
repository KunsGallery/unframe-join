import { auth } from "./firebase";
import { putWithProgress } from "./uploadProgress";

export const IMAGE_MAX_SIZE = 32 * 1024 * 1024;
export const DOCUMENT_MAX_SIZE = 25 * 1024 * 1024;

export const DOCUMENT_ACCEPTED_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export const isImageFile = (file) => file?.type?.startsWith("image/");

export const validateImageFile = (file) => {
  if (!file) return "파일을 선택해 주세요.";
  if (!isImageFile(file)) return "이미지 파일만 업로드할 수 있습니다.";
  if (file.size > IMAGE_MAX_SIZE) return "이미지는 32MB 이하만 업로드할 수 있습니다.";
  return "";
};

export const validateDocumentFile = (file) => {
  if (!file) return "파일을 선택해 주세요.";
  if (!DOCUMENT_ACCEPTED_TYPES.includes(file.type)) {
    return "PDF, ZIP, DOC, DOCX 파일만 업로드할 수 있습니다.";
  }
  if (file.size > DOCUMENT_MAX_SIZE) {
    return "문서 파일은 25MB 이하만 업로드할 수 있습니다.";
  }
  return "";
};

const getSignedUpload = async ({ fileName, contentType, fileSize, folder, isAdminUpload = false }) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("파일 업로드를 위해 로그인해 주세요.");
  const response = await fetch("/.netlify/functions/r2-sign-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName,
      contentType,
      fileSize,
      folder,
      isAdminUpload,
    }),
  });

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("R2 서명 함수 응답이 올바른 JSON이 아닙니다.");
  }

  if (!response.ok) {
    throw new Error(result?.error || `업로드 서명 생성 실패 (${response.status})`);
  }

  return result;
};
export const uploadDocumentToR2 = async ({ file, folder, onProgress, signal }) => {
  const error = validateDocumentFile(file);
  if (error) throw new Error(error);

  const signed = await getSignedUpload({
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    folder,
  });

  await putWithProgress({ file, url: signed.signedUrl, onProgress, signal });

  return {
    key: signed.key,
    url: signed.fileRef || signed.publicUrl,   // a private "r2-private://" reference for applicant files
  };
};

export const uploadImageToR2 = async ({ file, folder = "images", isAdminUpload = false, onProgress, signal }) => {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const signed = await getSignedUpload({
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    folder,
    isAdminUpload,
  });

  await putWithProgress({ file, url: signed.signedUrl, onProgress, signal });

  return {
    key: signed.key,
    url: signed.fileRef || signed.publicUrl,   // a private "r2-private://" reference for applicant files
  };
};

export const sendApplicationEmails = async ({ applicationId }) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/.netlify/functions/send-application-emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({ applicationId }),
  });

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result?.error || "메일 발송에 실패했습니다.");
  }

  return result;
};

export const sendApplicationStatusEmail = async ({
  type,
  applicantName,
  applicantEmail,
  exhibitionTitle,
  selectedDate,
  selectedProgram,
  partnerType,
  rejectionReason = "",
  requestMessage = "",
  applicationDetailUrl = "",
}) => {
  if (!type || !["approved", "rejected", "additional_requested"].includes(type)) {
    throw new Error("Valid status is required");
  }

  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/.netlify/functions/send-application-status-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({
      type,
      applicantName,
      applicantEmail,
      exhibitionTitle,
      selectedDate,
      selectedProgram,
      partnerType,
      rejectionReason,
      requestMessage,
      applicationDetailUrl,
    }),
  });

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result?.error || "상태 메일 발송에 실패했습니다.");
  }

  return result;
};

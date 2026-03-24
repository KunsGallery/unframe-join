const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

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

export const uploadImageToImgbb = async (file) => {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  if (!IMGBB_API_KEY) throw new Error("VITE_IMGBB_API_KEY가 설정되지 않았습니다.");

  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", file);
  formData.append("name", file.name);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.error?.message || "ImgBB 업로드에 실패했습니다.");
  }

  return {
    url: result.data.url,
    displayUrl: result.data.display_url,
    deleteUrl: result.data.delete_url,
  };
};

const getSignedUpload = async ({ fileName, contentType, folder, userId }) => {
  const response = await fetch("/.netlify/functions/r2-sign-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName,
      contentType,
      folder,
      userId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || "업로드 서명 생성에 실패했습니다.");
  }

  return result;
};

const uploadFileToSignedUrl = async ({ file, signedUrl }) => {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("R2 업로드에 실패했습니다.");
  }
};

export const uploadDocumentToR2 = async ({ file, folder, userId }) => {
  const error = validateDocumentFile(file);
  if (error) throw new Error(error);

  const signed = await getSignedUpload({
    fileName: file.name,
    contentType: file.type,
    folder,
    userId,
  });

  await uploadFileToSignedUrl({
    file,
    signedUrl: signed.signedUrl,
  });

  return {
    key: signed.key,
    url: signed.publicUrl,
  };
};
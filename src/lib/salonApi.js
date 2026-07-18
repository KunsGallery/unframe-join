import { auth } from "./firebase";

export const callSalonFunction = async (name, body, options = {}) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인 정보를 확인할 수 없습니다.");
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: options.method || "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: options.method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "요청 처리에 실패했습니다.");
    error.status = response.status;
    error.data = result;
    throw error;
  }
  return result;
};

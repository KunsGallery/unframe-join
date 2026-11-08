import { useEffect, useMemo, useState } from "react";
import { isPrivateRef } from "../constants/storedFiles";
import { auth } from "./firebase";

// Applicant files are stored as "r2-private://…" references. These helpers swap them for short-lived links
// (view-files function); public addresses pass through unchanged.
const cache = new Map();          // ref → { url, expiresAt }
const MARGIN_MS = 60 * 1000;      // refresh a minute before a link runs out

const fresh = (ref) => {
  const hit = cache.get(ref);
  return hit && hit.expiresAt - MARGIN_MS > Date.now() ? hit.url : "";
};

export const resolveFileUrls = async (values) => {
  const refs = [...new Set(values.filter(isPrivateRef))];
  const missing = refs.filter((ref) => !fresh(ref));
  if (missing.length > 0) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("파일을 보려면 로그인해 주세요.");
    for (let i = 0; i < missing.length; i += 60) {
      const response = await fetch("/.netlify/functions/view-files", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ refs: missing.slice(i, i + 60) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "파일 링크를 만들지 못했습니다.");
      const expiresAt = Date.now() + (result.expiresIn || 600) * 1000;
      Object.entries(result.urls || {}).forEach(([ref, url]) => cache.set(ref, { url, expiresAt }));
    }
  }
  return Object.fromEntries(values.map((value) => [value, isPrivateRef(value) ? fresh(value) : value]));
};

// For <img> and links in a list: returns a function value → displayable address ("" while loading).
export const useFileUrls = (values) => {
  const refs = useMemo(() => [...new Set((values || []).filter(isPrivateRef))].sort(), [values]);
  const key = refs.join("\n");
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return undefined;
    let stale = false;
    resolveFileUrls(key.split("\n"))
      .then(() => { if (!stale) setVersion((version) => version + 1); })
      .catch((error) => console.error(error));
    return () => { stale = true; };
  }, [key]);

  return (value) => (isPrivateRef(value) ? fresh(value) : value || "");
};

// Opening one file on click always asks for a fresh link, so an old page never shows an expired one.
export const openStoredFile = async (value) => {
  if (!isPrivateRef(value)) {
    window.open(value, "_blank", "noopener,noreferrer");
    return;
  }
  const tab = window.open("", "_blank");
  try {
    cache.delete(value);
    const url = (await resolveFileUrls([value]))[value];
    if (!url) throw new Error("이 파일을 열 권한이 없습니다.");
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    tab?.close();
    window.alert(error.message);
  }
};

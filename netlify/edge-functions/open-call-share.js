// Link previews for /opencall: KakaoTalk, Instagram and other crawlers do not run the app,
// so the current open call's title, dates and poster are written into the HTML here.
// Any failure (Firestore slow or down) falls back to the default tags already in index.html.
import { SITE_ORIGIN, buildOpenCallShareMeta, injectShareMeta, openCallsFromRest, pickSharedOpenCall } from "../../src/lib/shareMeta.js";

const PROJECT_ID = "unframe-join";
const OPEN_CALLS_URL =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/unframe-join/public/data/openCalls?pageSize=100`;

export default async (request, context) => {
  const response = await context.next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const firestore = await fetch(OPEN_CALLS_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!firestore.ok) return response;

    const url = new URL(request.url);
    const call = pickSharedOpenCall(openCallsFromRest(await firestore.json()), url.searchParams.get("openCallId") || "");
    const shareUrl = `${SITE_ORIGIN}${url.pathname}${call ? `?openCallId=${encodeURIComponent(call.id)}` : ""}`;
    const meta = buildOpenCallShareMeta(call, shareUrl);
    if (!meta) return response;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injectShareMeta(await response.text(), meta), { status: response.status, headers });
  } catch {
    return response;
  }
};

export const config = { path: ["/opencall", "/opencall/apply"] };

import assert from "node:assert/strict";
import { test } from "node:test";
import { putWithProgress } from "../src/lib/uploadProgress.js";

const fakeRequest = () => {
  const request = {
    upload: {},
    headers: {},
    open(method, url) { Object.assign(request, { method, url }); },
    setRequestHeader(key, value) { request.headers[key] = value; },
    send(body) { request.body = body; },
    abort() { request.aborted = true; request.onabort?.(); },
  };
  return request;
};
const file = { type: "image/jpeg" };

test("서명된 주소로 파일 형식을 담아 PUT하고 진행률을 알린다", async () => {
  const request = fakeRequest();
  const seen = [];
  const done = putWithProgress({ file, url: "https://r2/x", onProgress: (value) => seen.push(value), createRequest: () => request });

  assert.equal(request.method, "PUT");
  assert.equal(request.url, "https://r2/x");
  assert.equal(request.headers["Content-Type"], "image/jpeg");
  assert.equal(request.body, file);

  request.upload.onprogress({ lengthComputable: true, loaded: 48, total: 100 });
  request.upload.onprogress({ lengthComputable: false, loaded: 1, total: 0 });
  request.status = 200;
  request.onload();
  await done;
  assert.deepEqual(seen, [48, 100]);
});

test("서버 오류와 연결 끊김은 안내 문구로 실패한다", async () => {
  const rejected = fakeRequest();
  const first = putWithProgress({ file, url: "u", createRequest: () => rejected });
  rejected.status = 403;
  rejected.onload();
  await assert.rejects(first, /인터넷 연결을 확인/);

  const offline = fakeRequest();
  const second = putWithProgress({ file, url: "u", createRequest: () => offline });
  offline.onerror();
  await assert.rejects(second, /인터넷 연결을 확인/);
});

test("취소하면 요청을 멈추고 취소 오류를 낸다", async () => {
  const request = fakeRequest();
  const controller = new AbortController();
  const done = putWithProgress({ file, url: "u", signal: controller.signal, createRequest: () => request });
  controller.abort();
  await assert.rejects(done, { name: "AbortError" });
  assert.equal(request.aborted, true);
});

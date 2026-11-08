import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectApplicationFiles,
  isPrivateRef,
  keyFromPublicUrl,
  parseStoredKey,
  toPrivateRef,
} from "../src/constants/storedFiles.js";
import { locateStoredFile, usesPrivateBucket } from "../netlify/functions/_lib/r2.mjs";

const settings = { privateBucket: "private", publicBucket: "public", publicBaseUrl: "https://pub.example.dev" };

test("저장 경로에서 폴더와 올린 사람을 읽고, 이상한 경로는 거부한다", () => {
  assert.deepEqual(parseStoredKey("open-call/works/2026/11/uid1/abc-a.jpg"), { folder: "open-call/works", uid: "uid1", name: "abc-a.jpg", isPrivate: true });
  assert.equal(parseStoredKey("open-call/posters/2026/11/uid1/p.png").isPrivate, false);
  for (const bad of [
    "open-call/works/2026/11/uid1/../x.jpg",
    "open-call/works/2026/11/uid1/sub/x.jpg",
    "open-call/works//2026/11/uid1/x.jpg",
    "secret/2026/11/uid1/x.jpg",
    "open-call/works/26/11/uid1/x.jpg",
    "open-call/works/2026/11/uid1/<x>.jpg",
    "",
  ]) assert.equal(parseStoredKey(bad), null, bad);
});

test("비공개 참조와 공개 주소를 구분한다", () => {
  const ref = toPrivateRef("open-call/works/2026/11/u/a.jpg");
  assert.ok(isPrivateRef(ref));
  assert.ok(!isPrivateRef("https://pub.example.dev/open-call/works/2026/11/u/a.jpg"));
  assert.equal(keyFromPublicUrl("https://pub.example.dev/open-call/works/2026/11/u/a.jpg", "https://pub.example.dev"), "open-call/works/2026/11/u/a.jpg");
  assert.equal(keyFromPublicUrl("https://evil.example/open-call/works/2026/11/u/a.jpg", "https://pub.example.dev"), "");
});

test("지원서가 가리키는 파일을 모두 모은다", () => {
  const files = collectApplicationFiles({
    portfolioUrl: "r2-private://open-call/portfolio/2026/11/u/p.pdf",
    works: [{ imageUrl: "https://pub.example.dev/open-call/works/2026/11/u/a.jpg" }, { imageUrl: "" }, null],
    additionalFiles: ["https://pub.example.dev/documents/2026/11/u/d.pdf", { url: "r2-private://open-call/works/2026/11/u/b.jpg" }],
    customFieldAnswers: { q: { value: "텍스트 답변" }, f: { value: "https://pub.example.dev/salon-answers/2026/11/u/s.png" } },
  });
  assert.equal(files.length, 5);
  assert.ok(!files.includes("텍스트 답변"));
});

test("파일이 어느 버킷에 있는지 찾고, 우리 파일이 아니면 건드리지 않는다", () => {
  assert.deepEqual(locateStoredFile("r2-private://open-call/works/2026/11/u/a.jpg", settings), { bucket: "private", key: "open-call/works/2026/11/u/a.jpg" });
  assert.deepEqual(locateStoredFile("https://pub.example.dev/open-call/works/2026/11/u/a.jpg", settings), { bucket: "public", key: "open-call/works/2026/11/u/a.jpg" });
  assert.equal(locateStoredFile("https://elsewhere.example/open-call/works/2026/11/u/a.jpg", settings), null);
  assert.equal(locateStoredFile("https://pub.example.dev/../../etc", settings), null);
  assert.equal(locateStoredFile("r2-private://open-call/works/2026/11/u/a.jpg", { ...settings, privateBucket: "" }), null);
  assert.equal(usesPrivateBucket("open-call/works", settings), true);
  assert.equal(usesPrivateBucket("open-call/posters", settings), false);
  assert.equal(usesPrivateBucket("open-call/works", { ...settings, privateBucket: "" }), false);
});

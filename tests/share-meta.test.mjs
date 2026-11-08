import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEFAULT_SHARE_IMAGE,
  buildOpenCallShareMeta,
  fromFirestoreValue,
  injectShareMeta,
  openCallsFromRest,
  pickSharedOpenCall,
} from "../src/lib/shareMeta.js";

const restDoc = (id, fields) => ({ name: `projects/p/databases/(default)/documents/artifacts/unframe-join/public/data/openCalls/${id}`, fields });

test("Firestore REST 값을 일반 값으로 바꾼다", () => {
  assert.equal(fromFirestoreValue({ stringValue: "a" }), "a");
  assert.equal(fromFirestoreValue({ integerValue: "3" }), 3);
  assert.equal(fromFirestoreValue({ booleanValue: false }), false);
  assert.deepEqual(fromFirestoreValue({ arrayValue: { values: [{ stringValue: "x" }] } }), ["x"]);
  assert.deepEqual(fromFirestoreValue({ mapValue: { fields: { k: { nullValue: null } } } }), { k: null });
  const [call] = openCallsFromRest({ documents: [restDoc("xmas", { title: { stringValue: "All I Want" } })] });
  assert.equal(call.id, "xmas");
  assert.equal(call.title, "All I Want");
});

test("공유 링크는 요청한 공고, 없으면 페이지가 고르는 공고를 쓴다", () => {
  const now = Date.now();
  const calls = [
    { id: "old", title: "지난 공고", status: "closed", applicationEndAt: new Date(now - 864e5 * 30).toISOString() },
    { id: "live", title: "지금 공고", status: "open", applicationStartAt: new Date(now - 864e5).toISOString(), applicationEndAt: new Date(now + 864e5).toISOString() },
    { id: "hidden", title: "숨김", isVisible: false },
  ];
  assert.equal(pickSharedOpenCall(calls).id, "live");
  assert.equal(pickSharedOpenCall(calls, "old").id, "old");
  assert.equal(pickSharedOpenCall(calls, "hidden").id, "live", "숨긴 공고는 주소로 불러도 미리보기에 쓰지 않는다");
});

test("미리보기 문구에 공고명, 접수 기간, 포스터를 넣는다", () => {
  const meta = buildOpenCallShareMeta({
    id: "xmas", title: "All I Want For Christmas Is Art", posterUrl: "https://pub.example.r2.dev/open-call/posters/p.png",
    applicationStartAt: "2026-11-07T00:00:00+09:00", applicationEndAt: "2026-11-27T23:59:00+09:00",
  }, "https://join.unframe.kr/opencall");
  assert.equal(meta.title, "All I Want For Christmas Is Art | UNFRAME 오픈콜");
  assert.match(meta.description, /접수 11\.7 — 11\.27 /);
  assert.equal(buildOpenCallShareMeta({ title: "《X》 OPEN CALL" }, "u").title, "《X》 OPEN CALL | UNFRAME", "제목에 이미 오픈콜이 있으면 반복하지 않는다");
  assert.ok(!meta.description.includes("잔상"), "기본값에 남은 예전 부제는 쓰지 않는다");
  assert.equal(meta.image, "https://pub.example.r2.dev/open-call/posters/p.png");
  assert.equal(buildOpenCallShareMeta({ title: "포스터 없음" }, "u").image, DEFAULT_SHARE_IMAGE);
  assert.equal(buildOpenCallShareMeta(null, "u"), null);
});

test("index.html의 미리보기 태그를 공고 내용으로 바꾸고, 따옴표는 안전하게 넣는다", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const meta = { title: 'A "quoted" <title>', description: "설명", image: "https://x/p.png", url: "https://join.unframe.kr/opencall" };
  const out = injectShareMeta(html, meta);
  assert.match(out, /<meta property="og:title" content="A &quot;quoted&quot; &lt;title&gt;"/);
  assert.match(out, /<meta property="og:image" content="https:\/\/x\/p.png"/);
  assert.match(out, /<meta name="twitter:image" content="https:\/\/x\/p.png"/);
  assert.match(out, /<meta property="og:url" content="https:\/\/join.unframe.kr\/opencall"/);
  assert.match(out, /<title>A &quot;quoted&quot; &lt;title&gt;<\/title>/);
  assert.equal(injectShareMeta(html, null), html);
});

import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const ROOT = "artifacts/unframe-join/public/data";
const OPEN_CALLS = `${ROOT}/openCalls`;
const SALONS = `${ROOT}/salonEvents`;
const APPLICATIONS = `${ROOT}/applications`;
const tokens = {
  admin: { uid: "admin", email: "gallerykuns@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  owner: { uid: "owner", email: "owner@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
};

let store;
let requests;
let solapiResponse;

const docRef = (path, id) => ({
  path,
  id,
  get: async () => ({ id, exists: Boolean(store[path]?.[id]), data: () => store[path]?.[id] }),
  set: async (data) => { (store[path] ||= {})[id] = data; },
  update: async (data) => { store[path][id] = { ...store[path][id], ...data }; },
});
const fakeDb = {
  collection: (path) => ({ doc: (id) => docRef(path, id ?? "auto") }),
  runTransaction: (callback) => callback({ get: (ref) => ref.get(), set: (ref, data) => ref.set(data) }),
};

mock.module("../netlify/functions/_lib/firebaseDatabase.mjs", { namedExports: { adminApp: {}, adminDb: fakeDb } });
mock.module("firebase-admin/auth", {
  namedExports: {
    getAuth: () => ({
      verifyIdToken: async (token) => {
        if (!tokens[token]) throw new Error("bad token");
        return tokens[token];
      },
    }),
  },
});

const { handler } = await import("../netlify/functions/send-test-notification.mjs");

const send = async (body, token = "admin") => {
  const result = await handler({
    httpMethod: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: "tester@example.com", phone: "010-9999-8888", ...body }),
  });
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};
const mails = () => requests.filter((request) => request.url.includes("resend")).map((request) => request.body);
const kakaos = () => requests.filter((request) => request.url.includes("solapi")).map((request) => request.body.message);
const byAudience = (body, audience, channel) => body.sends.find((item) => item.audience === audience && item.channel === channel);

beforeEach(() => {
  requests = [];
  solapiResponse = () => new Response(JSON.stringify({ messageId: "m" }), { status: 200 });
  Object.assign(process.env, {
    RESEND_API_KEY: "r", MAIL_FROM: "UNFRAME <hello@unframe.kr>", MAIL_TO_ADMIN: "real-admin@unframe.kr",
    SOLAPI_API_KEY: "k", SOLAPI_API_SECRET: "s", URL: "https://join.unframe.kr",
  });
  store = {
    [OPEN_CALLS]: {
      "call-1": {
        title: "크리스마스 공고", subtitle: "부제",
        applicationEndAt: "2026-11-27T14:59:00.000Z", announcementAt: "2026-12-01T01:00:00.000Z",
        notificationSettings: { applicantEmailSubject: "접수: {{openCallTitle}}", adminEmailSubject: "새 지원: {{openCallTitle}}" },
      },
      quiet: { title: "조용한 공고", notificationSettings: { kakaoEnabled: false, applicantEmailEnabled: false } },
    },
    [SALONS]: {
      "salon-1": {
        title: "연말 살롱", eventStartAt: "2026-12-20T10:00:00.000Z", venueName: "108호",
        notificationSettings: { approvalTemplateId: "TPL_APPROVAL", welcomeTemplateId: "TPL_WELCOME" },
      },
      off: { title: "꺼진 살롱", notificationSettings: { approvalEnabled: false, approvalTemplateId: "TPL" } },
      none: { title: "템플릿 없는 살롱", notificationSettings: {} },
    },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return String(url).includes("solapi") ? solapiResponse() : new Response(JSON.stringify({ id: "mail" }), { status: 200 });
  };
});

test("관리자만 쓸 수 있다", async () => {
  assert.equal((await send({ scenario: "rental-received" }, "owner")).statusCode, 403);
  assert.equal(requests.length, 0);
});

test("받을 곳과 시나리오를 확인한다", async () => {
  assert.equal((await send({ scenario: "unknown" })).statusCode, 400);
  assert.equal((await send({ scenario: "rental-received", email: "", phone: "" })).statusCode, 400);
  assert.equal((await send({ scenario: "rental-received", email: "bad", phone: "" })).statusCode, 400);
  assert.equal((await send({ scenario: "rental-received", email: "", phone: "123" })).statusCode, 400);
  assert.equal((await send({ scenario: "open-call-received", openCallId: "missing" })).statusCode, 404);
  assert.equal((await send({ scenario: "salon-approval", salonId: "missing" })).statusCode, 404);
});

test("대관: 운영자 메일은 실제 운영자가 아니라 입력한 주소로, 알림톡은 실제 템플릿으로 간다", async () => {
  const { statusCode, body } = await send({ scenario: "rental-received" });
  assert.equal(statusCode, 200);

  assert.deepEqual(mails()[0].to, ["tester@example.com"]);
  assert.ok(!JSON.stringify(mails()).includes("real-admin@unframe.kr"));
  assert.match(mails()[0].subject, /대관 문의/);
  assert.equal(kakaos()[0].to, "01099998888");
  assert.equal(kakaos()[0].kakaoOptions.templateId, "KA01TP260325034339068F1cDumvabAJ");

  assert.equal(byAudience(body, "운영자", "메일").status, "sent");
  assert.match(byAudience(body, "운영자", "메일").subject, /대관 문의/);
  const kakao = byAudience(body, "문의자", "알림톡");
  assert.equal(kakao.status, "sent");
  assert.equal(kakao.templateId, "KA01TP260325034339068F1cDumvabAJ");
  assert.equal(kakao.variables["#{program_name}"], "전시");
  assert.deepEqual(store[APPLICATIONS], undefined);
});

test("협업: 일정은 협의 후 결정으로 나간다", async () => {
  const { body } = await send({ scenario: "collaboration-received" });
  assert.match(mails()[0].subject, /협업 제안/);
  assert.equal(byAudience(body, "문의자", "알림톡").variables["#{selected_date}"], "협의 후 결정");
});

test("오픈콜: 고른 공고의 설정과 일정으로 세 가지를 보낸다", async () => {
  const { body } = await send({ scenario: "open-call-received", openCallId: "call-1" });
  assert.equal(body.sends.length, 3);
  assert.equal(mails().length, 2);
  assert.ok(mails().every((mail) => mail.to[0] === "tester@example.com"));
  assert.equal(mails()[0].subject, "접수: 크리스마스 공고");
  assert.equal(mails()[1].subject, "새 지원: 크리스마스 공고");

  const kakao = byAudience(body, "지원자", "알림톡");
  assert.equal(kakao.templateId, "KA01TP261106065800163RqIuHqhyOOW");
  assert.equal(kakao.variables["#{공모명}"], "크리스마스 공고");
  assert.equal(kakao.variables["#{모집마감일}"], "2026년 11월 27일");
  assert.equal(kakao.variables["#{결과발표일}"], "2026년 12월 1일");
});

test("오픈콜: 공고에서 꺼 둔 채널은 실제처럼 보내지 않고 알려 준다", async () => {
  const { body } = await send({ scenario: "open-call-received", openCallId: "quiet" });
  assert.equal(byAudience(body, "지원자", "알림톡").status, "skipped");
  assert.equal(byAudience(body, "지원자", "메일").status, "skipped");
  assert.equal(kakaos().length, 0);
  assert.equal(byAudience(body, "운영자", "메일").status, "sent");
});

test("SALON: 승인·입장 알림톡을 고른 SALON의 템플릿으로 보낸다", async () => {
  const approval = await send({ scenario: "salon-approval", salonId: "salon-1" });
  const sent = byAudience(approval.body, "참가자", "알림톡");
  assert.equal(sent.status, "sent");
  assert.equal(sent.templateId, "TPL_APPROVAL");
  assert.equal(sent.variables["#{salonTitle}"], "연말 살롱");
  assert.equal("{{salonTitle}}" in sent.variables, false);

  const welcome = await send({ scenario: "salon-welcome", salonId: "salon-1" });
  assert.equal(byAudience(welcome.body, "참가자", "알림톡").templateId, "TPL_WELCOME");
});

test("SALON: 꺼 둔 알림과 템플릿이 없는 경우를 구분해 알려 준다", async () => {
  assert.equal(byAudience((await send({ scenario: "salon-approval", salonId: "off" })).body, "참가자", "알림톡").status, "skipped");
  const missing = byAudience((await send({ scenario: "salon-approval", salonId: "none" })).body, "참가자", "알림톡");
  assert.equal(missing.status, "failed");
  assert.match(missing.error, /템플릿/);
  assert.equal(kakaos().length, 0);
});

test("입력하지 않은 수신처는 건너뛰고, 발송 실패는 사유를 돌려준다", async () => {
  const noPhone = await send({ scenario: "rental-received", phone: "" });
  assert.equal(byAudience(noPhone.body, "문의자", "알림톡").status, "skipped");
  assert.equal(kakaos().length, 0);

  solapiResponse = () => new Response(JSON.stringify({ errorMessage: "템플릿 불일치" }), { status: 400 });
  const failed = await send({ scenario: "rental-received" });
  assert.equal(failed.statusCode, 200);
  assert.equal(byAudience(failed.body, "문의자", "알림톡").status, "failed");
  assert.match(byAudience(failed.body, "문의자", "알림톡").error, /템플릿 불일치/);
});

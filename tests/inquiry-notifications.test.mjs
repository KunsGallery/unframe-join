import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const APPLICATIONS = "artifacts/unframe-join/public/data/applications";
const tokens = {
  owner: { uid: "owner", email: "owner@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
};

let store;
let autoId = 0;
let sent;
let resendResponse;

const write = (path, id, data) => { (store[path] ||= {})[id] = data; };
const docRef = (path, id) => ({
  path,
  id,
  get: async () => ({ id, exists: Boolean(store[path]?.[id]), data: () => store[path]?.[id] }),
  set: async (data) => write(path, id, data),
  update: async (data) => write(path, id, { ...store[path][id], ...data }),
});
const fakeDb = {
  collection: (path) => ({ doc: (id) => docRef(path, id ?? `auto-${(autoId += 1)}`) }),
  runTransaction: (callback) => callback({
    get: (ref) => ref.get(),
    set: (ref, data) => write(ref.path, ref.id, data),
  }),
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

const { handler: submit } = await import("../netlify/functions/submit-application.mjs");

const post = (body) => submit({
  httpMethod: "POST",
  headers: { authorization: "Bearer owner" },
  body: JSON.stringify(body),
});
const saved = () => Object.values(store[APPLICATIONS] || {})[0];

const rental = (overrides = {}) => ({
  trackType: "rental",
  title: "봄 팝업 전시",
  organization: "스튜디오 봄",
  name: "김담당",
  phone: "010-1111-2222",
  email: "contact@example.com",
  purpose: "전시",
  date: "2027-03-02",
  hours: "2주",
  attendees: "하루 50명",
  budget: "300만원 내외",
  plan: "공간 활용 계획입니다",
  equipment: "프로젝터 1대",
  privacyAgreed: true,
  ...overrides,
});
const collaboration = (overrides = {}) => ({
  trackType: "collaboration",
  title: "브랜드 협업 제안",
  organization: "브랜드 팀",
  name: "이담당",
  phone: "01033334444",
  email: "brand@example.com",
  category: "공동 기획",
  idea: "협업 아이디어입니다",
  privacyAgreed: true,
  ...overrides,
});

beforeEach(() => {
  autoId = 0;
  store = {};
  sent = [];
  resendResponse = () => new Response(JSON.stringify({ id: "mail-1" }), { status: 200 });
  process.env.RESEND_API_KEY = "resend-key";
  process.env.MAIL_FROM = "UNFRAME <hello@unframe.kr>";
  process.env.MAIL_TO_ADMIN = "first@unframe.kr, second@unframe.kr";
  process.env.URL = "https://join.unframe.kr";
  globalThis.fetch = async (url, options) => {
    sent.push({ url: String(url), options, body: JSON.parse(options.body) });
    return resendResponse();
  };
});

test("대관 문의가 저장되면 관리자 전원에게 문의 내용을 담은 메일이 한 통 간다", async () => {
  const result = await post(rental());

  assert.equal(result.statusCode, 201);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.deepEqual(sent[0].body.to, ["first@unframe.kr", "second@unframe.kr"]);
  assert.match(sent[0].body.subject, /대관 문의/);
  assert.match(sent[0].body.subject, /봄 팝업 전시/);
  for (const value of ["스튜디오 봄", "김담당", "01011112222", "contact@example.com", "2027-03-02", "공간 활용 계획입니다", "프로젝터 1대"]) {
    assert.ok(sent[0].body.html.includes(value), `메일 본문에 ${value} 없음`);
  }
  assert.ok(sent[0].body.html.includes("https://join.unframe.kr/?view=admin"));
  assert.ok(sent[0].body.reply_to === "contact@example.com");
  assert.ok(saved().adminNotifiedAt instanceof Date);
});

test("협업 제안도 같은 방식으로 알린다", async () => {
  assert.equal((await post(collaboration({ referenceUrl: "https://example.com/deck" }))).statusCode, 201);

  assert.equal(sent.length, 1);
  assert.match(sent[0].body.subject, /협업 제안/);
  for (const value of ["브랜드 팀", "공동 기획", "협업 아이디어입니다", "https://example.com/deck"]) {
    assert.ok(sent[0].body.html.includes(value), `메일 본문에 ${value} 없음`);
  }
});

test("신청자가 쓴 내용은 HTML로 해석되지 않고 제목은 한 줄이다", async () => {
  await post(rental({ title: "제목\r\nBcc: evil@example.com", plan: "<img src=x onerror=alert(1)>" }));

  assert.ok(!sent[0].body.html.includes("<img src=x"));
  assert.ok(sent[0].body.html.includes("&lt;img src=x"));
  assert.ok(!/[\r\n]/.test(sent[0].body.subject));
});

test("메일 서비스가 실패해도 접수는 성공하고 실패가 기록된다", async () => {
  resendResponse = () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 });

  const result = await post(rental());

  assert.equal(result.statusCode, 201);
  assert.equal(saved().title, "봄 팝업 전시");
  assert.equal(saved().adminNotifiedAt, undefined);
  assert.ok(saved().adminNotifyError);
});

test("메일 요청이 예외를 던져도 접수는 성공한다", async () => {
  globalThis.fetch = async () => { throw new Error("network down"); };

  assert.equal((await post(rental())).statusCode, 201);
  assert.ok(saved().adminNotifyError);
});

test("메일 설정이 없으면 보내지 않고 접수는 성공하며 실패가 기록된다", async () => {
  delete process.env.MAIL_TO_ADMIN;

  assert.equal((await post(rental())).statusCode, 201);
  assert.equal(sent.length, 0);
  assert.ok(saved().adminNotifyError);
});

test("메일 요청은 시간 제한을 둔다", async () => {
  await post(rental());
  assert.ok(sent[0].options.signal instanceof AbortSignal);
});

test("검증에 실패한 문의는 메일을 보내지 않는다", async () => {
  assert.equal((await post(rental({ plan: "" }))).statusCode, 400);
  assert.equal(sent.length, 0);
});

test("오픈콜은 기존 접수 알림 흐름을 쓰므로 여기서 보내지 않는다", async () => {
  store["artifacts/unframe-join/public/data/openCalls"] = {
    "call-1": { title: "공고", isVisible: true, status: "open", formSettings: { customFields: [] } },
  };
  process.env.R2_PUBLIC_BASE_URL = "https://files.unframe.kr";
  const result = await post({
    trackType: "open-call",
    openCallId: "call-1",
    name: "지원자",
    phone: "01011112222",
    email: "a@example.com",
    birthYear: "1990",
    addressMain: "서울시",
    medium: "회화",
    snsLink: "@artist",
    artistStatement: "작업 소개",
    works: [{ imageUrl: "https://files.unframe.kr/open-call/works/2026/11/owner/a.jpg", title: "제목", material: "재료", size: "10x10", year: "2026" }],
    portfolioUrl: "https://files.unframe.kr/open-call/portfolio/2026/11/owner/p.pdf",
    privacyAgreed: true,
  });

  assert.equal(result.statusCode, 201);
  assert.equal(sent.length, 0);
  assert.equal(saved().adminNotifiedAt, undefined);
  assert.equal(saved().adminNotifyError, undefined);
});

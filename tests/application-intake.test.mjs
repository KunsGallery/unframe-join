import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const ROOT = "artifacts/unframe-join";
const APPLICATIONS = `${ROOT}/public/data/applications`;
const OPEN_CALLS = `${ROOT}/public/data/openCalls`;
const SALON_PRIVATE = `${ROOT}/admin/data/salonPrivate`;
const BASE = "https://files.unframe.kr";

const tokens = {
  owner: { uid: "owner", email: "owner@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  anonymous: { uid: "anon", firebase: { sign_in_provider: "anonymous" } },
  admin: { uid: "admin", email: "gallerykuns@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
};

let store;
let autoId = 0;

const snapshot = (path, id) => {
  const data = store[path]?.[id];
  return { id, exists: Boolean(data), data: () => data };
};
const write = (path, id, data) => { (store[path] ||= {})[id] = data; };
const docRef = (path, id) => ({
  path,
  id,
  get: async () => snapshot(path, id),
  set: async (data) => write(path, id, data),
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
const { handler: sign } = await import("../netlify/functions/r2-sign-upload.mjs");
const { handler: searchMusic } = await import("../netlify/functions/search-youtube-music.mjs");
const { sendSalonAlimtalk } = await import("../netlify/functions/_lib/salonShared.mjs");

const post = (handler, body, token = "owner") => handler({
  httpMethod: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});
const onlyApplication = () => Object.values(store[APPLICATIONS] || {})[0];

const openCallBody = (overrides = {}) => ({
  trackType: "open-call",
  openCallId: "call-1",
  name: "지원자",
  phone: "010-1111-2222",
  email: "artist@example.com",
  birthYear: "1990",
  addressMain: "서울시",
  medium: "회화",
  snsLink: "@artist",
  artistStatement: "작업 소개",
  works: [{ imageUrl: `${BASE}/open-call/works/2026/11/owner/a.jpg`, title: "제목", material: "재료", size: "10x10", year: "2026" }],
  portfolioUrl: `${BASE}/open-call/portfolio/2026/11/owner/p.pdf`,
  privacyAgreed: true,
  customFieldAnswers: {},
  ...overrides,
});
const rentalBody = (overrides = {}) => ({
  trackType: "rental", title: "팝업", name: "담당", phone: "01011112222", email: "a@example.com",
  purpose: "전시", plan: "계획", privacyAgreed: true, ...overrides,
});
const collaborationBody = (overrides = {}) => ({
  trackType: "collaboration", title: "제안", name: "담당", phone: "01011112222", email: "a@example.com",
  category: "공동 기획", idea: "아이디어", privacyAgreed: true, ...overrides,
});

beforeEach(() => {
  autoId = 0;
  process.env.R2_PUBLIC_BASE_URL = BASE;
  process.env.R2_ACCOUNT_ID = "dummy";
  process.env.R2_ACCESS_KEY_ID = "dummy";
  process.env.R2_SECRET_ACCESS_KEY = "dummy";
  process.env.R2_BUCKET_NAME = "bucket";
  process.env.YOUTUBE_API_KEY = "yt";
  store = {
    [OPEN_CALLS]: {
      "call-1": {
        title: "공고", status: "open", isVisible: true,
        formSettings: {
          customFields: [
            { id: "q1", label: "서버 질문", type: "text", required: true, maxLength: 10 },
            { id: "off", label: "꺼진 질문", type: "text", enabled: false },
          ],
        },
      },
      draft: { title: "초안", status: "draft" },
      hidden: { title: "숨김", status: "open", isVisible: false },
      ended: { title: "마감", status: "open", applicationEndAt: "2000-01-01" },
    },
  };
});

const withQ1 = (overrides = {}) => openCallBody({ customFieldAnswers: { q1: { value: "답변" } }, ...overrides });

test("오픈콜: 정상 지원은 서버가 초기 상태와 소유자를 정해 저장한다", async () => {
  const result = await post(submit, withQ1({ status: "approved", userId: "victim", openCallAdminMemo: "x", receivedEmailClaimedAt: "y" }));
  assert.equal(result.statusCode, 201);
  assert.ok(JSON.parse(result.body).applicationId);
  const saved = onlyApplication();
  assert.equal(saved.status, "review");
  assert.equal(saved.userId, "owner");
  assert.equal(saved.trackType, "open-call");
  assert.equal(saved.openCallTitle, "공고");
  assert.equal(saved.phone, "01011112222");
  assert.equal(saved.privacyAgreed, true);
  assert.ok(saved.submittedAt instanceof Date);
  assert.equal("openCallAdminMemo" in saved, false);
  assert.equal("receivedEmailClaimedAt" in saved, false);
});

test("오픈콜: 비공개·초안·마감·없는 공고에는 지원할 수 없다", async () => {
  for (const openCallId of ["draft", "hidden", "ended"]) {
    assert.equal((await post(submit, withQ1({ openCallId }))).statusCode, 409, openCallId);
  }
  assert.equal((await post(submit, withQ1({ openCallId: "nope" }))).statusCode, 404);
  assert.equal(store[APPLICATIONS], undefined);
});

test("오픈콜: 필수 항목·동의·형식을 서버에서 검증한다", async () => {
  const cases = [
    { privacyAgreed: false },
    { name: " " },
    { phone: "123" },
    { email: "not-an-email" },
    { birthYear: "90" },
    { addressMain: "" },
    { artistStatement: "" },
    { portfolioUrl: "" },
    { works: [] },
    { customFieldAnswers: {} },
    { customFieldAnswers: { q1: { value: "12345678901" } } },
  ];
  for (const overrides of cases) {
    const result = await post(submit, withQ1(overrides));
    assert.equal(result.statusCode, 400, JSON.stringify(overrides));
  }
  assert.equal(store[APPLICATIONS], undefined);
});

test("오픈콜: 파일 URL은 우리 저장소의 오픈콜 경로만 허용한다", async () => {
  const urls = ["https://evil.example/a.jpg", "javascript:alert(1)", `${BASE}/documents/a.pdf`, `http://files.unframe.kr/open-call/portfolio/a.pdf`];
  for (const portfolioUrl of urls) {
    assert.equal((await post(submit, withQ1({ portfolioUrl }))).statusCode, 400, portfolioUrl);
  }
  const works = [{ imageUrl: "https://evil.example/a.jpg", title: "t", material: "m", size: "s", year: "y" }];
  assert.equal((await post(submit, withQ1({ works }))).statusCode, 400);
});

test("오픈콜: 답변은 공고에 정의된 문항으로만 저장되고 라벨은 서버 값을 쓴다", async () => {
  await post(submit, withQ1({
    customFieldAnswers: { q1: { value: "답변", label: "FORGED" }, injected: { value: "x", label: "y" }, off: { value: "z" } },
  }));
  const answers = onlyApplication().customFieldAnswers;
  assert.deepEqual(Object.keys(answers), ["q1"]);
  assert.equal(answers.q1.label, "서버 질문");
});

test("긴 입력과 많은 작품은 잘라 저장하지 않고 거부하거나 상한을 둔다", async () => {
  assert.equal((await post(submit, withQ1({ name: "가".repeat(101) }))).statusCode, 400);
  assert.equal((await post(submit, rentalBody({ plan: "x".repeat(900000) }))).statusCode, 400);
  const work = openCallBody().works[0];
  await post(submit, withQ1({ works: [work, work, work, work, work] }));
  assert.equal(onlyApplication().works.length, 3);
});

test("대관: 허용 필드만 저장하고 문의 유형을 서버가 정한다", async () => {
  const result = await post(submit, rentalBody({ status: "approved", openCallAdminMemo: "x", junk: "y", inquiryType: "forged" }));
  assert.equal(result.statusCode, 201);
  const saved = onlyApplication();
  assert.equal(saved.status, "review");
  assert.equal(saved.inquiryType, "space-rental");
  assert.equal(saved.realName, "담당");
  assert.equal(saved.applicantEmail, "a@example.com");
  assert.equal("junk" in saved, false);
  assert.equal("openCallAdminMemo" in saved, false);
});

test("대관·협업: 이메일을 비우면 로그인 이메일을 쓴다", async () => {
  await post(submit, rentalBody({ email: "" }));
  assert.equal(onlyApplication().applicantEmail, "owner@gmail.com");
});

test("협업: 필수 항목과 참고 링크 형식을 검증한다", async () => {
  assert.equal((await post(submit, collaborationBody())).statusCode, 201);
  store[APPLICATIONS] = {};
  assert.equal((await post(submit, collaborationBody({ idea: "" }))).statusCode, 400);
  assert.equal((await post(submit, collaborationBody({ referenceUrl: "javascript:alert(1)" }))).statusCode, 400);
  assert.equal((await post(submit, collaborationBody({ privacyAgreed: false }))).statusCode, 400);
  assert.deepEqual(store[APPLICATIONS], {});
});

test("접수: 알 수 없는 유형·SALON·익명·비로그인을 거부한다", async () => {
  assert.equal((await post(submit, { trackType: "salon" })).statusCode, 400);
  assert.equal((await post(submit, { trackType: "other" })).statusCode, 400);
  assert.equal((await post(submit, rentalBody(), "anonymous")).statusCode, 403);
  assert.equal((await post(submit, rentalBody(), "bad")).statusCode, 401);
});

test("접수: 사용자당 시간당 5건을 넘으면 429", async () => {
  for (let i = 0; i < 5; i += 1) assert.equal((await post(submit, rentalBody())).statusCode, 201);
  assert.equal((await post(submit, rentalBody())).statusCode, 429);
});

const signBody = (overrides = {}) => ({ fileName: "work.png", contentType: "image/png", fileSize: 1000, folder: "open-call/works", ...overrides });

test("업로드: 서명에 content-type이 포함된다", async () => {
  const result = await post(sign, signBody());
  assert.equal(result.statusCode, 200);
  const url = new URL(JSON.parse(result.body).signedUrl);
  assert.ok(url.searchParams.get("X-Amz-SignedHeaders").split(";").includes("content-type"));
});

test("업로드: 확장자가 형식과 다르면 거부한다", async () => {
  for (const fileName of ["evil.html", "evil.svg", "evil.png.html", "noextension"]) {
    assert.equal((await post(sign, signBody({ fileName }))).statusCode, 400, fileName);
  }
  assert.equal((await post(sign, signBody({ fileName: "a.PNG" }))).statusCode, 200);
  assert.equal((await post(sign, signBody({ fileName: "a.pdf", contentType: "application/pdf" }))).statusCode, 200);
});

test("업로드: 사용자당 빈도 제한을 넘으면 429, 관리자 업로드는 제외", async () => {
  for (let i = 0; i < 60; i += 1) assert.equal((await post(sign, signBody())).statusCode, 200);
  assert.equal((await post(sign, signBody())).statusCode, 429);
  assert.equal((await post(sign, signBody({ isAdminUpload: true }), "admin")).statusCode, 200);
});

test("YouTube 검색: 로그인이 필요하고 빈도 제한이 있다", async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) });
  const search = (token) => searchMusic({
    httpMethod: "GET",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    queryStringParameters: { q: "노래" },
  });
  assert.equal((await search()).statusCode, 401);
  assert.equal((await search("anonymous")).statusCode, 403);
  for (let i = 0; i < 30; i += 1) assert.equal((await search("owner")).statusCode, 200);
  assert.equal((await search("owner")).statusCode, 429);
});

test("SALON 알림: 오픈채팅 코드는 비공개 문서에서 읽는다", async () => {
  process.env.SOLAPI_API_KEY = "k";
  process.env.SOLAPI_API_SECRET = "s";
  let variables;
  globalThis.fetch = async (_url, init) => {
    variables = JSON.parse(init.body).message.kakaoOptions.variables;
    return { ok: true, status: 200, text: async () => "{}" };
  };
  const send = () => sendSalonAlimtalk({
    kind: "approval",
    application: { salonId: "s1", phone: "01011112222" },
    salon: { groupChatUrl: "https://open.kakao.com/o/legacy", notificationSettings: { approvalTemplateId: "t" } },
  });

  await send();
  assert.equal(variables["#{openChatCode}"], "legacy");

  store[SALON_PRIVATE] = { s1: { groupChatUrl: "https://open.kakao.com/o/private" } };
  await send();
  assert.equal(variables["#{openChatCode}"], "private");
});

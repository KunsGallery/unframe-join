import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const APPLICATIONS = "artifacts/unframe-join/public/data/applications";
const OPEN_CALLS = "artifacts/unframe-join/public/data/openCalls";

const tokens = {
  owner: { uid: "owner", email: "owner@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  admin: { uid: "admin", email: "gallerykuns@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  unverifiedAdmin: { uid: "x", email: "gallerykuns@gmail.com", email_verified: false, firebase: { sign_in_provider: "google.com" } },
  passwordAdmin: { uid: "y", email: "gallerykuns@gmail.com", email_verified: true, firebase: { sign_in_provider: "password" } },
};

let store;

const docRef = (path, id) => ({
  path,
  id,
  get: async () => snapshot(path, id),
  update: async (patch) => { Object.assign(store[path][id], patch); },
});
function snapshot(path, id) {
  const data = store[path]?.[id];
  return { id, exists: Boolean(data), data: () => data, ref: docRef(path, id) };
}
const fakeDb = {
  collection: (path) => ({
    doc: (id) => docRef(path, id),
    where: (field, _op, value) => ({
      get: async () => ({
        docs: Object.keys(store[path] || {})
          .filter((id) => store[path][id][field] === value)
          .map((id) => snapshot(path, id)),
      }),
    }),
  }),
  runTransaction: (callback) => callback({
    get: (target) => target.get(),
    update: (ref, patch) => { Object.assign(store[ref.path][ref.id], patch); },
  }),
};

mock.module("../netlify/functions/_lib/firebaseDatabase.mjs", {
  namedExports: { adminApp: {}, adminDb: fakeDb },
});
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

const { verifyAdminRequest } = await import("../netlify/functions/_lib/firebaseAdmin.mjs");
const { handler: sendEmails } = await import("../netlify/functions/send-application-emails.mjs");
const { handler: sendKakao } = await import("../netlify/functions/send-kakao-alimtalk.mjs");

let requests;

const call = (handler, body, token = "owner") => handler({
  httpMethod: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});
const mails = () => requests.filter((r) => r.url.includes("resend")).map((r) => r.body);
const kakaos = () => requests.filter((r) => r.url.includes("solapi")).map((r) => r.body.message);

beforeEach(() => {
  process.env.RESEND_API_KEY = "test";
  process.env.MAIL_FROM = "from@unframe.kr";
  process.env.MAIL_TO_ADMIN = "staff@unframe.kr";
  process.env.SOLAPI_API_KEY = "test";
  process.env.SOLAPI_API_SECRET = "test";
  requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(init.body) });
    return { ok: true, status: 200, text: async () => "{}" };
  };
  store = {
    [APPLICATIONS]: {
      mine: {
        trackType: "open-call", openCallId: "call-1", userId: "owner", status: "review",
        name: "지원자", phone: "01011112222", email: "typed@example.com", applicantEmail: "typed@example.com",
      },
      other: { trackType: "open-call", openCallId: "call-1", userId: "someone", name: "타인", phone: "01033334444" },
      rental: { trackType: "rental", userId: "owner", name: "대관", phone: "01055556666" },
      orphan: { trackType: "open-call", openCallId: "missing", userId: "owner", name: "유령", phone: "01077778888" },
    },
    [OPEN_CALLS]: {
      "call-1": {
        title: "서버 공고", subtitle: "서버 부제",
        notificationSettings: { applicantEmailSubject: "접수: {{openCallTitle}}", kakaoMessage: "{{name}}님 {{openCallTitle}}" },
      },
    },
  };
});

const addOwnedApplications = (count, field) => {
  for (let i = 0; i < count; i += 1) {
    store[APPLICATIONS][`sent-${i}`] = {
      trackType: "open-call", openCallId: "call-1", userId: "owner", [field]: new Date(),
    };
  }
};

test("verifyAdminRequest: 인증된 Google 관리자만 통과", async () => {
  const request = (token) => ({ headers: { authorization: `Bearer ${token}` } });
  assert.equal((await verifyAdminRequest(request("admin"))).uid, "admin");
  await assert.rejects(verifyAdminRequest(request("unverifiedAdmin")), { statusCode: 403 });
  await assert.rejects(verifyAdminRequest(request("passwordAdmin")), { statusCode: 403 });
  await assert.rejects(verifyAdminRequest(request("owner")), { statusCode: 403 });
});

test("메일: applicationId만으로 발송된다 (클라이언트 헬퍼 버그 회귀)", async () => {
  const result = await call(sendEmails, { applicationId: "mine" });
  assert.equal(result.statusCode, 200);
  assert.equal(mails().length, 2);
});

test("메일: 요청 본문의 수신자·제목·본문·링크를 무시한다", async () => {
  await call(sendEmails, {
    applicationId: "mine",
    applicantEmail: "victim@example.com",
    applicantName: "FORGED_NAME",
    exhibitionTitle: "FORGED_TITLE",
    applicantEmailSubject: "FORGED_SUBJECT",
    applicantEmailBody: "FORGED_BODY",
    applicationDetailUrl: "https://evil.example/FORGED_LINK",
  });
  const serialized = JSON.stringify(mails());
  assert.equal(serialized.includes("FORGED"), false);
  assert.equal(serialized.includes("victim@example.com"), false);
  const applicantMail = mails().find((mail) => mail.to.includes("owner@gmail.com"));
  assert.equal(applicantMail.subject, "접수: 서버 공고");
  assert.ok(mails().some((mail) => mail.to.includes("staff@unframe.kr")));
});

test("메일: 지원자 메일은 문서에 입력한 주소가 아니라 인증된 로그인 이메일로만 간다", async () => {
  await call(sendEmails, { applicationId: "mine" });
  assert.ok(mails().some((mail) => mail.to.includes("owner@gmail.com")));
  assert.equal(mails().some((mail) => mail.to.includes("typed@example.com")), false);
});

test("메일: 일반 사용자의 adminTest는 거부된다", async () => {
  const result = await call(sendEmails, { adminTest: true, applicantEmail: "victim@example.com" });
  assert.equal(result.statusCode, 403);
  assert.equal(mails().length, 0);
});

test("메일: 관리자 테스트 발송은 유지된다", async () => {
  const result = await call(sendEmails, { adminTest: true, applicantEmail: "me@example.com", sendAdminEmail: false }, "admin");
  assert.equal(result.statusCode, 200);
  assert.deepEqual(mails()[0].to, ["me@example.com"]);
});

test("메일: 같은 신청으로 두 번 호출해도 한 번만 발송된다", async () => {
  await call(sendEmails, { applicationId: "mine" });
  const second = await call(sendEmails, { applicationId: "mine" });
  assert.equal(second.statusCode, 200);
  assert.equal(JSON.parse(second.body).duplicate, true);
  assert.equal(mails().length, 2);
});

test("메일: 타인 신청·오픈콜 외 신청·없는 공고는 발송하지 않는다", async () => {
  assert.equal((await call(sendEmails, { applicationId: "other" })).statusCode, 403);
  assert.equal((await call(sendEmails, { applicationId: "rental" })).statusCode, 403);
  assert.equal((await call(sendEmails, { applicationId: "orphan" })).statusCode, 404);
  assert.equal((await call(sendEmails, { applicationId: "nope" })).statusCode, 404);
  assert.equal((await call(sendEmails, {})).statusCode, 400);
  assert.equal(mails().length, 0);
});

test("메일: 공고 설정으로 꺼 둔 수신자에게는 보내지 않는다 (요청 값으로 켤 수 없음)", async () => {
  store[OPEN_CALLS]["call-1"].notificationSettings = { applicantEmailEnabled: false, adminEmailEnabled: true };
  const result = await call(sendEmails, { applicationId: "mine", sendApplicantEmail: true });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(mails().map((mail) => mail.to), [["staff@unframe.kr"]]);
});

test("메일: 사용자당 하루 발송 한도를 넘으면 429", async () => {
  addOwnedApplications(3, "receivedEmailClaimedAt");
  const result = await call(sendEmails, { applicationId: "mine" });
  assert.equal(result.statusCode, 429);
  assert.equal(mails().length, 0);
});

test("메일: 발송 실패는 신청 문서에 기록된다", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => "{}" });
  const result = await call(sendEmails, { applicationId: "mine" });
  assert.equal(result.statusCode, 500);
  assert.ok(store[APPLICATIONS].mine.receivedEmailError);
});

test("알림톡: 수신번호와 내용은 서버 문서 기준이다", async () => {
  const result = await call(sendKakao, {
    type: "application_received",
    applicationId: "mine",
    to: "01099999999",
    applicantName: "FORGED_NAME",
    exhibitionTitle: "FORGED_TITLE",
    kakaoMessage: "FORGED_MESSAGE",
  });
  assert.equal(result.statusCode, 200);
  assert.equal(kakaos().length, 1);
  assert.equal(kakaos()[0].to, "01011112222");
  assert.equal(JSON.stringify(kakaos()).includes("FORGED"), false);
  assert.equal(kakaos()[0].kakaoOptions.variables["#{name}"], "지원자");
  assert.equal(kakaos()[0].kakaoOptions.variables["#{project_name}"], "서버 공고");
  assert.equal(kakaos()[0].kakaoOptions.variables["#{message}"], "지원자님 서버 공고");
});

test("알림톡: 같은 신청으로 두 번 호출해도 한 번만 발송된다", async () => {
  await call(sendKakao, { type: "application_received", applicationId: "mine" });
  const second = await call(sendKakao, { type: "application_received", applicationId: "mine" });
  assert.equal(JSON.parse(second.body).duplicate, true);
  assert.equal(kakaos().length, 1);
});

test("알림톡: 타인 신청·오픈콜 외 신청·꺼진 설정은 발송하지 않는다", async () => {
  assert.equal((await call(sendKakao, { type: "application_received", applicationId: "other" })).statusCode, 403);
  assert.equal((await call(sendKakao, { type: "application_received", applicationId: "rental" })).statusCode, 403);
  store[OPEN_CALLS]["call-1"].notificationSettings = { kakaoEnabled: false };
  const disabled = await call(sendKakao, { type: "application_received", applicationId: "mine" });
  assert.equal(JSON.parse(disabled.body).skipped, true);
  assert.equal(kakaos().length, 0);
});

test("알림톡: 사용자당 하루 발송 한도를 넘으면 429", async () => {
  addOwnedApplications(3, "receivedKakaoClaimedAt");
  const result = await call(sendKakao, { type: "application_received", applicationId: "mine" });
  assert.equal(result.statusCode, 429);
  assert.equal(kakaos().length, 0);
});

test("알림톡: 일반 사용자는 관리자용 유형과 adminTest를 쓸 수 없다", async () => {
  assert.equal((await call(sendKakao, { type: "approved", to: "01099999999", applicationId: "mine" })).statusCode, 403);
  assert.equal((await call(sendKakao, { type: "application_received", adminTest: true, to: "01099999999" })).statusCode, 403);
  assert.equal(kakaos().length, 0);
});

test("알림톡: 관리자 상태 알림은 유지된다", async () => {
  const result = await call(sendKakao, {
    type: "approved", to: "01012345678", applicantName: "지원자", exhibitionTitle: "전시",
    applicationId: "mine", applicationDetailUrl: "https://join.unframe.kr/x",
  }, "admin");
  assert.equal(result.statusCode, 200);
  assert.equal(kakaos()[0].to, "01012345678");
});

import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const ROOT = "artifacts/unframe-join";
const APPLICATIONS = `${ROOT}/public/data/applications`;
const OPEN_CALLS = `${ROOT}/public/data/openCalls`;
const NOTES = `${ROOT}/admin/data/applicationNotes`;
const BASE = "https://files.unframe.kr";

const tokens = {
  owner: { uid: "owner", email: "owner@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  admin: { uid: "admin", email: "gallerykuns@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
};

let store;
let deletedFiles;
let failFiles;

const docRef = (path, id) => ({
  id,
  path,
  get: async () => ({ id, exists: Boolean(store[path]?.[id]), data: () => store[path]?.[id] }),
  update: async (data) => { store[path][id] = { ...store[path][id], ...data }; },
});
const fakeDb = {
  collection: (path) => ({
    doc: (id) => docRef(path, id),
    where: (field, op, value) => ({
      get: async () => ({
        docs: Object.entries(store[path] || {})
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => ({ id, ref: docRef(path, id), data: () => data })),
      }),
    }),
  }),
  batch: () => {
    const ops = [];
    return { delete: (ref) => ops.push(ref), commit: async () => ops.forEach((ref) => { delete store[ref.path]?.[ref.id]; }) };
  },
};

mock.module("../netlify/functions/_lib/firebaseDatabase.mjs", { namedExports: { adminApp: {}, adminDb: fakeDb } });
mock.module("firebase-admin/auth", {
  namedExports: { getAuth: () => ({ verifyIdToken: async (token) => { if (!tokens[token]) throw new Error("bad"); return tokens[token]; } }) },
});
mock.module("../netlify/functions/_lib/r2.mjs", {
  namedExports: {
    r2Settings: () => ({}),
    deleteStoredFiles: async (values) => {
      if (failFiles) throw Object.assign(new Error("일부 파일을 지우지 못했습니다."), { statusCode: 502 });
      deletedFiles.push(...values);
      return values.length;
    },
  },
});

const { handler: purge } = await import("../netlify/functions/purge-open-call-applications.mjs");
const post = (body, token = "admin") => purge({ httpMethod: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) });

const app = (id, overrides = {}) => ({
  openCallId: "ended", name: id, phone: "01000000000",
  portfolioUrl: `r2-private://open-call/portfolio/2026/11/${id}/p.pdf`,
  works: [{ imageUrl: `${BASE}/open-call/works/2026/11/${id}/a.jpg` }, { imageUrl: `r2-private://open-call/works/2026/11/${id}/b.jpg` }],
  ...overrides,
});

beforeEach(() => {
  deletedFiles = [];
  failFiles = false;
  store = {
    [OPEN_CALLS]: {
      ended: { title: "연말 오픈콜", status: "open", applicationEndAt: "2000-01-01" },
      live: { title: "진행 중", status: "open" },
    },
    [APPLICATIONS]: {
      a1: app("a1"),
      a2: app("a2", { openCallReviewStatus: "selected" }),
      a3: app("a3", { openCallReviewStatus: "rejected" }),
      other: app("other", { openCallId: "live" }),
    },
    [NOTES]: { a1: { memo: "x" }, a2: { memo: "y" }, other: { memo: "z" } },
  };
});

test("파기: 관리자만, 접수가 끝난 공고만, 공고명을 정확히 입력해야 한다", async () => {
  assert.equal((await post({ openCallId: "ended", scope: "all", confirmTitle: "연말 오픈콜" }, "owner")).statusCode, 403);
  assert.equal((await post({ openCallId: "live", scope: "all", confirmTitle: "진행 중" })).statusCode, 409);
  assert.equal((await post({ openCallId: "ended", scope: "all", confirmTitle: "연말" })).statusCode, 400);
  assert.equal((await post({ openCallId: "ended", scope: "everything", confirmTitle: "연말 오픈콜" })).statusCode, 400);
  assert.equal((await post({ openCallId: "missing", scope: "all", confirmTitle: "x" })).statusCode, 404);
  assert.equal(Object.keys(store[APPLICATIONS]).length, 4, "거부된 요청은 아무것도 지우지 않는다");
});

test("파기: 미선정만 고르면 선정 작가와 다른 공고는 남기고, 파일·지원서·메모를 지운다", async () => {
  const result = await post({ openCallId: "ended", scope: "unselected", confirmTitle: " 연말 오픈콜 " });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: true, deleted: 2, files: 6, kept: 1 });
  assert.deepEqual(Object.keys(store[APPLICATIONS]).sort(), ["a2", "other"]);
  assert.deepEqual(Object.keys(store[NOTES]).sort(), ["a2", "other"]);
  assert.ok(deletedFiles.every((value) => /\/(a1|a3)\//.test(value)));
  const [record] = store[OPEN_CALLS].ended.applicantDataPurges;
  assert.equal(record.applications, 2);
  assert.equal(record.by, "gallerykuns@gmail.com");
  assert.ok(!JSON.stringify(record).includes("010"), "기록에는 개인정보를 남기지 않는다");
});

test("파기: 전체를 고르면 선정 작가 자료도 지운다", async () => {
  const result = JSON.parse((await post({ openCallId: "ended", scope: "all", confirmTitle: "연말 오픈콜" })).body);
  assert.equal(result.deleted, 3);
  assert.deepEqual(Object.keys(store[APPLICATIONS]), ["other"]);
});

test("파기: 파일 삭제가 실패하면 지원서를 남겨 다시 시도할 수 있게 한다", async () => {
  failFiles = true;
  assert.equal((await post({ openCallId: "ended", scope: "all", confirmTitle: "연말 오픈콜" })).statusCode, 502);
  assert.equal(Object.keys(store[APPLICATIONS]).length, 4);
});

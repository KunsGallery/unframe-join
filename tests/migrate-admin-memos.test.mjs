import assert from "node:assert/strict";
import { test } from "node:test";
import { migrateAdminMemos } from "../scripts/migrate-admin-memos.mjs";

const APPLICATIONS = "artifacts/unframe-join/public/data/applications";
const NOTES = "artifacts/unframe-join/admin/data/applicationNotes";
const DELETE = Symbol("delete");

const createDb = (initial) => {
  const store = structuredClone(initial);
  const ref = (path, id) => ({ path, id, get: async () => ({ exists: Boolean(store[path]?.[id]), data: () => store[path]?.[id] }) });
  return {
    store,
    collection: (path) => ({
      doc: (id) => ref(path, id),
      get: async () => ({
        docs: Object.keys(store[path] || {}).map((id) => ({ id, ref: ref(path, id), data: () => store[path][id] })),
      }),
    }),
    batch: () => {
      const operations = [];
      return {
        set: (target, data) => operations.push(() => { (store[target.path] ||= {})[target.id] = data; }),
        update: (target, patch) => operations.push(() => {
          for (const [key, value] of Object.entries(patch)) {
            if (value === DELETE) delete store[target.path][target.id][key];
            else store[target.path][target.id][key] = value;
          }
        }),
        commit: async () => operations.forEach((run) => run()),
      };
    },
  };
};

const seed = () => ({
  [APPLICATIONS]: {
    withMemo: { userId: "a", openCallAdminMemo: "내부 메모", memoUpdatedAt: "2026-01-01" },
    emptyMemo: { userId: "b", openCallAdminMemo: "" },
    noMemo: { userId: "c" },
    alreadyMoved: { userId: "d", openCallAdminMemo: "예전 값" },
  },
  [NOTES]: { alreadyMoved: { memo: "더 최신 값" } },
});

test("기본 실행은 아무것도 쓰지 않고 대상만 센다", async () => {
  const db = createDb(seed());
  const result = await migrateAdminMemos({ db, apply: false, deleteField: DELETE });
  assert.deepEqual(result, { scanned: 4, toMove: 1, toClear: 3 });
  assert.deepEqual(db.store, seed());
});

test("--apply는 메모를 옮기고 신청 문서에서 지운다", async () => {
  const db = createDb(seed());
  await migrateAdminMemos({ db, apply: true, deleteField: DELETE });
  assert.equal(db.store[NOTES].withMemo.memo, "내부 메모");
  assert.equal(db.store[NOTES].withMemo.updatedAt, "2026-01-01");
  for (const id of ["withMemo", "emptyMemo", "alreadyMoved"]) {
    assert.equal("openCallAdminMemo" in db.store[APPLICATIONS][id], false);
    assert.equal("memoUpdatedAt" in db.store[APPLICATIONS][id], false);
  }
});

test("이미 옮겨진 최신 메모를 덮어쓰지 않는다", async () => {
  const db = createDb(seed());
  await migrateAdminMemos({ db, apply: true, deleteField: DELETE });
  assert.equal(db.store[NOTES].alreadyMoved.memo, "더 최신 값");
});

test("다시 실행해도 안전하다", async () => {
  const db = createDb(seed());
  await migrateAdminMemos({ db, apply: true, deleteField: DELETE });
  const again = await migrateAdminMemos({ db, apply: true, deleteField: DELETE });
  assert.deepEqual(again, { scanned: 4, toMove: 0, toClear: 0 });
});

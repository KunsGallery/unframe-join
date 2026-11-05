import assert from "node:assert/strict";
import { test } from "node:test";
import { migrateSalonChatUrls } from "../scripts/migrate-salon-chat-urls.mjs";

const EVENTS = "artifacts/unframe-join/public/data/salonEvents";
const PRIVATE = "artifacts/unframe-join/admin/data/salonPrivate";
const DELETE = Symbol("delete");

const createDb = (initial) => {
  const store = structuredClone(initial);
  const ref = (path, id) => ({ path, id, get: async () => ({ exists: Boolean(store[path]?.[id]), data: () => store[path]?.[id] }) });
  return {
    store,
    collection: (path) => ({
      doc: (id) => ref(path, id),
      get: async () => ({ docs: Object.keys(store[path] || {}).map((id) => ({ id, ref: ref(path, id), data: () => store[path][id] })) }),
    }),
    batch: () => {
      const operations = [];
      return {
        set: (target, data) => operations.push(() => { (store[target.path] ||= {})[target.id] = data; }),
        update: (target, patch) => operations.push(() => {
          for (const [key, value] of Object.entries(patch)) {
            if (value === DELETE) delete store[target.path][target.id][key];
          }
        }),
        commit: async () => operations.forEach((run) => run()),
      };
    },
  };
};

const seed = () => ({
  [EVENTS]: {
    a: { title: "A", groupChatUrl: "https://open.kakao.com/o/a" },
    empty: { title: "B", groupChatUrl: "" },
    none: { title: "C" },
    moved: { title: "D", groupChatUrl: "https://open.kakao.com/o/old" },
  },
  [PRIVATE]: { moved: { groupChatUrl: "https://open.kakao.com/o/new" } },
});

test("기본 실행은 쓰지 않는다", async () => {
  const db = createDb(seed());
  assert.deepEqual(await migrateSalonChatUrls({ db, apply: false, deleteField: DELETE }), { scanned: 4, toMove: 1, toClear: 3 });
  assert.deepEqual(db.store, seed());
});

test("--apply는 옮기고 지우며 최신 값을 덮어쓰지 않고 다시 실행해도 안전하다", async () => {
  const db = createDb(seed());
  await migrateSalonChatUrls({ db, apply: true, deleteField: DELETE });
  assert.equal(db.store[PRIVATE].a.groupChatUrl, "https://open.kakao.com/o/a");
  assert.equal(db.store[PRIVATE].moved.groupChatUrl, "https://open.kakao.com/o/new");
  for (const id of ["a", "empty", "moved"]) assert.equal("groupChatUrl" in db.store[EVENTS][id], false);
  assert.deepEqual(await migrateSalonChatUrls({ db, apply: true, deleteField: DELETE }), { scanned: 4, toMove: 0, toClear: 0 });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWithReload } from "../src/lib/lazyPage.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const pending = Symbol("pending");
const settle = (promise) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(pending), 10))]);

test("로드에 성공하면 모듈을 돌려주고 새로고침하지 않는다", async () => {
  let reloads = 0;
  const page = { default: "page" };
  const result = await loadWithReload(async () => page, { storage: createStorage(), reload: () => { reloads += 1; } });
  assert.equal(result, page);
  assert.equal(reloads, 0);
});

test("첫 실패는 한 번 새로고침하고 오류를 던지지 않는다", async () => {
  let reloads = 0;
  const failing = async () => { throw new Error("chunk gone"); };
  const result = await settle(loadWithReload(failing, { storage: createStorage(), reload: () => { reloads += 1; } }));
  assert.equal(result, pending);
  assert.equal(reloads, 1);
});

test("새로고침 후에도 실패하면 반복하지 않고 오류를 던진다", async () => {
  let reloads = 0;
  const storage = createStorage();
  const failing = async () => { throw new Error("chunk gone"); };
  await settle(loadWithReload(failing, { storage, reload: () => { reloads += 1; } }));
  await assert.rejects(loadWithReload(failing, { storage, reload: () => { reloads += 1; } }), /chunk gone/);
  assert.equal(reloads, 1);
});

test("성공하면 표시가 지워져 다음 배포 때 다시 새로고침할 수 있다", async () => {
  let reloads = 0;
  const storage = createStorage();
  const failing = async () => { throw new Error("chunk gone"); };
  await settle(loadWithReload(failing, { storage, reload: () => { reloads += 1; } }));
  await loadWithReload(async () => ({}), { storage, reload: () => { reloads += 1; } });
  await settle(loadWithReload(failing, { storage, reload: () => { reloads += 1; } }));
  assert.equal(reloads, 2);
});

test("저장소를 쓸 수 없으면 무한 새로고침 대신 오류를 던진다", async () => {
  let reloads = 0;
  const blocked = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  const failing = async () => { throw new Error("chunk gone"); };
  await assert.rejects(loadWithReload(failing, { storage: blocked, reload: () => { reloads += 1; } }), /chunk gone/);
  assert.equal(reloads, 0);
  assert.deepEqual(await loadWithReload(async () => ({ ok: true }), { storage: blocked, reload: () => {} }), { ok: true });
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../netlify/functions/get-my-salon-pass.mjs", import.meta.url), "utf8");
const base = { userId: "owner", trackType: "salon", status: "approved", qrTokenNonce: "nonce", qrTokenHash: "hash", qrTokenVersion: 2 };
async function invoke({ application = base, authError, expired = false, hash = "hash", method = "POST", applicationId = "application" } = {}) {
  let reads = 0;
  const context = vm.createContext({});
  const deps = {
    adminDb: { collection: () => ({ doc: () => ({ get: async () => { reads++; return { exists: Boolean(application), data: () => application }; } }) }) },
    verifyUserRequest: async () => { if (authError) throw Object.assign(new Error("login required"), { statusCode: 401 }); return { uid: "owner" }; },
    applicationsPath: "applications", deriveQrToken: ({ version, nonce }) => { assert.equal(version, 2); assert.equal(nonce, "nonce"); return "existing-token"; },
    hashToken: () => hash, isExpired: () => expired,
    json: (statusCode, body) => ({ statusCode, body }), parseBody: event => JSON.parse(event.body),
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link(async specifier => {
    const names = specifier.includes("firebaseAdmin") ? ["adminDb", "verifyUserRequest"] : ["applicationsPath", "deriveQrToken", "hashToken", "isExpired", "json", "parseBody"];
    return new vm.SyntheticModule(names, function () { for (const name of names) this.setExport(name, deps[name]); }, { context });
  });
  await module.evaluate();
  const result = await module.namespace.handler({ httpMethod: method, body: JSON.stringify({ applicationId }) });
  return { ...result, reads };
}

test("returns the owner's existing approved QR without writing or sending notifications", async () => {
  const result = await invoke();
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.token, "existing-token");
});
test("requires login before reading an application", async () => {
  const result = await invoke({ authError: true });
  assert.equal(result.statusCode, 401);
  assert.equal(result.reads, 0);
});
test("does not disclose another participant's pass", async () => {
  assert.equal((await invoke({ application: { ...base, userId: "other" } })).statusCode, 404);
});
test("rejects missing, non-salon and unapproved applications", async () => {
  assert.equal((await invoke({ application: null })).statusCode, 404);
  assert.equal((await invoke({ application: { ...base, trackType: "rental" } })).statusCode, 403);
  assert.equal((await invoke({ application: { ...base, status: "submitted" } })).statusCode, 403);
});
test("rejects expired, missing and mismatched token records", async () => {
  assert.equal((await invoke({ expired: true })).statusCode, 410);
  assert.equal((await invoke({ application: { ...base, qrTokenNonce: null } })).statusCode, 409);
  assert.equal((await invoke({ hash: "different" })).statusCode, 409);
});
test("checked-in owners can recover their welcome pass after QR expiry", async () => {
  assert.equal((await invoke({ application: { ...base, checkedInAt: "2026-10-14" }, expired: true })).statusCode, 200);
});
test("rejects unsupported methods and invalid document paths before reading", async () => {
  assert.equal((await invoke({ method: "GET" })).statusCode, 405);
  const result = await invoke({ applicationId: "nested/path" });
  assert.equal(result.statusCode, 400);
  assert.equal(result.reads, 0);
});

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import * as shared from '../netlify/functions/_lib/salonShared.mjs';

let application;
let salon;
let send;
let sent;
let writes;
const ref = { update: async (patch) => { writes.push(patch); } };
const adminDb = {
  collection(path) {
    if (path === shared.salonEventsPath) return { doc: () => ({ get: async () => ({ exists: true, id: 'event', data: () => salon }) }) };
    if (path === shared.salonLogsPath) return { add: async () => {} };
    return { where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ ref }] }) }) }) };
  },
  async runTransaction(callback) {
    return callback({
      get: async () => ({ exists: true, id: 'guest', data: () => application }),
      update: (_ref, patch) => { writes.push(patch); },
    });
  },
};
mock.module('../netlify/functions/_lib/firebaseAdmin.mjs', { namedExports: { adminDb } });
mock.module('../netlify/functions/_lib/salonShared.mjs', { namedExports: {
  ...shared,
  sendSalonAlimtalk: async () => { sent += 1; return send(); },
} });
const { default: confirm } = await import('../netlify/functions/confirm-salon-check-in.mjs');

beforeEach(() => {
  process.env.SALON_CHECKIN_SHARED_SECRET = 'test-secret';
  application = { trackType: 'salon', salonId: 'event', status: 'approved', applicantName: 'Guest' };
  salon = {};
  send = async () => {};
  sent = 0;
  writes = [];
});

function request(secret = 'test-secret') {
  return new Request('https://join.example/.netlify/functions/confirm-salon-check-in', {
    method: 'POST', headers: { 'x-salon-checkin-secret': secret },
    body: JSON.stringify({ salonId: 'event', token: 'a'.repeat(40) }),
  });
}

test('admission response does not wait for welcome delivery', async () => {
  let release;
  send = () => new Promise((resolve) => { release = resolve; });
  const background = [];
  const response = await confirm(request(), { waitUntil: (task) => background.push(task) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.notificationStatus, 'pending');
  assert.ok(writes[0].checkedInAt);
  assert.equal(sent, 1);
  assert.match(response.headers.get('server-timing'), /transactionMs/);
  release();
  await Promise.all(background);
  assert.equal(writes.at(-1).welcomeNotificationStatus, 'sent');
});

test('welcome failure does not undo confirmed attendance', async () => {
  send = async () => { throw new Error('provider unavailable'); };
  const background = [];
  const response = await confirm(request(), { waitUntil: (task) => background.push(task) });
  assert.equal(response.status, 200);
  await Promise.all(background);
  assert.equal(writes.at(-1).welcomeNotificationStatus, 'failed');
  assert.ok(writes[0].checkedInAt);
});

test('duplicate scans do not send another welcome message', async () => {
  application.checkedInAt = new Date();
  application.welcomeNotificationStatus = 'sent';
  const response = await confirm(request(), { waitUntil: () => {} });
  assert.equal((await response.json()).duplicate, true);
  assert.equal(sent, 0);
  assert.equal(writes.length, 0);
});

test('disabled welcome is recorded with attendance in the same transaction', async () => {
  salon.notificationSettings = { welcomeEnabled: false };
  const background = [];
  const response = await confirm(request(), { waitUntil: (task) => background.push(task) });
  assert.equal((await response.json()).notificationStatus, 'disabled');
  await Promise.all(background);
  assert.equal(writes[0].welcomeNotificationStatus, 'disabled');
  assert.equal(sent, 0);
});

test('unapproved or wrong-event participants cannot check in', async () => {
  for (const patch of [{ status: 'pending' }, { status: 'approved', salonId: 'another-event' }]) {
    Object.assign(application, patch);
    const response = await confirm(request(), { waitUntil: () => {} });
    assert.ok(response.status >= 400);
    assert.equal(writes.length, 0);
  }
});

test('invalid integration secret cannot check in', async () => {
  const response = await confirm(request('wrong-secret'), { waitUntil: () => {} });
  assert.equal(response.status, 401);
  assert.equal(writes.length, 0);
});

test('expired QR and closed check-in windows cannot admit guests', async () => {
  application.qrExpiresAt = new Date(Date.now() - 10000);
  let response = await confirm(request(), { waitUntil: () => {} });
  assert.equal(response.status, 410);
  delete application.qrExpiresAt;
  for (const [settings, expected] of [
    [{ enabled: false }, 409],
    [{ checkInStartAt: new Date(Date.now() + 60000) }, 409],
    [{ checkInEndAt: new Date(Date.now() - 60000) }, 410],
  ]) {
    salon.checkInSettings = settings;
    response = await confirm(request(), { waitUntil: () => {} });
    assert.equal(response.status, expected);
  }
  assert.equal(writes.length, 0);
});

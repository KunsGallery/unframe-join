import assert from "node:assert/strict";
import { test } from "node:test";
import { getApplicationStats, getListStatus } from "../src/lib/applicationStats.js";

const openCall = (openCallReviewStatus) => ({ trackType: "open-call", openCallId: "c", status: "review", openCallReviewStatus });
const salon = (status) => ({ trackType: "salon", salonId: "s", status });

test("오픈콜은 심사 상태로 집계하고 미선정은 대기에 넣지 않는다", () => {
  assert.deepEqual(getApplicationStats([openCall("rejected")]), { total: 1, pending: 0, confirmed: 0 });
  assert.deepEqual(getApplicationStats([openCall("selected")]), { total: 1, pending: 0, confirmed: 1 });
});

test("오픈콜의 검토 중과 1차 후보는 아직 결정 전이라 대기다", () => {
  assert.equal(getApplicationStats([openCall("review"), openCall("shortlisted"), openCall(undefined)]).pending, 3);
});

test("SALON은 신청 완료와 대기가 대기, 승인이 확정이다", () => {
  const stats = getApplicationStats([salon("submitted"), salon("waitlisted"), salon("approved"), salon("rejected"), salon("cancelled")]);
  assert.deepEqual(stats, { total: 5, pending: 2, confirmed: 1 });
});

test("대관·협업과 그 밖의 신청은 기존 상태로 집계한다", () => {
  const stats = getApplicationStats([
    { trackType: "rental", status: "review" },
    { trackType: "collaboration", status: "review" },
    { status: "confirmed" },
    { status: "rejected" },
    { status: "additional_requested" },
  ]);
  assert.deepEqual(stats, { total: 5, pending: 2, confirmed: 1 });
});

test("오픈콜을 트랙 이름 없이 공고 ID만으로도 알아본다", () => {
  assert.equal(getApplicationStats([{ openCallId: "c", status: "review", openCallReviewStatus: "rejected" }]).pending, 0);
  assert.deepEqual(getApplicationStats([]), { total: 0, pending: 0, confirmed: 0 });
});

test("목록의 상태는 오픈콜만 심사 결과로 바꾸고 나머지는 그대로 둔다", () => {
  assert.equal(getListStatus(openCall("rejected")), "rejected");
  assert.equal(getListStatus(openCall("selected")), "confirmed");
  assert.equal(getListStatus(openCall("shortlisted")), "review");
  assert.equal(getListStatus(salon("submitted")), "submitted");
  assert.equal(getListStatus({ status: "additional_requested" }), "additional_requested");
});

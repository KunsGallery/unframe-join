import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBlankOpenCall,
  buildDuplicateOpenCall,
  createOpenCallId,
  getOpenCallChecklist,
  getOpenCallDateProblem,
  moveListItem,
  toStoredOpenCallDate,
} from "../src/views/admin/open-call/openCallEditorModel.js";
import { buildOpenCallView } from "../src/views/open-call/openCallView.js";
import { OPEN_CALL_FALLBACK, pickActiveOpenCall } from "../src/constants/openCall.js";

test("새 공고는 비공개 초안으로 만들어져 공개 페이지에 끼어들지 않는다", () => {
  const blank = buildBlankOpenCall({ id: "new-1", title: "새 공고" });
  assert.equal(blank.id, "new-1");
  assert.equal(blank.title, "새 공고");
  assert.equal(blank.status, "draft");
  assert.equal(blank.isVisible, false);
  assert.equal(blank.isFeatured, false);
  assert.equal(pickActiveOpenCall([blank]), null);
});

test("새 공고의 공개 화면에는 기본 공고의 문구가 섞이지 않는다", () => {
  const blank = buildBlankOpenCall({ id: "new-1", title: "새 공고" });
  const view = buildOpenCallView(blank);
  const shown = JSON.stringify({ ...view, openCall: { ...view.openCall, formSettings: null, notificationSettings: null, completionSettings: null } });
  assert.ok(!shown.includes("잔상"), "잔상 문구가 섞임");
  assert.ok(!shown.includes(OPEN_CALL_FALLBACK.eligibilityText));
  assert.ok(!shown.includes(OPEN_CALL_FALLBACK.benefitText));
  assert.deepEqual(view.sections, []);
  assert.deepEqual(view.faqs, []);
});

test("지원 버튼 문구가 비어도 다른 공고 이름을 빌려 쓰지 않는다", () => {
  const view = buildOpenCallView({ ...buildBlankOpenCall({ id: "a", title: "새 공고" }), applyButtonText: "  " });
  assert.equal(view.applyLabel, "지원하기");
});

test("복사본은 내용을 가져오되 일정과 공개 상태와 시간 기록은 가져오지 않는다", () => {
  const source = {
    id: "old",
    title: "지난 공고",
    themeKeyword: "기억",
    introText: "소개",
    faqs: [{ question: "Q", answer: "A" }],
    descriptionSections: [{ id: "s1", title: "1차", body: "심사" }],
    formSettings: { customFields: [{ id: "q1", label: "질문" }] },
    applicationStartAt: "2026-01-01T00:00:00.000Z",
    applicationEndAt: "2026-02-01T00:00:00.000Z",
    announcementAt: "2026-03-01T00:00:00.000Z",
    status: "open",
    isVisible: true,
    isFeatured: true,
    createdAt: "created",
    updatedAt: "updated",
  };
  const copy = buildDuplicateOpenCall(source, { id: "copy-1", title: "새 공고" });

  assert.equal(copy.id, "copy-1");
  assert.equal(copy.title, "새 공고");
  assert.equal(copy.themeKeyword, "기억");
  assert.equal(copy.introText, "소개");
  assert.deepEqual(copy.faqs, source.faqs);
  assert.deepEqual(copy.descriptionSections, source.descriptionSections);
  assert.deepEqual(copy.formSettings, source.formSettings);
  assert.equal(copy.applicationStartAt, null);
  assert.equal(copy.applicationEndAt, null);
  assert.equal(copy.announcementAt, null);
  assert.equal(copy.status, "draft");
  assert.equal(copy.isVisible, false);
  assert.equal(copy.isFeatured, false);
  assert.equal(copy.createdAt, undefined);
  assert.equal(copy.updatedAt, undefined);
});

test("복사본을 고쳐도 원본이 바뀌지 않는다", () => {
  const source = { id: "old", title: "t", faqs: [{ question: "Q" }] };
  const copy = buildDuplicateOpenCall(source, { id: "c", title: "n" });
  copy.faqs[0].question = "바뀜";
  assert.equal(source.faqs[0].question, "Q");
});

test("공고 ID는 호출마다 다르고 경로로 쓸 수 있다", () => {
  const first = createOpenCallId();
  const second = createOpenCallId();
  assert.notEqual(first, second);
  assert.match(first, /^open-call-[a-z0-9-]+$/);
});

test("공개 전 점검은 빠진 필수 항목을 알려 준다", () => {
  const missing = getOpenCallChecklist({ title: "", introText: "  ", applicationEndAt: "" });
  assert.deepEqual(missing.filter((item) => !item.ok).map((item) => item.key), ["title", "introText", "applicationEndAt"]);

  const filled = getOpenCallChecklist({ title: "공고", introText: "소개", applicationEndAt: "2027-01-01T10:00" });
  assert.ok(filled.every((item) => item.ok));
});

test("일정 순서가 어긋나면 문제를 설명한다", () => {
  assert.equal(getOpenCallDateProblem({ applicationStartAt: "2027-01-01T10:00", applicationEndAt: "2027-02-01T10:00", announcementAt: "2027-03-01T10:00" }), "");
  assert.equal(getOpenCallDateProblem({}), "");
  assert.match(getOpenCallDateProblem({ applicationStartAt: "2027-02-01T10:00", applicationEndAt: "2027-01-01T10:00" }), /마감/);
  assert.match(getOpenCallDateProblem({ applicationEndAt: "2027-02-01T10:00", announcementAt: "2027-01-01T10:00" }), /발표/);
});

test("입력한 일시는 시간대가 포함된 값으로 저장한다", () => {
  const stored = toStoredOpenCallDate("2027-01-01T10:00");
  assert.equal(stored, new Date(2027, 0, 1, 10, 0).toISOString());
  assert.equal(toStoredOpenCallDate(""), null);
  assert.equal(toStoredOpenCallDate("아무 글자"), null);
});

test("순서 이동은 순번을 다시 매기고 범위 밖 이동은 무시한다", () => {
  const list = [{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }];
  assert.deepEqual(moveListItem(list, 2, -1).map((item) => [item.id, item.order]), [["a", 1], ["c", 2], ["b", 3]]);
  assert.equal(moveListItem(list, 0, -1), list);
  assert.equal(moveListItem(list, 2, 1), list);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MISSING_FIELD,
  applySavedProfile,
  buildSubmission,
  completeWorkUpload,
  createEmptyApplication,
  createEmptyWork,
  formatKRW,
  formatPriceInput,
  reserveWorkRows,
  stripUploadState,
  validateApplication,
} from "../src/views/open-call/openCallApplication.js";

const work = (name) => ({ imageUrl: `https://f/${name}.jpg`, title: "제목", material: "재료", height: "60", width: "90", year: "2026", price: "100" });
const filled = (overrides = {}) => ({
  ...createEmptyApplication(),
  birthYear: "1990", name: "이름", englishName: "Name", phone: "010-1111-2222", email: "a@example.com",
  snsLink: "https://x", portfolioUrl: "https://f/p.pdf", works: [work("a"), work("b")], ...overrides,
});

test("필수 항목이 모두 있으면 오류가 없고 선택 항목은 비워도 된다", () => {
  assert.deepEqual(validateApplication(filled()), {});
});

test("빈 양식은 필수 항목마다 오류를 낸다", () => {
  const errors = validateApplication(createEmptyApplication());
  for (const key of ["birthYear", "name", "englishName", "phone", "email", "snsLink", "portfolioUrl", "work-0-imageUrl", "work-1-price"]) {
    assert.ok(errors[key], key);
  }
  assert.equal(errors.stageName, undefined);
  assert.equal(errors.otherLink, undefined);
  assert.equal(errors.artistStatement, undefined);
});

test("작품은 2점 미만이면 안 되고 쓰다 만 작품은 빠진 칸을 알려 준다", () => {
  assert.equal(validateApplication(filled({ works: [work("a"), createEmptyWork()] }))["work-1-title"], MISSING_FIELD);
  const errors = validateApplication(filled({ works: [work("a"), work("b"), { ...work("c"), price: "" }] }));
  assert.ok(errors["work-2-price"]);
  assert.equal(errors.works, undefined);
});

test("3번째 이후 빈 줄은 문제 삼지 않고 제출에서 뺀다", () => {
  const data = filled({ works: [work("a"), work("b"), createEmptyWork()] });
  assert.deepEqual(validateApplication(data), {});
  assert.equal(buildSubmission(data).works.length, 2);
});

test("작품 크기는 세로와 가로를 숫자로 받는다", () => {
  assert.ok(validateApplication(filled({ works: [work("a"), { ...work("b"), height: "" }] }))["work-1-height"]);
  assert.ok(validateApplication(filled({ works: [work("a"), { ...work("b"), width: "90cm" }] }))["work-1-width"]);
  assert.deepEqual(validateApplication(filled({ works: [work("a"), { ...work("b"), height: "60.5" }] })), {});
});

test("출생연도와 연락처 형식을 확인한다", () => {
  assert.ok(validateApplication(filled({ birthYear: "90" })).birthYear);
  assert.ok(validateApplication(filled({ phone: "123" })).phone);
});

test("저장된 프로필은 빈 칸만 채운다", () => {
  const result = applySavedProfile({ ...createEmptyApplication(), name: "직접 입력" }, { realName: "프로필", englishName: "Eng", phone: "010" }, "login@example.com");
  assert.equal(result.name, "직접 입력");
  assert.equal(result.englishName, "Eng");
  assert.equal(result.phone, "010");
  assert.equal(result.email, "login@example.com");
});

test("빈칸은 문장 없이 표시만 하고, 형식 오류에만 안내 문장을 쓴다", () => {
  const empty = validateApplication(createEmptyApplication());
  for (const key of ["name", "birthYear", "portfolioUrl", "work-0-title", "work-0-imageUrl", "work-1-height"]) {
    assert.equal(empty[key], MISSING_FIELD, key);
  }
  const wrong = validateApplication(filled({ birthYear: "90", works: [work("a"), { ...work("b"), width: "90cm" }] }));
  assert.notEqual(wrong.birthYear, MISSING_FIELD);
  assert.notEqual(wrong["work-1-width"], MISSING_FIELD);
});

test("작품가격을 한국식 금액으로 표시한다", () => {
  const table = [
    ["5000", "5,000원"],
    ["320000", "32만원"],
    ["325000", "32만 5,000원"],
    ["1200000", "120만원"],
    ["15000000", "1,500만원"],
    ["100000000", "1억원"],
    ["125000000", "1억 2,500만원"],
    ["120005000", "1억 2,000만 5,000원"],
    ["100005000", "1억 5,000원"],
  ];
  for (const [input, expected] of table) assert.equal(formatKRW(input), expected, input);
});

test("금액 표시는 쉼표·원·공백을 무시하고, 숫자가 없으면 비운다", () => {
  assert.equal(formatKRW("1,200,000원"), "120만원");
  assert.equal(formatKRW(" 32 0000 "), "32만원");
  for (const empty of ["", "0", "000", "가격 문의", undefined, null]) assert.equal(formatKRW(empty), "", String(empty));
});

test("아주 큰 금액도 오류 없이 표시한다", () => {
  assert.equal(formatKRW("10000000000"), "100억원");
  assert.match(formatKRW("123456789012345678901234"), /억/);
});

test("가격 입력칸은 숫자에만 천 단위 쉼표를 넣고 다른 글은 그대로 둔다", () => {
  assert.equal(formatPriceInput("1200000"), "1,200,000");
  assert.equal(formatPriceInput("1,200,0005"), "12,000,005");
  assert.equal(formatPriceInput(""), "");
  assert.equal(formatPriceInput("1,200,000원"), "1,200,000원");
  assert.equal(formatPriceInput("가격 문의"), "가격 문의");
});

test("여러 장을 고르면 선택한 순서대로 빈 줄을 맡고 6점에서 멈춘다", () => {
  const ids = Array.from({ length: 8 }, (_, index) => `u${index}`);
  const { works, reservedIds } = reserveWorkRows(createEmptyApplication().works, ids);
  assert.equal(works.length, 6);
  assert.deepEqual(works.map((item) => item.uploadId), ids.slice(0, 6));
  assert.deepEqual(reservedIds, ids.slice(0, 6));
});

test("이미 이미지가 있거나 올리는 중인 줄은 건너뛴다", () => {
  const start = [{ ...createEmptyWork(), imageUrl: "x" }, { ...createEmptyWork(), uploadId: "busy" }, createEmptyWork()];
  const { works, reservedIds } = reserveWorkRows(start, ["n1", "n2"]);
  assert.equal(works[2].uploadId, "n1");
  assert.equal(works[3].uploadId, "n2");
  assert.deepEqual(reservedIds, ["n1", "n2"]);
});

test("업로드가 끝나면 맡아 둔 줄에 이미지가 들어간다", () => {
  const { works } = reserveWorkRows(createEmptyApplication().works, ["a", "b"]);
  const done = completeWorkUpload(works, "b", "https://f/b.jpg");
  assert.equal(done[1].imageUrl, "https://f/b.jpg");
  assert.equal(done[0].imageUrl, "");
});

test("올리는 동안의 상태는 제출과 임시 저장에 포함되지 않는다", () => {
  const data = filled({ works: [{ ...work("a"), uploadId: "x" }, { ...work("b"), uploadId: "y" }] });
  assert.equal("uploadId" in buildSubmission(data).works[0], false);
  assert.equal("uploadId" in stripUploadState(data).works[0], false);
  assert.equal(stripUploadState(data).works[0].title, "제목");
});

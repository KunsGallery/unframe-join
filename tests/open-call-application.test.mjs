import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MISSING_FIELD,
  addUploadedImages,
  applySavedProfile,
  buildSubmission,
  createEmptyApplication,
  createEmptyWork,
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

test("여러 장 올리면 빈 줄부터 채우고 6점에서 멈춘다", () => {
  const urls = Array.from({ length: 8 }, (_, index) => `u${index}`);
  const works = addUploadedImages(createEmptyApplication().works, urls);
  assert.equal(works.length, 6);
  assert.deepEqual(works.map((item) => item.imageUrl), urls.slice(0, 6));
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

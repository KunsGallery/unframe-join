import assert from "node:assert/strict";
import { test } from "node:test";
import { splitIntroText } from "../src/views/open-call/openCallView.js";

test("이모지 머리글 앞의 문단은 소개문, 머리글 블록은 요강이 된다", () => {
  const result = splitIntroText("첫 문단\n둘째 줄\n\n둘째 문단\n\n👤 대상\n성인 작가\n\n🖼️ 지원 대상 작품\n완성작\n최종 전시 가능");
  assert.equal(result.lead, "첫 문단\n둘째 줄\n\n둘째 문단");
  assert.deepEqual(result.details, [
    { title: "대상", body: "성인 작가" },
    { title: "지원 대상 작품", body: "완성작\n최종 전시 가능" },
  ]);
});

test("머리글이 없으면 전체가 소개문이다", () => {
  assert.deepEqual(splitIntroText("문단 하나\n\n문단 둘"), { lead: "문단 하나\n\n문단 둘", details: [] });
});

test("요강 뒤의 일반 문단은 잃지 않고 마지막 요강에 붙는다", () => {
  const result = splitIntroText("소개\n\n👤 대상\n성인\n\n덧붙이는 말");
  assert.equal(result.details[0].body, "성인\n\n덧붙이는 말");
});

test("본문 없는 이모지 줄은 머리글로 취급하지 않는다", () => {
  assert.deepEqual(splitIntroText("🎨 감각으로 남는 작품"), { lead: "🎨 감각으로 남는 작품", details: [] });
});

test("줄바꿈 형식이 달라도 처리하고 빈 값은 안전하다", () => {
  assert.equal(splitIntroText("소개\r\n\r\n📌 제출\r\n3점").details[0].title, "제출");
  assert.deepEqual(splitIntroText(undefined), { lead: "", details: [] });
});

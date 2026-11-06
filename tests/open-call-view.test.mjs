import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOpenCallView, getContrastRatio, getKeywordsWeight, getOpenCallRequirements, getOpenCallTheme, getThemeWordWeight, parseThemeKeywords, splitIntroText } from "../src/views/open-call/openCallView.js";

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

test("포인트 색 하나로 읽기 좋은 글자색과 연한 바탕색을 정한다", () => {
  const lime = getOpenCallTheme("#aad004");
  assert.equal(lime.accent, "#AAD004");
  assert.equal(lime.on, "#151413");

  const cobalt = getOpenCallTheme("#004AAD");
  assert.equal(cobalt.on, "#FFFFFF");

  for (const color of ["#AAD004", "#004AAD", "#C2410C", "#FFEE00", "#808080", "#000000"]) {
    const theme = getOpenCallTheme(color);
    assert.ok(getContrastRatio(theme.accent, theme.on) >= 4.5, color);
    assert.ok(getContrastRatio(theme.tint, "#151413") >= 4.5, `${color} 연한 바탕`);
  }
});

test("잘못된 색 값은 기본 색으로 대신한다", () => {
  assert.equal(getOpenCallTheme("red;background:url(x)").accent, "#004AAD");
  assert.equal(getOpenCallTheme(undefined).accent, "#004AAD");
});

test("요강은 직접 쓴 칸을 먼저 쓰고, 없으면 예전 이모지 형식을 읽는다", () => {
  assert.deepEqual(
    getOpenCallRequirements({ requirementItems: [{ title: "대상", body: "성인" }, { title: " ", body: "" }], introText: "소개\n\n👤 옛날\n내용" }),
    [{ title: "대상", body: "성인" }]
  );
  assert.deepEqual(getOpenCallRequirements({ requirementItems: [], introText: "소개\n\n👤 옛날\n내용" }), [{ title: "옛날", body: "내용" }]);
  assert.deepEqual(getOpenCallRequirements({}), []);
});

test("공개 화면 값에 포스터와 색이 담긴다", () => {
  const view = buildOpenCallView({ id: "a", title: "공고", posterUrl: " https://files/p.jpg ", accentColor: "#C2410C", introText: "소개\n\n👤 대상\n성인" });
  assert.equal(view.posterUrl, "https://files/p.jpg");
  assert.equal(view.theme.accent, "#C2410C");
  assert.equal(view.lead, "소개");
  assert.equal(view.requirements[0].title, "대상");
});

test("키워드는 쉼표로 나누고 빈 값과 공백을 정리한다", () => {
  assert.deepEqual(parseThemeKeywords("연말, 선물,,  소품 ,크리스마스, 파티, "), ["연말", "선물", "소품", "크리스마스", "파티"]);
  assert.deepEqual(parseThemeKeywords("잔상"), ["잔상"]);
  assert.deepEqual(parseThemeKeywords(" , "), []);
  assert.deepEqual(parseThemeKeywords(undefined), []);
});

test("글자 크기는 전체 길이가 아니라 가장 긴 키워드로 정한다", () => {
  assert.equal(getKeywordsWeight(["연말", "크리스마스", "파티"]), getThemeWordWeight("크리스마스"));
  assert.ok(getKeywordsWeight(["연말", "크리스마스"]) < getThemeWordWeight("연말, 크리스마스"));
});

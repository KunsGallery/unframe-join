import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOpenCallView, getContrastRatio, getKeywordsWeight, getOpenCallRequirements, getOpenCallTheme, getThemeWordWeight, parseThemeKeywords, resolveThemeKeywords, splitIntroText, suggestThemeKeywords } from "../src/views/open-call/openCallView.js";

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

const CHRISTMAS_CALL = {
  requirementItems: [{ title: "전시 안내", body: "내용" }],
  title: "《All I Want For Christmas Is Art》 OPEN CALL",
  subtitle: "작은 작품으로 전하는 연말의 마음",
  introText: `🎄 UNFRAME OPEN CALL 《All I Want for Christmas Is Art》
2026 연말 단체전 참여 작가 모집

올해 크리스마스, 당신의 작품이 누군가의 선물이 된다면? 🎁

누군가의 공간에 오래 머무는 그림 한 점, 일상에 작은 즐거움을 더하는 오브제 하나.

UNFRAME은 한 해의 끝에서 예술을 조금 더 가까이 만나고,
소중한 사람에게 마음을 전할 수 있는
연말 단체전 《All I Want for Christmas Is Art》를 개최합니다.

이번 전시는 회화와 드로잉, 사진, 도자, 오브제 등
다양한 장르의 소형 작품을 소개하는 기획전입니다.
작품을 감상하는 경험을 넘어, 직접 고르고 소장하며
선물하는 즐거움까지 함께 나누고자 합니다.

작품을 고르는 순간의 설렘부터 누군가의 일상에 오래도록 머무는 시간까지.

작은 작품 하나가 특별한 기억이 될 수 있도록
UNFRAME과 함께 올해의 마지막을 채워갈 작가 여러분을 기다립니다. ✨`,
};

test("본문에서 주제어를 추천하고 일반적인 단어는 뺀다", () => {
  const words = suggestThemeKeywords(CHRISTMAS_CALL);
  assert.ok(words.length >= 3 && words.length <= 5, words.join());
  for (const word of ["연말", "선물", "크리스마스"]) assert.ok(words.includes(word), `${word} 없음: ${words}`);
  for (const word of ["작품", "작가", "전시", "모집", "UNFRAME", "OPEN", "CALL", "누군가", "올해"]) assert.ok(!words.includes(word), `${word} 포함: ${words}`);
  assert.ok(words.every((word) => /^[가-힣A-Za-z]+$/.test(word)), words.join());
});

test("추천은 같은 내용이면 항상 같고 내용이 없으면 비어 있다", () => {
  assert.deepEqual(suggestThemeKeywords(CHRISTMAS_CALL), suggestThemeKeywords(CHRISTMAS_CALL));
  assert.deepEqual(suggestThemeKeywords({}), []);
  assert.deepEqual(suggestThemeKeywords({ title: "UNFRAME OPEN CALL" }), []);
});

test("직접 쓴 주제어가 먼저이고, 없으면 추천, 그것도 없으면 OPEN이다", () => {
  assert.deepEqual(resolveThemeKeywords({ ...CHRISTMAS_CALL, themeKeyword: "잔상" }), ["잔상"]);
  assert.deepEqual(resolveThemeKeywords({ ...CHRISTMAS_CALL, themeKeyword: " " }), suggestThemeKeywords(CHRISTMAS_CALL));
  assert.deepEqual(resolveThemeKeywords({}), ["OPEN"]);
});

test("밝은 포인트 색도 큰 숫자는 흰 바탕에서 읽히게 어둡게 맞춘다", () => {
  for (const color of ["#FAA58B", "#AAD004", "#FFEE00", "#004AAD", "#000000"]) {
    assert.ok(getContrastRatio(getOpenCallTheme(color).accentText, "#FFFFFF") >= 3, color);
  }
  assert.equal(getOpenCallTheme("#004AAD").accentText, "#004AAD");
});

test("요강 칸을 직접 쓴 공고는 이모지로 시작해도 소개글 전체를 소개로 쓴다", () => {
  const source = { id: "a", title: "공고", introText: "🎄 첫 줄\n둘째 줄\n\n다음 문단", requirementItems: [{ title: "대상", body: "성인" }] };
  const view = buildOpenCallView(source);
  assert.equal(view.lead, "🎄 첫 줄\n둘째 줄\n\n다음 문단");
  assert.deepEqual(view.requirements, [{ title: "대상", body: "성인" }]);
});

test("요강 칸이 없는 예전 공고는 이모지 블록을 요강으로 나눈다", () => {
  const view = buildOpenCallView({ id: "a", title: "공고", introText: "소개\n\n👤 대상\n성인" });
  assert.equal(view.lead, "소개");
  assert.equal(view.requirements[0].title, "대상");
});

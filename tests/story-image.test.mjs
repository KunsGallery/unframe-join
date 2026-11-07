import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STORY_SAFE_BOTTOM,
  STORY_SAFE_TOP,
  STORY_SIZE,
  buildStoryContent,
  getContainRect,
  getStoryFileName,
  wrapTextLines,
} from "../src/views/admin/open-call/storyImage.js";

const measure = (text) => text.length * 10;

test("스토리 규격과 인스타그램에 가리는 영역을 지킨다", () => {
  assert.deepEqual(STORY_SIZE, { width: 1080, height: 1920 });
  assert.ok(STORY_SAFE_TOP >= 250);
  assert.ok(STORY_SIZE.height - STORY_SAFE_BOTTOM >= 340);
});

test("포스터는 자르지 않고 영역 안 가운데에 맞춘다", () => {
  const area = { x: 80, y: 250, width: 920, height: 1000 };
  const a4 = getContainRect({ width: 1414, height: 2000 }, area);
  assert.equal(Math.round(a4.height), 1000);
  assert.equal(Math.round(a4.width), 707);
  assert.equal(Math.round(a4.x + a4.width / 2), 540);

  const wide = getContainRect({ width: 2000, height: 1000 }, area);
  assert.equal(Math.round(wide.width), 920);
  assert.equal(Math.round(wide.height), 460);
  assert.equal(Math.round(wide.y + wide.height / 2), 750);
});

test("글은 띄어쓰기 기준으로 줄을 나누고 넘치면 말줄임을 쓴다", () => {
  assert.deepEqual(wrapTextLines("가나다 라마바 사아자", 70, measure, 3), ["가나다 라마바", "사아자"]);
  const clipped = wrapTextLines("가나다 라마바 사아자 차카타", 70, measure, 1);
  assert.equal(clipped.length, 1);
  assert.ok(clipped[0].endsWith("…"));
  assert.ok(measure(clipped[0]) <= 70);
  assert.deepEqual(wrapTextLines("", 70, measure, 2), []);
});

test("한 단어가 폭보다 길면 글자 단위로 나눈다", () => {
  const lines = wrapTextLines("가".repeat(15), 70, measure, 3);
  assert.ok(lines.every((line) => measure(line) <= 70));
  assert.equal(lines.join(""), "가".repeat(15));
});

test("상태와 일정을 공고 내용에서 서울 날짜로 만든다", () => {
  const content = buildStoryContent({
    title: "크리스마스 공고",
    status: "open",
    applicationStartAt: "2026-11-06T15:30:00.000Z",
    applicationEndAt: "2026-11-27T14:59:00.000Z",
    announcementAt: "2026-11-29T01:00:00.000Z",
  }, new Date("2026-11-10T00:00:00.000Z"));
  assert.equal(content.headline, "지금 모집 중");
  assert.equal(content.title, "크리스마스 공고");
  assert.equal(content.period, "접수 11월 7일 — 11월 27일");
  assert.equal(content.announcement, "결과 발표 11월 29일");
  assert.equal(content.url, "join.unframe.kr/opencall");
});

test("접수 전후에는 문구가 바뀌고 일정이 없으면 비운다", () => {
  const dates = { status: "open", applicationStartAt: "2026-12-01T00:00:00.000Z", applicationEndAt: "2026-12-31T00:00:00.000Z" };
  assert.equal(buildStoryContent(dates, new Date("2026-11-01T00:00:00.000Z")).headline, "곧 모집 시작");
  assert.equal(buildStoryContent(dates, new Date("2027-02-01T00:00:00.000Z")).headline, "모집 마감");
  const empty = buildStoryContent({ title: "공고", status: "open" }, new Date());
  assert.equal(empty.period, "");
  assert.equal(empty.announcement, "");
  assert.equal(buildStoryContent({ status: "open", applicationEndAt: "2026-12-31T00:00:00.000Z" }, new Date("2026-11-01T00:00:00.000Z")).period, "12월 31일 마감");
});

test("내려받을 파일 이름은 안전한 글자만 쓴다", () => {
  assert.equal(getStoryFileName({ title: "《All I Want》 / OPEN: CALL" }, "soft"), "unframe-story-All-I-Want-OPEN-CALL-soft.png");
  assert.equal(getStoryFileName({ title: "" }, "accent"), "unframe-story-opencall-accent.png");
});

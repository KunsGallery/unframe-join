import assert from "node:assert/strict";
import { test } from "node:test";
import { getMarkHeights } from "../src/views/chapters/data.js";

const BASES = [100, 72, 88, 62, 100, 78, 92];

test("포인터가 없으면 원래 높이다", () => {
  assert.deepEqual(getMarkHeights(BASES, null), BASES);
});

test("포인터 아래 블록이 가장 높이 올라오고 먼 블록은 낮아진다", () => {
  const heights = getMarkHeights(BASES, 3.5 / 7);
  assert.equal(heights[3], 100);
  assert.ok(heights[3] > BASES[3]);
  assert.ok(heights[0] < BASES[0]);
  assert.ok(heights[6] < BASES[6]);
});

test("포인터가 움직이면 높이가 달라지고 범위를 벗어나지 않는다", () => {
  assert.notDeepEqual(getMarkHeights(BASES, 0.1), getMarkHeights(BASES, 0.9));
  for (const ratio of [-1, 0, 0.33, 1, 2]) {
    getMarkHeights(BASES, ratio).forEach((height) => assert.ok(height > 0 && height <= 100, String(height)));
  }
});

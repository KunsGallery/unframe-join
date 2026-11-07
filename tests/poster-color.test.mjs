import assert from "node:assert/strict";
import { test } from "node:test";
import { pickPaletteFromPixels } from "../src/views/admin/open-call/posterColor.js";

const pixels = (...groups) => {
  const data = [];
  groups.forEach(([[r, g, b, a = 255], count]) => {
    for (let index = 0; index < count; index += 1) data.push(r, g, b, a);
  });
  return Uint8ClampedArray.from(data);
};
const distance = (hexA, hexB) => {
  const rgb = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const [a, b] = [rgb(hexA), rgb(hexB)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

test("흰 종이와 검은 글자 대신 포스터의 색을 고른다", () => {
  const [first] = pickPaletteFromPixels(pixels([[250, 248, 240], 900], [[20, 20, 20], 300], [[200, 40, 40], 100]));
  assert.ok(distance(first, "#C82828") < 30, first);
});

test("많이 쓰인 색이 먼저 나오고 비슷한 색은 하나로 묶는다", () => {
  const palette = pickPaletteFromPixels(pixels([[0, 74, 173], 500], [[4, 78, 176], 300], [[220, 60, 40], 200]));
  assert.equal(palette.length, 2);
  assert.ok(distance(palette[0], "#004AAD") < 30, palette[0]);
  assert.ok(distance(palette[1], "#DC3C28") < 30, palette[1]);
});

test("옅게 번진 색보다 선명한 색을 앞세운다", () => {
  const [first] = pickPaletteFromPixels(pixels([[200, 185, 180], 500], [[20, 80, 200], 400]));
  assert.ok(distance(first, "#1450C8") < 30, first);
});

test("넓게 깔린 연한 배경색보다 진한 색을 앞세운다", () => {
  const [first] = pickPaletteFromPixels(pixels([[249, 213, 203], 700], [[249, 163, 139], 300]));
  assert.ok(distance(first, "#F9A38B") < 30, first);
});

test("투명한 부분은 세지 않고, 색이 없으면 빈 목록을 준다", () => {
  assert.deepEqual(pickPaletteFromPixels(pixels([[200, 40, 40, 0], 500])), []);
  assert.deepEqual(pickPaletteFromPixels(pixels([[255, 255, 255], 100], [[128, 128, 128], 100], [[0, 0, 0], 100])), []);
});

test("최대 개수를 넘지 않는다", () => {
  const palette = pickPaletteFromPixels(
    pixels([[220, 30, 30], 50], [[30, 200, 30], 40], [[30, 30, 220], 30], [[230, 200, 20], 20], [[200, 30, 200], 10], [[30, 200, 200], 5]),
    4
  );
  assert.equal(palette.length, 4);
});

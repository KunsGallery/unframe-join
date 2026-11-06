import assert from "node:assert/strict";
import { test } from "node:test";
import { fillContactFromProfile, shouldShowWelcomeGuide } from "../src/lib/profilePrefill.js";

test("저장된 프로필이 없는 첫 로그인에는 안내창을 띄운다", () => {
  assert.equal(shouldShowWelcomeGuide(null), true);
  assert.equal(shouldShowWelcomeGuide(undefined), true);
  assert.equal(shouldShowWelcomeGuide({}), true);
});

test("한 번 본 사람에게는 다시 띄우지 않는다", () => {
  assert.equal(shouldShowWelcomeGuide({ welcomeSeenAt: { seconds: 1 } }), false);
});

test("이미 정보를 저장해 둔 기존 사용자에게는 띄우지 않는다", () => {
  assert.equal(shouldShowWelcomeGuide({ phone: "01012345678" }), false);
  assert.equal(shouldShowWelcomeGuide({ realName: "홍길동" }), false);
  assert.equal(shouldShowWelcomeGuide({ realName: " ", phone: "" }), true);
});

test("문의 양식의 빈칸만 프로필로 채운다", () => {
  const result = fillContactFromProfile(
    { name: "직접 입력", phone: "", email: "", organization: "", title: "제목" },
    { realName: "프로필", phone: "01012345678", brandName: "스튜디오", stageName: "활동명" },
    "login@example.com"
  );
  assert.deepEqual(result, { name: "직접 입력", phone: "01012345678", email: "login@example.com", organization: "스튜디오", title: "제목" });
});

test("브랜드명이 없으면 활동명을 쓰고 프로필이 없어도 안전하다", () => {
  assert.equal(fillContactFromProfile({}, { stageName: "활동명" }).organization, "활동명");
  assert.deepEqual(fillContactFromProfile({ title: "t" }, null), { title: "t", name: "", phone: "", email: "", organization: "" });
});

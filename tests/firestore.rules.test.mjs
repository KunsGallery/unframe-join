import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "unframe-join";
const ROOT = "artifacts/unframe-join";
const PUBLIC_DATA = `${ROOT}/public/data`;

let testEnv;

const token = (provider, extra = {}) => ({
  firebase: { sign_in_provider: provider },
  ...extra,
});

const dbFor = (uid, claims = token("password")) =>
  testEnv.authenticatedContext(uid, claims).firestore();

const anonymousDb = () => dbFor("anonymous-user", token("anonymous"));
const ownerDb = () => dbFor("owner-user", token("password", { email: "owner@example.com" }));
const otherDb = () => dbFor("other-user", token("password", { email: "other@example.com" }));
const adminDb = () => dbFor(
  "admin-user",
  token("google.com", { email: "gallerykuns@gmail.com", email_verified: true })
);
const secondAdminDb = () => dbFor(
  "admin-user-2",
  token("google.com", { email: "sylove887@gmail.com", email_verified: true })
);
const typoAdminDb = () => dbFor(
  "typo-admin",
  token("google.com", { email: "sklove887@gmail.com", email_verified: true })
);
const unverifiedAdminDb = () => dbFor(
  "impostor-unverified",
  token("google.com", { email: "gallerykuns@gmail.com", email_verified: false })
);
const passwordAdminDb = () => dbFor(
  "impostor-password",
  token("password", { email: "gallerykuns@gmail.com", email_verified: true })
);
const publicDb = () => testEnv.unauthenticatedContext().firestore();

const reservationRef = (db, id = "2026-08-01") =>
  doc(db, `${PUBLIC_DATA}/reservations/${id}`);
const applicationRef = (db, id) =>
  doc(db, `${PUBLIC_DATA}/applications/${id}`);
const salonEventRef = (db, id = "salon-1") =>
  doc(db, `${PUBLIC_DATA}/salonEvents/${id}`);
const checkInLogRef = (db, id = "log-1") =>
  doc(db, `${PUBLIC_DATA}/salonCheckInLogs/${id}`);

const rentalApplication = (overrides = {}) => ({
  trackType: "rental",
  userId: "owner-user",
  status: "review",
  name: "Owner",
  submittedAt: new Date(),
  ...overrides,
});

const openCallApplication = (overrides = {}) => ({
  trackType: "open-call",
  userId: "owner-user",
  status: "review",
  name: "Owner",
  submittedAt: new Date(),
  ...overrides,
});

const salonApplication = (overrides = {}) => ({
  trackType: "salon",
  salonId: "salon-1",
  userId: "owner-user",
  status: "submitted",
  applicantName: "Owner",
  qrTokenHash: null,
  checkedInAt: null,
  ...overrides,
});

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(reservationRef(db), { status: "review", applicantCount: 1 }),
      setDoc(applicationRef(db, "rental-owner"), rentalApplication({ status: "additional_requested" })),
      setDoc(applicationRef(db, "rental-other"), rentalApplication({ userId: "other-user" })),
      setDoc(applicationRef(db, "salon-owner"), salonApplication()),
      setDoc(applicationRef(db, "legacy-rental"), { userId: "owner-user", status: "additional_requested" }),
      setDoc(doc(db, `${ROOT}/users/owner-user/drafts/draft-1`), { title: "Draft" }),
      setDoc(doc(db, `${ROOT}/users/owner-user/profile/basic`), { name: "Owner" }),
      setDoc(salonEventRef(db), { title: "SALON", status: "open" }),
      setDoc(checkInLogRef(db), { salonId: "salon-1", result: "success" }),
      setDoc(doc(db, `${PUBLIC_DATA}/openCalls/open-call-1`), { title: "Open Call" }),
      setDoc(doc(db, `${PUBLIC_DATA}/joinTracks/salon`), { title: "SALON" }),
      setDoc(doc(db, `${PUBLIC_DATA}/joinPopups/popup-1`), { title: "Popup" }),
      setDoc(doc(db, `${PUBLIC_DATA}/joinHome/settings`), { title: "JOIN" }),
    ]);
  });
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("reservations", () => {
  test("비로그인 공개 read 허용", async () => {
    await assertSucceeds(getDoc(reservationRef(publicDb())));
  });

  test("익명 사용자 create/update 거부", async () => {
    await assertFails(setDoc(reservationRef(anonymousDb(), "2026-08-02"), { status: "review" }));
    await assertFails(updateDoc(reservationRef(anonymousDb()), { applicantCount: 2 }));
  });

  test("일반 사용자는 빈 날짜를 선점할 수 없음", async () => {
    await assertFails(setDoc(reservationRef(ownerDb(), "2026-08-02"), {
      status: "writing",
      writingCount: 9999,
      writingUsers: { "owner-user": 9999999999999 },
    }));
  });

  test("일반 사용자는 확정 일정의 status를 지울 수 없음", async () => {
    await testEnv.withSecurityRulesDisabled((context) =>
      setDoc(reservationRef(context.firestore(), "2026-08-03"), {
        status: "confirmed",
        writingUsers: {},
        writingCount: 0,
      })
    );
    await assertFails(updateDoc(reservationRef(ownerDb(), "2026-08-03"), { status: null }));
  });

  test("관리자 create/update 허용", async () => {
    await assertSucceeds(setDoc(reservationRef(adminDb(), "2026-08-02"), { status: "confirmed" }));
    await assertSucceeds(updateDoc(reservationRef(adminDb()), { applicantCount: 2 }));
  });

  test("일반 사용자 delete 거부, 관리자 delete 허용", async () => {
    await assertFails(deleteDoc(reservationRef(ownerDb())));
    await assertSucceeds(deleteDoc(reservationRef(adminDb())));
  });
});

describe("applications — 기존 신청", () => {
  test("비로그인 및 익명 사용자 create 거부", async () => {
    await assertFails(setDoc(applicationRef(publicDb(), "public-create"), rentalApplication()));
    await assertFails(setDoc(applicationRef(anonymousDb(), "anonymous-create"), rentalApplication({ userId: "anonymous-user" })));
  });

  test("브라우저 직접 create는 본인·관리자 모두 거부 (서버 함수로만 접수)", async () => {
    await assertFails(setDoc(applicationRef(ownerDb(), "rental-create"), rentalApplication()));
    await assertFails(setDoc(applicationRef(ownerDb(), "open-call-create"), openCallApplication()));
    await assertFails(setDoc(applicationRef(adminDb(), "admin-create"), rentalApplication()));
  });

  test("본인 read 허용, 타인 read 거부, 관리자 read 허용", async () => {
    await assertSucceeds(getDoc(applicationRef(ownerDb(), "rental-owner")));
    await assertFails(getDoc(applicationRef(otherDb(), "rental-owner")));
    await assertSucceeds(getDoc(applicationRef(adminDb(), "rental-owner")));
  });

  test("additional_requested → review 허용", async () => {
    await assertSucceeds(updateDoc(applicationRef(ownerDb(), "rental-owner"), { status: "review" }));
  });

  test("trackType 없는 기존 rental도 additional_requested → review 허용", async () => {
    await assertSucceeds(updateDoc(applicationRef(ownerDb(), "legacy-rental"), { status: "review" }));
  });

  test("본인의 임의 status 변경 거부", async () => {
    await assertFails(updateDoc(applicationRef(ownerDb(), "rental-owner"), { status: "confirmed" }));
  });

  test("관리자 rental/open-call update 허용", async () => {
    await assertSucceeds(updateDoc(applicationRef(adminDb(), "rental-owner"), { status: "confirmed" }));
    await testEnv.withSecurityRulesDisabled((context) =>
      setDoc(applicationRef(context.firestore(), "open-call-owner"), openCallApplication())
    );
    await assertSucceeds(updateDoc(applicationRef(secondAdminDb(), "open-call-owner"), { status: "approved" }));
  });
});

describe("applications — SALON", () => {
  test("비익명 사용자도 SALON 직접 create 거부", async () => {
    await assertFails(setDoc(applicationRef(ownerDb(), "salon-create"), salonApplication()));
  });

  test("SALON 신청자 본인 및 관리자 read 허용", async () => {
    await assertSucceeds(getDoc(applicationRef(ownerDb(), "salon-owner")));
    await assertSucceeds(getDoc(applicationRef(adminDb(), "salon-owner")));
  });

  test("신청자 직접 update 거부", async () => {
    await assertFails(updateDoc(applicationRef(ownerDb(), "salon-owner"), { status: "cancelled" }));
    await assertFails(updateDoc(applicationRef(ownerDb(), "salon-owner"), { nickname: "Changed" }));
  });

  test("관리자 브라우저 직접 update 거부", async () => {
    await assertFails(updateDoc(applicationRef(adminDb(), "salon-owner"), { status: "approved" }));
  });
});

describe("drafts/profile", () => {
  for (const [label, path] of [
    ["drafts", `${ROOT}/users/owner-user/drafts/draft-1`],
    ["profile", `${ROOT}/users/owner-user/profile/basic`],
  ]) {
    test(`${label}: 비익명 본인 read/write 허용`, async () => {
      await assertSucceeds(getDoc(doc(ownerDb(), path)));
      await assertSucceeds(setDoc(doc(ownerDb(), path), { updated: true }));
    });

    test(`${label}: anonymous 및 타인 거부`, async () => {
      await assertFails(getDoc(doc(anonymousDb(), path)));
      await assertFails(setDoc(doc(anonymousDb(), path), { updated: true }));
      await assertFails(getDoc(doc(otherDb(), path)));
      await assertFails(setDoc(doc(otherDb(), path), { updated: true }));
    });

    test(`${label}: 관리자는 타인 소유 문서 직접 접근 불가`, async () => {
      await assertFails(getDoc(doc(adminDb(), path)));
      await assertFails(setDoc(doc(adminDb(), path), { updated: true }));
    });
  }
});

describe("salonEvents", () => {
  test("비로그인 및 일반 로그인 사용자 read 허용", async () => {
    await assertSucceeds(getDoc(salonEventRef(publicDb())));
    await assertSucceeds(getDoc(salonEventRef(ownerDb())));
  });

  test("일반 사용자 create/update/delete 거부", async () => {
    await assertFails(setDoc(salonEventRef(ownerDb(), "salon-2"), { title: "New" }));
    await assertFails(updateDoc(salonEventRef(ownerDb()), { title: "Changed" }));
    await assertFails(deleteDoc(salonEventRef(ownerDb())));
  });

  test("관리자 create/update/delete 허용", async () => {
    await assertSucceeds(setDoc(salonEventRef(adminDb(), "salon-2"), { title: "New" }));
    await assertSucceeds(updateDoc(salonEventRef(adminDb()), { title: "Changed" }));
    await assertSucceeds(deleteDoc(salonEventRef(adminDb(), "salon-2")));
  });
});

describe("salonCheckInLogs", () => {
  test("관리자 read 허용, 일반 사용자와 비로그인 read 거부", async () => {
    await assertSucceeds(getDoc(checkInLogRef(adminDb())));
    await assertFails(getDoc(checkInLogRef(ownerDb())));
    await assertFails(getDoc(checkInLogRef(publicDb())));
  });

  test("일반 사용자와 관리자 브라우저 create 거부", async () => {
    await assertFails(setDoc(checkInLogRef(ownerDb(), "user-log"), { result: "success" }));
    await assertFails(setDoc(checkInLogRef(adminDb(), "admin-log"), { result: "success" }));
  });

  test("관리자 브라우저도 update/delete 거부", async () => {
    await assertFails(updateDoc(checkInLogRef(adminDb()), { result: "invalid" }));
    await assertFails(deleteDoc(checkInLogRef(adminDb())));
  });
});

describe("기존 공개 콘텐츠", () => {
  for (const [collectionName, documentId] of [
    ["openCalls", "open-call-1"],
    ["joinTracks", "salon"],
    ["joinPopups", "popup-1"],
    ["joinHome", "settings"],
  ]) {
    test(`${collectionName}: 공개 read`, async () => {
      await assertSucceeds(getDoc(doc(publicDb(), `${PUBLIC_DATA}/${collectionName}/${documentId}`)));
    });

    test(`${collectionName}: 일반 사용자 write 거부, 관리자 write 허용`, async () => {
      const userRef = doc(ownerDb(), `${PUBLIC_DATA}/${collectionName}/${documentId}`);
      const adminRef = doc(adminDb(), `${PUBLIC_DATA}/${collectionName}/${documentId}`);
      await assertFails(updateDoc(userRef, { title: "User changed" }));
      await assertSucceeds(updateDoc(adminRef, { title: "Admin changed" }));
    });
  }
});

describe("관리자 allowlist", () => {
  test("두 번째 정상 관리자 계정 허용", async () => {
    await assertSucceeds(getDoc(applicationRef(secondAdminDb(), "rental-other")));
  });

  test("오타 관리자 이메일은 권한 없음", async () => {
    await assertFails(getDoc(applicationRef(typoAdminDb(), "rental-other")));
    await assertFails(updateDoc(salonEventRef(typoAdminDb()), { title: "Nope" }));
  });

  test("이메일 미인증 토큰은 관리자 권한 없음", async () => {
    await assertFails(getDoc(applicationRef(unverifiedAdminDb(), "rental-other")));
    await assertFails(updateDoc(salonEventRef(unverifiedAdminDb()), { title: "Nope" }));
  });

  test("Google 외 로그인 토큰은 관리자 권한 없음", async () => {
    await assertFails(getDoc(applicationRef(passwordAdminDb(), "rental-other")));
    await assertFails(updateDoc(salonEventRef(passwordAdminDb()), { title: "Nope" }));
  });
});

describe("서버 전용·관리자 전용 데이터", () => {
  const privateRef = (db, id = "salon-1") => doc(db, `${ROOT}/admin/data/salonPrivate/${id}`);
  const rateRef = (db) => doc(db, `${ROOT}/admin/data/rateLimits/some-key`);

  test("SALON 비공개 설정은 관리자만 읽고 쓴다", async () => {
    await assertSucceeds(setDoc(privateRef(adminDb()), { groupChatUrl: "https://open.kakao.com/o/x" }));
    await assertSucceeds(getDoc(privateRef(adminDb())));
    await assertFails(getDoc(privateRef(ownerDb())));
    await assertFails(getDoc(privateRef(publicDb())));
    await assertFails(setDoc(privateRef(ownerDb()), { groupChatUrl: "x" }));
  });

  test("빈도 제한 카운터는 브라우저에서 접근할 수 없다", async () => {
    await assertFails(getDoc(rateRef(adminDb())));
    await assertFails(getDoc(rateRef(ownerDb())));
    await assertFails(setDoc(rateRef(ownerDb()), { count: 0 }));
  });
});

describe("관리자 메모", () => {
  const noteRef = (db, id = "rental-owner") =>
    doc(db, `${ROOT}/admin/data/applicationNotes/${id}`);

  test("관리자는 메모를 읽고 쓸 수 있음", async () => {
    await assertSucceeds(setDoc(noteRef(adminDb()), { memo: "내부 메모" }));
    await assertSucceeds(getDoc(noteRef(secondAdminDb())));
  });

  test("신청자 본인과 비로그인 사용자는 메모에 접근할 수 없음", async () => {
    await testEnv.withSecurityRulesDisabled((context) =>
      setDoc(noteRef(context.firestore()), { memo: "내부 메모" })
    );
    await assertFails(getDoc(noteRef(ownerDb())));
    await assertFails(getDoc(noteRef(publicDb())));
    await assertFails(setDoc(noteRef(ownerDb()), { memo: "변조" }));
  });
});

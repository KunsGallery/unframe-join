// Moves groupChatUrl off publicly readable salon event documents.
// Dry run by default; pass --apply to write. Safe to re-run.
import { fileURLToPath } from "node:url";

const EVENTS_PATH = "artifacts/unframe-join/public/data/salonEvents";
const PRIVATE_PATH = "artifacts/unframe-join/admin/data/salonPrivate";

export const migrateSalonChatUrls = async ({ db, apply, deleteField }) => {
  const events = await db.collection(EVENTS_PATH).get();
  const result = { scanned: events.docs.length, toMove: 0, toClear: 0 };
  const batch = db.batch();

  for (const event of events.docs) {
    const data = event.data();
    if (!("groupChatUrl" in data)) continue;
    result.toClear += 1;

    const privateRef = db.collection(PRIVATE_PATH).doc(event.id);
    if (data.groupChatUrl && !(await privateRef.get()).exists) {
      result.toMove += 1;
      batch.set(privateRef, { groupChatUrl: data.groupChatUrl });
    }
    batch.update(event.ref, { groupChatUrl: deleteField });
  }

  if (apply && result.toClear > 0) await batch.commit();
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apply = process.argv.includes("--apply");
  const { adminDb } = await import("../netlify/functions/_lib/firebaseDatabase.mjs");
  const { FieldValue } = await import("firebase-admin/firestore");
  const result = await migrateSalonChatUrls({ db: adminDb, apply, deleteField: FieldValue.delete() });
  console.log(apply ? "적용 완료:" : "미리보기 (쓰기 없음, 적용하려면 --apply):", result);
}

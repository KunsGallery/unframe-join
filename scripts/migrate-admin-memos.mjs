// Moves openCallAdminMemo off applicant-readable application documents.
// Dry run by default; pass --apply to write. Safe to re-run.
import { fileURLToPath } from "node:url";

const APPLICATIONS_PATH = "artifacts/unframe-join/public/data/applications";
const NOTES_PATH = "artifacts/unframe-join/admin/data/applicationNotes";
const DOCS_PER_BATCH = 200;

export const migrateAdminMemos = async ({ db, apply, deleteField }) => {
  const applications = await db.collection(APPLICATIONS_PATH).get();
  const result = { scanned: applications.docs.length, toMove: 0, toClear: 0 };
  let batch = db.batch();
  let pending = 0;

  for (const application of applications.docs) {
    const data = application.data();
    if (!("openCallAdminMemo" in data) && !("memoUpdatedAt" in data)) continue;
    result.toClear += 1;

    const noteRef = db.collection(NOTES_PATH).doc(application.id);
    const existingNote = await noteRef.get();
    if (data.openCallAdminMemo && !existingNote.exists) {
      result.toMove += 1;
      batch.set(noteRef, {
        memo: data.openCallAdminMemo,
        updatedAt: data.memoUpdatedAt ?? new Date(),
      });
    }
    batch.update(application.ref, {
      openCallAdminMemo: deleteField,
      memoUpdatedAt: deleteField,
    });
    pending += 1;

    if (pending === DOCS_PER_BATCH) {
      if (apply) await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (apply && pending > 0) await batch.commit();
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apply = process.argv.includes("--apply");
  const { adminDb } = await import("../netlify/functions/_lib/firebaseDatabase.mjs");
  const { FieldValue } = await import("firebase-admin/firestore");
  const result = await migrateAdminMemos({ db: adminDb, apply, deleteField: FieldValue.delete() });
  console.log(apply ? "적용 완료:" : "미리보기 (쓰기 없음, 적용하려면 --apply):", result);
}

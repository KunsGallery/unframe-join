// Destroys applicant data for an open call that has finished taking applications, as the privacy notice promises
// ("목적 달성 후 지체 없이 파기"): the uploaded files, the application documents and the admin notes on them.
// Selected artists can be kept for the exhibition. Files go first, so a failure leaves documents to retry with.
import { createFallbackOpenCall, getOpenCallDisplayStatus } from "../../src/constants/openCall.js";
import { collectApplicationFiles } from "../../src/constants/storedFiles.js";
import { adminDb, verifyAdminRequest } from "./_lib/firebaseAdmin.mjs";
import { deleteStoredFiles, r2Settings } from "./_lib/r2.mjs";
import { ROOT_PATH, applicationsPath, json, parseBody } from "./_lib/salonShared.mjs";

const openCallsPath = `${ROOT_PATH}/openCalls`;
const notesPath = "artifacts/unframe-join/admin/data/applicationNotes";
const SCOPES = new Set(["unselected", "all"]);

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const admin = await verifyAdminRequest(event);
    const { openCallId = "", scope = "", confirmTitle = "" } = parseBody(event);
    if (!SCOPES.has(scope)) throw fail(400, "파기 범위를 골라 주세요.");
    if (typeof openCallId !== "string" || !openCallId || openCallId.includes("/")) throw fail(404, "공고를 찾을 수 없습니다.");

    const callRef = adminDb.collection(openCallsPath).doc(openCallId);
    const snapshot = await callRef.get();
    if (!snapshot.exists) throw fail(404, "공고를 찾을 수 없습니다.");
    const call = createFallbackOpenCall({ ...snapshot.data(), id: openCallId });
    if (!["closed", "archived"].includes(getOpenCallDisplayStatus(call).key)) throw fail(409, "접수가 끝난 공고만 파기할 수 있습니다.");
    if (String(confirmTitle).trim() !== String(call.title || "").trim()) throw fail(400, "확인용 공고명이 일치하지 않습니다.");

    const found = await adminDb.collection(applicationsPath).where("openCallId", "==", openCallId).get();
    const targets = found.docs.filter((doc) => scope === "all" || doc.data().openCallReviewStatus !== "selected");
    const files = await deleteStoredFiles(targets.flatMap((doc) => collectApplicationFiles(doc.data())), r2Settings());

    for (let i = 0; i < targets.length; i += 200) {
      const batch = adminDb.batch();
      targets.slice(i, i + 200).forEach((doc) => {
        batch.delete(doc.ref);
        batch.delete(adminDb.collection(notesPath).doc(doc.id));
      });
      await batch.commit();
    }

    // A record that the data was destroyed, with no personal details in it.
    const record = { at: new Date(), scope, applications: targets.length, files, kept: found.docs.length - targets.length, by: admin.email };
    const history = Array.isArray(snapshot.data().applicantDataPurges) ? snapshot.data().applicantDataPurges : [];
    await callRef.update({ applicantDataPurges: [...history, record].slice(-20) });

    return json(200, { ok: true, deleted: targets.length, files, kept: record.kept });
  } catch (error) {
    if (!error.statusCode) console.error("purge-open-call-applications error");
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "파기하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
}

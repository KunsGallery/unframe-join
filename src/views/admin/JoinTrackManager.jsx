import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Upload, RotateCcw } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { DEFAULT_JOIN_TRACKS, JOIN_TRACK_COLLECTION, getJoinTrackVisibilityState, getJoinTrackVisibilityPatch, mergeJoinTracks } from "../../constants/joinTracks";
import { uploadImageToR2 } from "../../lib/uploads";
import JoinTrackInlineCardEditor from "./JoinTrackInlineCardEditor";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/15";
const names = { rental: "공간 대관", "open-call": "공개 모집", salon: "행사 / 모임", collaboration: "협업 / 제안" };
const states = { active: "공개 · 클릭 가능", disabled: "준비 중 · 클릭 불가", hidden: "숨김" };
const textFields = [["title", "카드 제목"], ["eyebrow", "상단 라벨"], ["shortLabel", "짧은 라벨"], ["statusLabel", "배지 문구"], ["ctaLabel", "버튼 문구"]];

export default function JoinTrackManager({ db, appId, currentUser }) {
  const [trackDocs, setTrackDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [selectedId, setSelectedId] = useState("rental");
  const [feedback, setFeedback] = useState({});
  const [uploadingId, setUploadingId] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");
  const sortedTracks = useMemo(() => mergeJoinTracks(trackDocs), [trackDocs]);
  const selected = sortedTracks.find(track => track.id === selectedId) || sortedTracks[0];
  const draft = selected ? { ...selected, ...drafts[selected.id] } : {};
  const dirty = Object.keys(drafts).some(id => Object.keys(drafts[id] || {}).length > 0);
  const selectedDirty = Object.keys(drafts[selected?.id] || {}).length > 0;
  const busy = feedback[selected?.id]?.state === "saving" || uploadingId === selected?.id;

  useEffect(() => onSnapshot(collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION), snapshot => {
    setTrackDocs(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
    setLoading(false);
  }, () => { setNotice("입구 설정을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요."); setLoading(false); }), [appId, db]);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (id, patch) => {
    setDrafts(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }));
    setFeedback(previous => ({ ...previous, [id]: null }));
  };
  const save = async () => {
    if (busy || !selected) return;
    const id = selected.id;
    const changes = { ...drafts[id] };
    const raw = trackDocs.find(track => track.id === id) || {};
    const color = draft.accentColor;
    if (!/^#[0-9a-f]{6}$/i.test(color || "")) { setFeedback(previous => ({ ...previous, [id]: { state: "error", message: "색상은 #004AAD처럼 6자리 색상 코드로 입력해 주세요." } })); return; }
    if (draft.backgroundImageUrl) {
      try { if (!['https:', 'http:'].includes(new URL(draft.backgroundImageUrl).protocol)) throw new Error(); }
      catch { setFeedback(previous => ({ ...previous, [id]: { state: "error", message: "배경 이미지 주소를 확인해 주세요." } })); return; }
    }
    setFeedback(previous => ({ ...previous, [id]: { state: "saving", message: "저장 중…" } }));
    try {
      await setDoc(doc(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION, id), {
        ...raw, ...draft, ...getJoinTrackVisibilityPatch(getJoinTrackVisibilityState(draft)),
        badgeText: draft.statusLabel, trackType: "join-track", updatedAt: serverTimestamp(), createdAt: raw.createdAt || serverTimestamp(),
      }, { merge: true });
      setDrafts(previous => {
        const remaining = { ...previous[id] };
        for (const key of Object.keys(changes)) if (remaining[key] === changes[key]) delete remaining[key];
        return { ...previous, [id]: remaining };
      });
      setFeedback(previous => ({ ...previous, [id]: { state: "saved", message: "저장했습니다." } }));
    } catch (error) {
      setFeedback(previous => ({ ...previous, [id]: { state: "error", message: error.code === "permission-denied" ? `${currentUser?.email || "현재 계정"}의 저장 권한을 확인해 주세요.` : "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요." } }));
    }
  };
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected || uploadingId) return;
    const id = selected.id;
    setUploadingId(id);
    try {
      const result = await uploadImageToR2({ file, folder: "join-tracks", isAdminUpload: true });
      update(id, { backgroundImageUrl: result.url });
    } catch (error) {
      setFeedback(previous => ({ ...previous, [id]: { state: "error", message: error.message || "이미지를 업로드하지 못했습니다." } }));
    } finally { setUploadingId(""); }
  };
  const seedMissing = async () => {
    setSeeding(true);
    try {
      const missing = DEFAULT_JOIN_TRACKS.filter(track => !trackDocs.some(saved => saved.id === track.id));
      await Promise.all(missing.map(track => setDoc(doc(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION, track.id), {
        ...track, inquiryLaunchVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true })));
      setNotice(missing.length ? "누락된 기본 입구를 추가했습니다." : "기본 입구가 모두 등록되어 있습니다.");
    } catch { setNotice("기본 입구를 추가하지 못했습니다. 저장 권한을 확인해 주세요."); }
    finally { setSeeding(false); }
  };

  return (
    <section className="mb-10 min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-bold">메인 입구 관리</h3><button type="button" disabled={loading || seeding} onClick={seedMissing} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold disabled:opacity-50"><Plus size={16} />기본 입구 추가</button></div>
      {notice && <p role="status" className="mb-4 text-sm text-zinc-700">{notice}</p>}
      {loading ? <div className="flex items-center gap-2 py-12 text-sm text-zinc-600"><Loader2 size={20} className="animate-spin" />입구 설정을 불러오는 중입니다.</div> : (
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto border-b border-zinc-200 pb-3" role="tablist" aria-label="메인 입구">
            {sortedTracks.map(track => (
              <button key={track.id} type="button" role="tab" aria-selected={selected?.id === track.id} onClick={() => setSelectedId(track.id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${selected?.id === track.id ? "bg-[#004aad] text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"}`}>
                {names[track.id] || track.title}
                {Object.keys(drafts[track.id] || {}).length > 0 && (
                  <span aria-label="저장하지 않은 변경" className="h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </div>
          {selected && <div role="tabpanel" className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)] xl:items-start">
            <div className="min-w-0">
              <fieldset disabled={busy} className="grid min-w-0 gap-x-5 gap-y-5 sm:grid-cols-2 disabled:opacity-70">
                <label className="min-w-0 text-sm font-semibold text-zinc-700">노출 상태<select value={getJoinTrackVisibilityState(draft)} onChange={event => update(selected.id, getJoinTrackVisibilityPatch(event.target.value))} className={inputClass}>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="min-w-0 text-sm font-semibold text-zinc-700">표시 순서<input type="number" min="1" step="1" value={draft.order} onChange={event => update(selected.id, { order: Math.max(1, Number(event.target.value) || 1) })} className={inputClass} /></label>
                {textFields.map(([key, label]) => <label key={key} className="min-w-0 text-sm font-semibold text-zinc-700">{label}<input value={draft[key] || ""} onChange={event => update(selected.id, { [key]: event.target.value })} className={inputClass} /></label>)}
                <label className="min-w-0 text-sm font-semibold text-zinc-700">강조 색상<span className="mt-2 flex items-center gap-2"><input type="color" aria-label="강조 색상 선택" value={/^#[0-9a-f]{6}$/i.test(draft.accentColor) ? draft.accentColor : "#004AAD"} onChange={event => update(selected.id, { accentColor: event.target.value })} className="h-11 w-11 shrink-0 cursor-pointer rounded border border-zinc-300" /><input aria-label="강조 색상 코드" value={draft.accentColor || ""} onChange={event => update(selected.id, { accentColor: event.target.value })} className={inputClass + " !mt-0"} /></span></label>
                <label className="min-w-0 text-sm font-semibold text-zinc-700 sm:col-span-2">설명<textarea rows={3} value={draft.description || ""} onChange={event => update(selected.id, { description: event.target.value })} className={inputClass} /></label>
                <div className="min-w-0 sm:col-span-2"><label className="text-sm font-semibold text-zinc-700">배경 이미지 URL<input type="url" value={draft.backgroundImageUrl || ""} onChange={event => update(selected.id, { backgroundImageUrl: event.target.value })} className={inputClass} /></label><div className="mt-3 flex flex-wrap gap-3"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold"><Upload size={16} />{uploadingId === selected.id ? "업로드 중…" : "이미지 업로드"}<input type="file" accept="image/*" onChange={upload} disabled={busy} className="sr-only" /></label>{draft.backgroundImageUrl && <button type="button" onClick={() => update(selected.id, { backgroundImageUrl: "" })} className="min-h-11 text-sm font-semibold text-zinc-600">이미지 제거</button>}</div></div>
              </fieldset>
              <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-3 py-4">
                <p role="status" aria-live="polite" className={`text-sm ${feedback[selected.id]?.state === "error" ? "text-red-700" : "text-zinc-600"}`}>{feedback[selected.id]?.message || (selectedDirty ? "저장하지 않은 변경이 있습니다." : "저장된 설정입니다.")}</p>
                <div className="flex gap-2"><button type="button" title="이 입구의 변경 취소" aria-label="이 입구의 변경 취소" disabled={busy || !selectedDirty} onClick={() => { setDrafts(previous => ({ ...previous, [selected.id]: {} })); setFeedback(previous => ({ ...previous, [selected.id]: null })); }} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 disabled:opacity-40"><RotateCcw size={17} /></button><button type="button" onClick={save} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{feedback[selected.id]?.state === "saving" ? "저장 중…" : "설정 저장"}</button></div>
              </div>
            </div>
            <aside className="min-w-0 xl:sticky xl:top-28"><h4 className="mb-3 text-base font-bold">카드 미리보기</h4><JoinTrackInlineCardEditor track={selected} index={sortedTracks.findIndex(track => track.id === selected.id)} draft={draft} onChange={patch => { if (!busy) update(selected.id, patch); }} visibilityState={getJoinTrackVisibilityState(draft)} onChangeVisibility={state => { if (!busy) update(selected.id, getJoinTrackVisibilityPatch(state)); }} /></aside>
          </div>}
        </>
      )}
    </section>
  );
}

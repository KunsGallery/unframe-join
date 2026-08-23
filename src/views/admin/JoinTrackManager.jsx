import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Save, Sparkles } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  DEFAULT_JOIN_TRACKS,
  JOIN_TRACK_COLLECTION,
  getJoinTrackVisibilityState,
  getJoinTrackVisibilityPatch,
  getPreviewTextValue,
  hasOwnField,
  mergeJoinTracks,
} from "../../constants/joinTracks";
import JoinTrackInlineCardEditor from "./JoinTrackInlineCardEditor";

const normalizeOrderValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCurrentLoginEmail = (currentUser) => currentUser?.email?.trim() || "-";

const isFirestorePermissionError = (error) => {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  );
};

const getJoinTrackErrorMessage = (error, currentUser) => {
  if (isFirestorePermissionError(error)) {
    return [
      "Firestore 권한 오류입니다. joinTracks rules가 추가되었는지 확인해 주세요.",
      `현재 로그인 이메일: ${getCurrentLoginEmail(currentUser)}`,
      "Firebase Console > Firestore Rules에 joinTracks / joinPopups 권한이 추가되어야 합니다.",
    ].join("\n");
  }

  return "설정을 저장하는 중 오류가 발생했습니다.";
};

const textFieldClass =
  "mt-2 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-[#004aad] focus:bg-white";

const AdvancedTextField = ({ label, value, placeholder, onChange, textarea = false }) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
    </span>
    {textarea ? (
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className={`${textFieldClass} resize-none leading-relaxed`}
      />
    ) : (
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={textFieldClass}
      />
    )}
  </label>
);

const JoinTrackManager = ({ db, appId, currentUser }) => {
  const [trackDocs, setTrackDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const [managerNoticeTone, setManagerNoticeTone] = useState("blue");
  const clearTimersRef = useRef({});

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setTrackDocs(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  useEffect(
    () => () => {
      Object.values(clearTimersRef.current).forEach((timerId) => {
        if (timerId) {
          clearTimeout(timerId);
        }
      });
    },
    []
  );

  const sortedTracks = useMemo(() => mergeJoinTracks(trackDocs), [trackDocs]);
  const trackDocById = useMemo(
    () => new Map(trackDocs.map((track) => [track.id, track])),
    [trackDocs]
  );

  const setTimedSaveFeedback = (trackId, feedback) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [trackId]: feedback,
    }));

    if (clearTimersRef.current[trackId]) {
      clearTimeout(clearTimersRef.current[trackId]);
      clearTimersRef.current[trackId] = null;
    }

    if (feedback?.state === "saved") {
      clearTimersRef.current[trackId] = setTimeout(() => {
        setSaveFeedbacks((prev) => ({ ...prev, [trackId]: null }));
        clearTimersRef.current[trackId] = null;
      }, 2500);
    }
  };

  const updateDraftPatch = (trackId, patch) => {
    if (!patch || typeof patch !== "object") return;

    setSaveFeedbacks((prev) => ({
      ...prev,
      [trackId]: null,
    }));
    setDrafts((prev) => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        ...patch,
      },
    }));
  };

  const updateTrackVisibilityState = (trackId, nextState) => {
    updateDraftPatch(trackId, getJoinTrackVisibilityPatch(nextState));
  };

  const handleSeedDefaults = async () => {
    const hasStoredDocs = trackDocs.length > 0;
    if (hasStoredDocs) {
      const ok = window.confirm(
        "이미 저장된 joinTracks 문서가 있습니다. 기본 트랙 문서를 현재 값으로 덮어쓰시겠습니까?"
      );
      if (!ok) return;
    }

    try {
      await Promise.all(
        DEFAULT_JOIN_TRACKS.map((track) =>
          setDoc(
            doc(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION, track.id),
            {
              ...track,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );

      setManagerNotice("기본 트랙 문서가 생성되었습니다.");
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setManagerNotice(getJoinTrackErrorMessage(error, currentUser));
      setManagerNoticeTone("red");
    }
  };

  const handleSave = async (track) => {
    const savedTrack = trackDocById.get(track.id) || {};
    const draft = {
      ...savedTrack,
      ...(drafts[track.id] || {}),
    };
    const visibilityState = getJoinTrackVisibilityState(draft);
    const visibilityPatch = getJoinTrackVisibilityPatch(visibilityState);
    const payload = {
      ...draft,
      id: track.id,
      routeTrack: track.routeTrack || track.id,
      order: normalizeOrderValue(draft.order, track.order || 0),
      ...visibilityPatch,
      trackType: "join-track",
      updatedAt: serverTimestamp(),
      createdAt: draft.createdAt || track.createdAt || serverTimestamp(),
    };

    if (hasOwnField(draft, "statusLabel")) {
      payload.badgeText = draft.statusLabel;
    }

    setTimedSaveFeedback(track.id, {
      state: "saving",
      message: "저장 중...",
    });

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION, track.id),
        payload,
        { merge: true }
      );

      setTimedSaveFeedback(track.id, {
        state: "saved",
        message: "저장되었습니다.",
      });
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setTimedSaveFeedback(track.id, {
        state: "error",
        message: getJoinTrackErrorMessage(error, currentUser),
      });
      setManagerNoticeTone("red");
    }
  };

  return (
    <section className="mb-14 rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
            <Sparkles size={12} />
            Join Track Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">
            JOIN 허브 트랙 관리
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            JoinHome에서 보여줄 트랙의 상태와 시각 요소를 조정합니다.
            HIDE 상태만 메인 허브에서 숨겨집니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeedDefaults}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#004aad] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#004aad]/15 transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          기본 트랙 문서 생성
        </button>
      </div>

      {managerNotice ? (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-bold break-keep whitespace-pre-wrap ${
            managerNoticeTone === "red"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#004aad]/15 bg-[#004aad]/5 text-[#004aad]"
          }`}
        >
          {managerNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <Loader2 className="mx-auto animate-spin text-[#004aad]" size={24} />
          <p className="mt-3 text-sm font-bold text-zinc-400">
            joinTracks를 불러오는 중입니다...
          </p>
        </div>
      ) : sortedTracks.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-lg font-black text-zinc-900">등록된 joinTracks가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-zinc-400">
            기본 트랙 문서 생성 버튼으로 첫 트랙을 만들어 보세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {sortedTracks.map((track, index) => {
            const savedTrack = trackDocById.get(track.id) || {};
            const draft = {
              ...savedTrack,
              ...(drafts[track.id] || {}),
            };
            const feedback = saveFeedbacks[track.id];
            const visibilityState = getJoinTrackVisibilityState(draft);
            const entryStatusLabel =
              visibilityState === "hidden"
                ? "HIDE"
                : visibilityState.toUpperCase();
            const visibilityTone =
              visibilityState === "active"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : visibilityState === "disabled"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-rose-200 bg-rose-50 text-rose-700";
            const cardTone =
              visibilityState === "active"
                ? "border-[#004aad]/10 bg-[#004aad]/5"
                : visibilityState === "disabled"
                ? "border-amber-200 bg-amber-50/50"
                : "border-rose-200 bg-rose-50/40 opacity-90";

            return (
              <div
                key={track.id}
                className={`overflow-hidden rounded-[32px] border ${cardTone}`}
              >
                <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-4">
                    <JoinTrackInlineCardEditor
                      track={track}
                      index={index}
                      draft={draft}
                      onChange={(patch) => updateDraftPatch(track.id, patch)}
                      visibilityState={visibilityState}
                      onChangeVisibility={(nextState) =>
                        updateTrackVisibilityState(track.id, nextState)
                      }
                    />
                  </div>

                  <div className="rounded-[28px] border border-zinc-100 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="text-lg font-black tracking-tight text-zinc-900">고급 설정</h5>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                          왼쪽 카드와 같은 문구를 여기서도 직접 수정할 수 있습니다. ACTIVE로 열 때
                          버튼과 배지 문구를 함께 바꿔 주세요.
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${visibilityTone}`}
                      >
                        {entryStatusLabel}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-[22px] border border-[#004aad]/12 bg-[#004aad]/5 px-4 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                              표시 문구 편집
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-zinc-500 break-keep">
                              메인 입구 카드의 라벨, 배지, 버튼 문구를 저장합니다.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftPatch(track.id, {
                                shortLabel: track.routeTrack === "salon" ? "SALON" : draft.shortLabel || track.shortLabel,
                                statusLabel:
                                  track.routeTrack === "salon"
                                    ? "참여하기"
                                    : track.routeTrack === "open-call"
                                    ? "공모보기"
                                    : track.routeTrack === "rental"
                                    ? "신청하기"
                                    : draft.statusLabel || track.statusLabel || track.badgeText,
                                ctaLabel:
                                  track.routeTrack === "salon"
                                    ? "모임 신청하기"
                                    : track.routeTrack === "open-call"
                                    ? "공개모집 보기"
                                    : track.routeTrack === "rental"
                                    ? "신청 시작하기"
                                    : draft.ctaLabel || track.ctaLabel,
                              })
                            }
                            className="shrink-0 rounded-full border border-[#004aad]/20 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#004aad] transition-colors hover:bg-[#004aad] hover:text-white"
                          >
                            ACTIVE 문구 추천
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <AdvancedTextField
                            label="짧은 라벨"
                            value={getPreviewTextValue(draft, "shortLabel", track.shortLabel || "")}
                            placeholder="예: SALON"
                            onChange={(value) => updateDraftPatch(track.id, { shortLabel: value })}
                          />
                          <AdvancedTextField
                            label="배지 문구"
                            value={getPreviewTextValue(draft, "statusLabel", track.statusLabel || track.badgeText || "")}
                            placeholder="예: 참여하기"
                            onChange={(value) => updateDraftPatch(track.id, { statusLabel: value })}
                          />
                          <AdvancedTextField
                            label="버튼 문구"
                            value={getPreviewTextValue(draft, "ctaLabel", track.ctaLabel || "")}
                            placeholder="예: 모임 신청하기"
                            onChange={(value) => updateDraftPatch(track.id, { ctaLabel: value })}
                          />
                          <AdvancedTextField
                            label="상단 라벨"
                            value={getPreviewTextValue(draft, "eyebrow", track.eyebrow || "")}
                            placeholder="예: Event"
                            onChange={(value) => updateDraftPatch(track.id, { eyebrow: value })}
                          />
                          <AdvancedTextField
                            label="카드 제목"
                            value={getPreviewTextValue(draft, "title", track.title || "")}
                            placeholder="예: EVENT & SALON"
                            onChange={(value) => updateDraftPatch(track.id, { title: value })}
                          />
                          <AdvancedTextField
                            label="강조 색상"
                            value={getPreviewTextValue(draft, "accentColor", track.accentColor || "")}
                            placeholder="#004AAD"
                            onChange={(value) => updateDraftPatch(track.id, { accentColor: value })}
                          />
                          <div className="md:col-span-3">
                            <AdvancedTextField
                              label="설명"
                              value={getPreviewTextValue(draft, "description", track.description || "")}
                              placeholder="메인 카드에 표시할 설명"
                              textarea
                              onChange={(value) => updateDraftPatch(track.id, { description: value })}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <AdvancedTextField
                              label="배경 이미지 URL"
                              value={getPreviewTextValue(draft, "backgroundImageUrl", track.backgroundImageUrl || "")}
                              placeholder="https://..."
                              onChange={(value) => updateDraftPatch(track.id, { backgroundImageUrl: value })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          routeTrack
                        </p>
                        <p className="mt-2 text-sm font-black text-zinc-900 break-all">
                          {track.routeTrack || track.id}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          카드 문구
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                          {getPreviewTextValue(
                            draft,
                            "shortLabel",
                            track.shortLabel || track.routeTrack || track.id
                          )}
                          {"\n"}
                          {getPreviewTextValue(
                            draft,
                            "statusLabel",
                            track.statusLabel || track.badgeText || "OPEN"
                          )}
                          {"\n"}
                          {getPreviewTextValue(
                            draft,
                            "ctaLabel",
                            track.ctaLabel || "신청 시작하기"
                          )}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          기본 색상 / 배경
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <span
                            className="h-10 w-10 shrink-0 rounded-2xl border border-zinc-200"
                            style={{
                              backgroundColor: getPreviewTextValue(
                                draft,
                                "accentColor",
                                track.accentColor || "#004AAD"
                              ),
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-900 break-all">
                              {getPreviewTextValue(
                                draft,
                                "accentColor",
                                track.accentColor || "#004AAD"
                              )}
                            </p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                              {getPreviewTextValue(
                                draft,
                                "backgroundImageUrl",
                                track.backgroundImageUrl || ""
                              ) || "배경 이미지 없음"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {feedback?.message ? (
                        <div
                          className={`rounded-[22px] border px-4 py-3 text-sm font-bold break-keep whitespace-pre-wrap ${
                            feedback.state === "error"
                              ? "border-red-200 bg-red-50 text-red-600"
                              : feedback.state === "saved"
                              ? "border-[#004aad]/15 bg-[#004aad]/5 text-[#004aad]"
                              : "border-zinc-200 bg-zinc-50 text-zinc-500"
                          }`}
                        >
                          {feedback.message}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleSave(track)}
                        disabled={feedback?.state === "saving"}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save size={14} />
                        {feedback?.state === "saving" ? "저장 중..." : "설정 저장"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default JoinTrackManager;

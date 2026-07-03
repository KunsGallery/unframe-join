import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Save, Sparkles } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  DEFAULT_JOIN_TRACKS,
  JOIN_TRACK_ENTRY_STATUSES,
  JOIN_TRACK_COLLECTION,
  mergeJoinTracks,
} from "../../constants/joinTracks";
import JoinTrackInlineCardEditor from "./JoinTrackInlineCardEditor";

const normalizeText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

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

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };

      sortedTracks.forEach((track) => {
        if (!next[track.id]) {
          next[track.id] = {
            title: track.title || "",
            eyebrow: track.eyebrow || "",
            description: track.description || "",
            ctaLabel: track.ctaLabel || "",
            statusLabel: track.statusLabel ?? track.badgeText ?? "",
            shortLabel: track.shortLabel || "",
            badgeText: track.badgeText || "",
            accentColor: track.accentColor || "#004AAD",
            backgroundImageUrl: track.backgroundImageUrl || "",
            order: track.order ?? 0,
            enabled: track.enabled !== false,
            entryStatus: track.entryStatus || (track.enabled === false ? "hidden" : "active"),
            preparingTitle: track.preparingTitle || "준비 중입니다.",
            preparingMessage: track.preparingMessage || "현재 해당 접수는 준비 중입니다.",
            preparingConfirmLabel: track.preparingConfirmLabel || "확인",
          };
        }
      });

      return next;
    });
  }, [sortedTracks]);

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

  const updateDraft = (trackId, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [trackId]: null,
    }));
    setDrafts((prev) => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        [key]: value,
      },
    }));
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
    const draft = drafts[track.id] || {};
    const entryStatus = JOIN_TRACK_ENTRY_STATUSES.includes(draft.entryStatus)
      ? draft.entryStatus
      : track.entryStatus || (track.enabled === false ? "hidden" : "active");
    const payload = {
      ...track,
      title: normalizeText(draft.title, track.title || ""),
      eyebrow: normalizeText(draft.eyebrow, track.eyebrow || ""),
      description: normalizeText(draft.description, track.description || ""),
      ctaLabel: normalizeText(draft.ctaLabel, track.ctaLabel || ""),
      statusLabel: normalizeText(
        draft.statusLabel,
        track.statusLabel ?? track.badgeText ?? ""
      ),
      shortLabel: normalizeText(draft.shortLabel, track.shortLabel || ""),
      badgeText: normalizeText(
        draft.statusLabel || draft.badgeText,
        track.badgeText || track.statusLabel || ""
      ),
      accentColor: normalizeText(draft.accentColor, track.accentColor || "#004AAD"),
      backgroundImageUrl: normalizeText(
        draft.backgroundImageUrl,
        track.backgroundImageUrl || ""
      ),
      order: normalizeOrderValue(draft.order, track.order || 0),
      enabled: entryStatus !== "hidden",
      entryStatus,
      preparingTitle: normalizeText(draft.preparingTitle, "준비 중입니다."),
      preparingMessage: normalizeText(
        draft.preparingMessage,
        "현재 해당 접수는 준비 중입니다."
      ),
      preparingConfirmLabel: normalizeText(draft.preparingConfirmLabel, "확인"),
      routeTrack: track.routeTrack || track.id,
      trackType: "join-track",
      updatedAt: serverTimestamp(),
      createdAt: track.createdAt || serverTimestamp(),
    };

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
            JoinHome에서 보여줄 트랙의 사용 여부와 시각 요소를 조정합니다.
            비활성 트랙은 메인 허브에서 숨겨집니다.
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
            const draft = drafts[track.id] || {};
            const feedback = saveFeedbacks[track.id];
            const entryStatus = draft.entryStatus || track.entryStatus || "active";

            return (
              <div
                key={track.id}
                className={`overflow-hidden rounded-[32px] border ${
                  entryStatus !== "hidden"
                    ? "border-zinc-100 bg-zinc-50/70"
                    : "border-zinc-200 bg-zinc-50/40 opacity-90"
                }`}
              >
                <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-4">
                    <JoinTrackInlineCardEditor
                      track={track}
                      index={index}
                      draft={draft}
                      onChange={(patch) => updateDraftPatch(track.id, patch)}
                    />
                  </div>

                  <div className="rounded-[28px] border border-zinc-100 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="text-lg font-black tracking-tight text-zinc-900">고급 설정</h5>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                          텍스트는 왼쪽 카드에서 직접 수정하고, 여기서는 노출 상태와 기본 옵션을
                          조정합니다.
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          entryStatus !== "hidden"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {entryStatus}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3">
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
                          {draft.shortLabel ?? track.shortLabel ?? track.routeTrack ?? track.id}
                          {"\n"}
                          {draft.statusLabel ?? draft.badgeText ?? track.statusLabel ?? track.badgeText ?? "OPEN"}
                          {"\n"}
                          {draft.ctaLabel ?? track.ctaLabel ?? "신청 시작하기"}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          기본 색상 / 배경
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <span
                            className="h-10 w-10 shrink-0 rounded-2xl border border-zinc-200"
                            style={{ backgroundColor: draft.accentColor || track.accentColor || "#004AAD" }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-900 break-all">
                              {draft.accentColor || track.accentColor || "#004AAD"}
                            </p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                              {draft.backgroundImageUrl || track.backgroundImageUrl || "배경 이미지 없음"}
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

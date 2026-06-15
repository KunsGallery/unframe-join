import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  DEFAULT_JOIN_TRACKS,
  JOIN_TRACK_COLLECTION,
  mergeJoinTracks,
} from "../../constants/joinTracks";

const hexToRgba = (hex, alpha = 1) => {
  const fallback = `rgba(0, 74, 173, ${alpha})`;
  if (typeof hex !== "string") return fallback;

  const normalized = hex.trim();
  const match = normalized.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return fallback;

  const value =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((char) => char + char)
          .join("")
      : match[1];

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildPreviewStyle = (track) => {
  if (track?.backgroundImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(12, 12, 16, 0.1), rgba(12, 12, 16, 0.7)), url(${track.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: track.accentColor || "#004AAD",
    };
  }

  const accentColor = track?.accentColor || "#004AAD";
  return {
    backgroundImage: `linear-gradient(135deg, ${hexToRgba(accentColor, 0.18)} 0%, rgba(246, 244, 238, 0.96) 58%, ${hexToRgba(
      accentColor,
      0.1
    )} 100%)`,
    backgroundColor: hexToRgba(accentColor, 0.08),
  };
};

const normalizeText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeOrderValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatFirestorePermissionMessage = (error) => {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  ) {
    return "Firestore 권한 오류입니다. joinTracks rules가 추가되었는지 확인해 주세요.";
  }

  return "저장 중 오류가 발생했습니다.";
};

const JoinTrackManager = ({ db, appId }) => {
  const [trackDocs, setTrackDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const clearTimersRef = useRef({});

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setTrackDocs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
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
            badgeText: track.badgeText || "",
            accentColor: track.accentColor || "#004AAD",
            backgroundImageUrl: track.backgroundImageUrl || "",
            order: track.order ?? 0,
            enabled: track.enabled !== false,
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
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
    }
  };

  const handleSave = async (track) => {
    const draft = drafts[track.id] || {};
    const payload = {
      ...track,
      title: normalizeText(draft.title, track.title || ""),
      eyebrow: normalizeText(draft.eyebrow, track.eyebrow || ""),
      description: normalizeText(draft.description, track.description || ""),
      badgeText: normalizeText(draft.badgeText, track.badgeText || ""),
      accentColor: normalizeText(draft.accentColor, track.accentColor || "#004AAD"),
      backgroundImageUrl: normalizeText(draft.backgroundImageUrl, track.backgroundImageUrl || ""),
      order: normalizeOrderValue(draft.order, track.order || 0),
      enabled: draft.enabled !== false,
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
    } catch (error) {
      console.error(error);
      setTimedSaveFeedback(track.id, {
        state: "error",
        message: formatFirestorePermissionMessage(error),
      });
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
        <div className="mb-5 rounded-2xl border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-sm font-bold text-[#004aad] break-keep">
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
          {sortedTracks.map((track) => {
            const draft = drafts[track.id] || {};
            const previewStyle = buildPreviewStyle({
              accentColor: draft.accentColor || track.accentColor,
              backgroundImageUrl: draft.backgroundImageUrl || track.backgroundImageUrl,
            });
            const feedback = saveFeedbacks[track.id];

            return (
              <div
                key={track.id}
                className={`overflow-hidden rounded-[32px] border ${
                  draft.enabled ?? track.enabled
                    ? "border-zinc-100 bg-zinc-50/70"
                    : "border-zinc-200 bg-zinc-50/40 opacity-90"
                }`}
              >
                <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div
                      className="relative overflow-hidden rounded-[28px] border border-white/70 p-5"
                      style={previewStyle}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,16,0.06),rgba(12,12,16,0.72))]" />
                      <div className="relative flex min-h-[18rem] flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                            {track.routeTrack || track.id}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                            {draft.enabled ?? track.enabled ? (
                              <>
                                <Eye size={12} />
                                visible
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} />
                                hidden
                              </>
                            )}
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">
                            {draft.eyebrow || track.eyebrow || "UNFRAME"}
                          </p>
                          <h4 className="mt-3 text-3xl font-black tracking-tighter text-white break-keep">
                            {draft.title || track.title}
                          </h4>
                          <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-white/80 break-keep">
                            {draft.description || track.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          enabled
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDraft(track.id, "enabled", !(draft.enabled ?? track.enabled))}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                            draft.enabled ?? track.enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {draft.enabled ?? track.enabled ? (
                            <>
                              <Eye size={12} />
                              활성화
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} />
                              비활성화
                            </>
                          )}
                        </button>
                      </div>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          order
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={draft.order ?? 0}
                          onChange={(e) => updateDraft(track.id, "order", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          eyebrow
                        </span>
                        <input
                          value={draft.eyebrow || ""}
                          onChange={(e) => updateDraft(track.id, "eyebrow", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          badgeText
                        </span>
                        <input
                          value={draft.badgeText || ""}
                          onChange={(e) => updateDraft(track.id, "badgeText", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          title
                        </span>
                        <input
                          value={draft.title || ""}
                          onChange={(e) => updateDraft(track.id, "title", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          description
                        </span>
                        <textarea
                          rows={4}
                          value={draft.description || ""}
                          onChange={(e) => updateDraft(track.id, "description", e.target.value)}
                          className="w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          accentColor
                        </span>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={draft.accentColor || "#004AAD"}
                            onChange={(e) => updateDraft(track.id, "accentColor", e.target.value)}
                            className="h-11 w-14 rounded-xl border border-zinc-100 bg-transparent p-1"
                          />
                          <input
                            value={draft.accentColor || "#004AAD"}
                            onChange={(e) => updateDraft(track.id, "accentColor", e.target.value)}
                            className="min-w-0 flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                          />
                        </div>
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          backgroundImageUrl
                        </span>
                        <div className="flex items-center gap-3">
                          <ImageIcon size={16} className="shrink-0 text-zinc-300" />
                          <input
                            value={draft.backgroundImageUrl || ""}
                            onChange={(e) =>
                              updateDraft(track.id, "backgroundImageUrl", e.target.value)
                            }
                            placeholder="https://..."
                            className="min-w-0 flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-100 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="text-lg font-black tracking-tight text-zinc-900">트랙 편집</h5>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                          활성화 상태, 카피, 색상, 배경 이미지를 수정한 뒤 저장해 주세요.
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          draft.enabled ?? track.enabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {draft.enabled ?? track.enabled ? "visible" : "hidden"}
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

                      {feedback?.message ? (
                        <div
                          className={`rounded-[22px] border px-4 py-3 text-sm font-bold break-keep ${
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
                        {feedback?.state === "saving" ? "저장 중..." : "공고 저장"}
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

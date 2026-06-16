import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Sparkles,
  X,
  Trash2,
} from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import {
  JOIN_POPUP_COLLECTION,
  getJoinPopupWindowStatus,
  parseJoinPopupDate,
  sortJoinPopups,
} from "../../constants/joinPopups";

const TARGET_TRACK_OPTIONS = [
  { value: "rental", label: "rental" },
  { value: "open-call", label: "open-call" },
  { value: "salon", label: "salon" },
  { value: "collaboration", label: "collaboration" },
];

const createBlankPopup = () => {
  const id = `join-popup-${Date.now()}`;
  return {
    id,
    title: "",
    subtitle: "",
    body: "",
    posterImageUrl: "",
    enabled: false,
    priority: 999,
    targetTrack: "open-call",
    ctaLabel: "신청하러 가기",
    dismissLabel: "닫기",
    startAt: "",
    endAt: "",
  };
};

const createExamplePopup = () => ({
  id: "open-call-afterimage-2026",
  title: "2026 UNFRAME OPEN CALL 01. 잔상",
  subtitle: "설명보다 먼저 마음에 남는 작품을 찾습니다.",
  body:
    "UNFRAME의 첫 번째 오픈콜이 진행 중입니다. 작품 자체의 힘으로 시선을 붙잡는 창작자를 기다립니다.",
  posterImageUrl: "",
  enabled: false,
  priority: 1,
  targetTrack: "open-call",
  ctaLabel: "오픈콜 신청하러 가기",
  dismissLabel: "닫기",
  startAt: "",
  endAt: "",
});

const toDatetimeLocalValue = (value) => {
  if (!value) return "";
  const date = parseJoinPopupDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const normalizeText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeNumber = (value, fallback = 999) => {
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

const getJoinPopupErrorMessage = (error, currentUser) => {
  if (isFirestorePermissionError(error)) {
    return [
      "Firestore 권한 오류입니다. joinPopups rules가 추가되었는지 확인해 주세요.",
      `현재 로그인 이메일: ${getCurrentLoginEmail(currentUser)}`,
      "Firebase Console > Firestore Rules에 joinTracks / joinPopups 권한이 추가되어야 합니다.",
    ].join("\n");
  }

  return "팝업 설정을 저장하는 중 오류가 발생했습니다.";
};

const JoinPopupPreviewModal = ({ popup, onClose }) => {
  if (!popup) return null;

  const poster = popup.posterImageUrl?.trim();
  const ctaLabel = popup.ctaLabel?.trim() || "신청하러 가기";
  const dismissLabel = popup.dismissLabel?.trim() || "닫기";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-zinc-950/10 bg-[#F6F4EE] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="팝업 미리보기 닫기"
          className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-950/10 bg-white/90 text-zinc-700 shadow-sm transition-colors hover:text-zinc-950"
        >
          <X size={18} />
        </button>

        <div className="grid min-h-[32rem] md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[18rem] overflow-hidden bg-[#004AAD]">
            {poster ? (
              <img
                src={poster}
                alt={popup.title || "Join popup preview"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#004AAD_0%,#AAD004_54%,#F6F4EE_100%)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-white/10" />
            <div className="absolute inset-y-0 right-0 w-16 skew-x-[-8deg] bg-white/20 opacity-40 mix-blend-overlay" />
            <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              <Sparkles size={11} />
              JOIN POPUP PREVIEW
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 text-zinc-950 md:p-8 lg:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#004AAD]">
                PREVIEW ONLY
              </p>
              <h2 className="mt-4 text-[2rem] font-black tracking-tighter text-zinc-950 break-keep md:text-[2.6rem]">
                {popup.title || "공지"}
              </h2>
              <p className="mt-4 text-base font-bold leading-relaxed text-zinc-700 break-keep md:text-lg">
                {popup.subtitle || ""}
              </p>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                {popup.body || ""}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-3 py-1.5 text-[#004AAD]">
                  {popup.targetTrack || "open-call"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
                  {popup.priority != null ? `priority ${popup.priority}` : "priority 999"}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-opacity hover:opacity-90"
              >
                {ctaLabel}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-950/10 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
              >
                {dismissLabel}
              </button>
            </div>

            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              미리보기에서는 실제 JoinHome 이동이 발생하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const JoinPopupManager = ({ db, appId, currentUser }) => {
  const [popupDocs, setPopupDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const [managerNoticeTone, setManagerNoticeTone] = useState("blue");
  const [previewPopup, setPreviewPopup] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const clearTimersRef = useRef({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setPopupDocs(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
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
        if (timerId) clearTimeout(timerId);
      });
    },
    []
  );

  const sortedPopups = useMemo(() => sortJoinPopups(popupDocs), [popupDocs]);
  const currentTime = useMemo(() => new Date(nowTick), [nowTick]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };

      sortedPopups.forEach((popup) => {
        if (!next[popup.id]) {
          next[popup.id] = {
            title: popup.title || "",
            subtitle: popup.subtitle || "",
            body: popup.body || "",
            posterImageUrl: popup.posterImageUrl || "",
            enabled: popup.enabled !== false,
            priority: popup.priority ?? 999,
            targetTrack: popup.targetTrack || "open-call",
            ctaLabel: popup.ctaLabel || "",
            dismissLabel: popup.dismissLabel || "",
            startAt: toDatetimeLocalValue(popup.startAt),
            endAt: toDatetimeLocalValue(popup.endAt),
          };
        }
      });

      return next;
    });
  }, [sortedPopups]);

  const setTimedSaveFeedback = (popupId, feedback) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [popupId]: feedback,
    }));

    if (clearTimersRef.current[popupId]) {
      clearTimeout(clearTimersRef.current[popupId]);
      clearTimersRef.current[popupId] = null;
    }

    if (feedback?.state === "saved") {
      clearTimersRef.current[popupId] = setTimeout(() => {
        setSaveFeedbacks((prev) => ({ ...prev, [popupId]: null }));
        clearTimersRef.current[popupId] = null;
      }, 2500);
    }
  };

  const updateDraft = (popupId, key, value) => {
    setSaveFeedbacks((prev) => ({ ...prev, [popupId]: null }));
    setDrafts((prev) => ({
      ...prev,
      [popupId]: {
        ...(prev[popupId] || {}),
        [key]: value,
      },
    }));
  };

  const clearPopupDismissHistory = () => {
    const keysToRemove = Object.keys(window.localStorage).filter((key) =>
      key.includes("unframe-join-popup")
    );
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    setManagerNotice("이 브라우저의 팝업 닫힘 기록을 초기화했습니다.");
    setManagerNoticeTone("blue");
  };

  const handleCreatePopup = async () => {
    const popup = createBlankPopup();
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION, popup.id),
        {
          ...popup,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setManagerNotice("새 팝업이 생성되었습니다.");
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setManagerNotice(getJoinPopupErrorMessage(error, currentUser));
      setManagerNoticeTone("red");
    }
  };

  const handleSeedExample = async () => {
    const example = createExamplePopup();
    const existing = sortedPopups.find((popup) => popup.id === example.id);
    if (existing) {
      const ok = window.confirm(
        "오픈콜 팝업 예시가 이미 있습니다. 현재 값으로 덮어쓰시겠습니까?"
      );
      if (!ok) return;
    }

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION, example.id),
        {
          ...example,
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setManagerNotice("오픈콜 팝업 예시가 생성되었습니다.");
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setManagerNotice(getJoinPopupErrorMessage(error, currentUser));
      setManagerNoticeTone("red");
    }
  };

  const handleSave = async (popup) => {
    const draft = drafts[popup.id] || {};
    const payload = {
      ...popup,
      title: normalizeText(draft.title, popup.title || ""),
      subtitle: normalizeText(draft.subtitle, popup.subtitle || ""),
      body: normalizeText(draft.body, popup.body || ""),
      posterImageUrl: normalizeText(draft.posterImageUrl, popup.posterImageUrl || ""),
      enabled: draft.enabled !== false,
      priority: normalizeNumber(draft.priority, popup.priority ?? 999),
      targetTrack: ["rental", "open-call", "salon", "collaboration"].includes(draft.targetTrack)
        ? draft.targetTrack
        : popup.targetTrack || "open-call",
      ctaLabel: normalizeText(draft.ctaLabel, popup.ctaLabel || "신청하러 가기"),
      dismissLabel: normalizeText(draft.dismissLabel, popup.dismissLabel || "닫기"),
      startAt: normalizeText(draft.startAt, popup.startAt || ""),
      endAt: normalizeText(draft.endAt, popup.endAt || ""),
      updatedAt: serverTimestamp(),
      createdAt: popup.createdAt || serverTimestamp(),
    };

    setTimedSaveFeedback(popup.id, {
      state: "saving",
      message: "저장 중...",
    });

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION, popup.id),
        payload,
        { merge: true }
      );

      setTimedSaveFeedback(popup.id, {
        state: "saved",
        message: "저장되었습니다.",
      });
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setTimedSaveFeedback(popup.id, {
        state: "error",
        message: getJoinPopupErrorMessage(error, currentUser),
      });
      setManagerNoticeTone("red");
    }
  };

  const handleDelete = async (popup) => {
    const ok = window.confirm(`"${popup.title || popup.id}" 팝업을 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION, popup.id));
      setManagerNotice("팝업이 삭제되었습니다.");
      setManagerNoticeTone("blue");
    } catch (error) {
      console.error(error);
      setManagerNotice(getJoinPopupErrorMessage(error, currentUser));
      setManagerNoticeTone("red");
    }
  };

  return (
    <section className="mb-14 rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
            <Sparkles size={12} />
            Join Popup Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">
            JOIN 팝업 / 공지 관리
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            JoinHome 진입 시 노출할 공지 모달을 관리합니다. 활성화, 우선순위, 기간,
            CTA와 닫기 문구를 조정할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreatePopup}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
          >
            <Plus size={14} />
            새 팝업 추가
          </button>

          <button
            type="button"
            onClick={handleSeedExample}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#004aad] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#004aad]/15 transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            오픈콜 팝업 예시 생성
          </button>

          <button
            type="button"
            onClick={clearPopupDismissHistory}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
          >
            이 브라우저 팝업 닫힘 기록 초기화
          </button>
        </div>
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
            joinPopups를 불러오는 중입니다...
          </p>
        </div>
      ) : sortedPopups.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-lg font-black text-zinc-900">등록된 joinPopups가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-zinc-400">
            오픈콜 팝업 예시 생성 버튼으로 첫 팝업을 만들어 보세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {sortedPopups.map((popup) => {
            const draft = drafts[popup.id] || {};
            const feedback = saveFeedbacks[popup.id];
            const effectivePopup = { ...popup, ...draft, id: popup.id };
            const visibilityStatus = getJoinPopupWindowStatus(effectivePopup, currentTime);
            const hasPoster = Boolean(effectivePopup.posterImageUrl?.trim());
            const canShowOnJoinHome =
              effectivePopup.enabled !== false && visibilityStatus.withinRange;

            return (
              <div
                key={popup.id}
                className={`overflow-hidden rounded-[32px] border ${
                  draft.enabled ?? popup.enabled
                    ? "border-zinc-100 bg-zinc-50/70"
                    : "border-zinc-200 bg-zinc-50/40 opacity-90"
                }`}
              >
                <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-[28px] border border-zinc-950/10 bg-[#F6F4EE] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
                      {draft.posterImageUrl || popup.posterImageUrl ? (
                        <>
                          <img
                            src={draft.posterImageUrl || popup.posterImageUrl}
                            alt={draft.title || popup.title || popup.id}
                            className="h-[22rem] w-full rounded-[22px] object-cover"
                          />
                          <div className="absolute inset-5 rounded-[22px] bg-gradient-to-t from-zinc-950/35 via-transparent to-white/5" />
                        </>
                      ) : (
                        <div className="flex h-[22rem] items-end rounded-[22px] border border-zinc-950/10 bg-[linear-gradient(135deg,#004AAD_0%,#F6F4EE_58%,#ffffff_100%)] p-5">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700/75">
                              UNFRAME NOTICE
                            </p>
                            <h4 className="mt-3 text-3xl font-black tracking-tighter text-zinc-950 break-keep">
                              {draft.title || popup.title || "팝업 제목"}
                            </h4>
                            <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-zinc-700/90 break-keep">
                              {draft.subtitle || popup.subtitle || "팝업 서브타이틀"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-950/10 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                          {draft.enabled ?? popup.enabled ? (
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
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-950/10 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                          priority {effectivePopup.priority ?? 999}
                        </span>
                      </div>

                      <div className="mt-4 rounded-[22px] border border-dashed border-zinc-200 bg-white/85 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            진단
                          </p>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              canShowOnJoinHome
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            현재 JoinHome 노출 가능: {canShowOnJoinHome ? "YES" : "NO"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-[11px] font-bold text-zinc-600">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">popup id</span>
                            <span className="break-all text-right text-zinc-900">
                              {effectivePopup.id}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">enabled</span>
                            <span className="text-right text-zinc-900">
                              {effectivePopup.enabled !== false ? "true" : "false"}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">startAt</span>
                            <span className="break-all text-right text-zinc-900">
                              {effectivePopup.startAt || "-"}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">endAt</span>
                            <span className="break-all text-right text-zinc-900">
                              {effectivePopup.endAt || "-"}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">targetTrack</span>
                            <span className="text-right text-zinc-900">
                              {effectivePopup.targetTrack || "-"}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">priority</span>
                            <span className="text-right text-zinc-900">
                              {effectivePopup.priority ?? 999}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-400">posterImageUrl</span>
                            <span className="text-right text-zinc-900">
                              {hasPoster ? "있음" : "없음"}
                            </span>
                          </div>
                          {visibilityStatus.hasDateFormatIssue ? (
                            <p className="pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                              날짜 형식 확인 필요
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-100 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="text-lg font-black tracking-tight text-zinc-900">
                          팝업 편집
                        </h5>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                          활성화 여부, 문구, 포스터 URL, 노출 기간과 CTA를 수정할 수 있습니다.
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          draft.enabled ?? popup.enabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {draft.enabled ?? popup.enabled ? "visible" : "hidden"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          enabled
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(popup.id, "enabled", !(draft.enabled ?? popup.enabled))
                          }
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                            draft.enabled ?? popup.enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {draft.enabled ?? popup.enabled ? "활성화" : "비활성화"}
                        </button>
                      </div>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          priority
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={draft.priority ?? 999}
                          onChange={(e) => updateDraft(popup.id, "priority", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          title
                        </span>
                        <input
                          value={draft.title || ""}
                          onChange={(e) => updateDraft(popup.id, "title", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          subtitle
                        </span>
                        <textarea
                          rows={3}
                          value={draft.subtitle || ""}
                          onChange={(e) => updateDraft(popup.id, "subtitle", e.target.value)}
                          className="w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          body
                        </span>
                        <textarea
                          rows={5}
                          value={draft.body || ""}
                          onChange={(e) => updateDraft(popup.id, "body", e.target.value)}
                          className="w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3 sm:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          posterImageUrl
                        </span>
                        <input
                          value={draft.posterImageUrl || ""}
                          onChange={(e) => updateDraft(popup.id, "posterImageUrl", e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          targetTrack
                        </span>
                        <select
                          value={draft.targetTrack || "open-call"}
                          onChange={(e) => updateDraft(popup.id, "targetTrack", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        >
                          {TARGET_TRACK_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          ctaLabel
                        </span>
                        <input
                          value={draft.ctaLabel || ""}
                          onChange={(e) => updateDraft(popup.id, "ctaLabel", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          dismissLabel
                        </span>
                        <input
                          value={draft.dismissLabel || ""}
                          onChange={(e) => updateDraft(popup.id, "dismissLabel", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          startAt
                        </span>
                        <input
                          type="datetime-local"
                          value={draft.startAt || ""}
                          onChange={(e) => updateDraft(popup.id, "startAt", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>

                      <label className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          endAt
                        </span>
                        <input
                          type="datetime-local"
                          value={draft.endAt || ""}
                          onChange={(e) => updateDraft(popup.id, "endAt", e.target.value)}
                          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
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
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-400">
                          팝업을 수정한 뒤 저장해 주세요.
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPopup(effectivePopup)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          팝업 미리보기
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSave(popup)}
                          disabled={feedback?.state === "saving"}
                          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save size={14} />
                          {feedback?.state === "saving" ? "저장 중..." : "팝업 저장"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(popup)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <JoinPopupPreviewModal popup={previewPopup} onClose={() => setPreviewPopup(null)} />
    </section>
  );
};

export default JoinPopupManager;

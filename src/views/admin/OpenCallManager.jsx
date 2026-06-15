import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  FileText,
  Download,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Star,
  StarOff,
  Users,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  OPEN_CALL_FALLBACK,
  createFallbackOpenCall,
} from "../../constants/openCall";

const STATUS_OPTIONS = ["draft", "open", "closed", "archived"];
const OPEN_CALL_REVIEW_STATUS_OPTIONS = [
  "review",
  "shortlisted",
  "selected",
  "rejected",
];

const OPEN_CALL_REVIEW_STATUS_META = {
  review: {
    label: "검토 중",
    tone: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  shortlisted: {
    label: "1차 후보",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  selected: {
    label: "선정",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "미선정",
    tone: "bg-red-50 text-red-600 border-red-200",
  },
};

const STATUS_META = {
  draft: {
    label: "draft",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  open: {
    label: "open",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  closed: {
    label: "closed",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  archived: {
    label: "archived",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

const createEmptySection = () => ({ title: "", body: "" });

const normalizeSections = (sections) => {
  const list = Array.isArray(sections) ? sections : [];
  if (list.length === 0) {
    return [createEmptySection()];
  }

  return list.map((section) => ({
    title: section?.title || "",
    body: section?.body || "",
  }));
};

const toDatetimeLocalValue = (value) => {
  if (!value) return "";

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date?.getTime?.())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
};

const normalizeCall = (call) =>
  createFallbackOpenCall({
    ...call,
    id: call?.id || OPEN_CALL_FALLBACK.id,
  });

const getApplicantTitle = (app) =>
  app.name || app.applicantEmail || app.phone || "Applicant";

const getApplicantItems = (applications, openCallId) =>
  (applications || [])
    .filter(
      (app) => app.trackType === "open-call" && app.openCallId === openCallId
    )
    .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));

const normalizeOpenCallReviewStatus = (value) =>
  OPEN_CALL_REVIEW_STATUS_OPTIONS.includes(value) ? value : "review";

const getOpenCallReviewMeta = (value) =>
  OPEN_CALL_REVIEW_STATUS_META[normalizeOpenCallReviewStatus(value)];

const escapeCsv = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
};

const getPlainText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const getWorkValue = (work, key) => getPlainText(work?.[key] || "");

const getOpenCallFileSlug = (call) => {
  const raw = call?.id || call?.slug || OPEN_CALL_FALLBACK.slug;
  return String(raw).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
};

const OpenCallManager = ({ db, appId, applications }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpenCallId, setSelectedOpenCallId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const [reviewSavingMap, setReviewSavingMap] = useState({});
  const [memoDrafts, setMemoDrafts] = useState({});
  const [memoSavingMap, setMemoSavingMap] = useState({});
  const clearTimersRef = useRef({});

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", "openCalls");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOpenCalls(list);
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

  const sortedCalls = useMemo(() => {
    return [...openCalls]
      .map(normalizeCall)
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [openCalls]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      sortedCalls.forEach((call) => {
        if (!next[call.id]) {
          next[call.id] = {
            title: call.title || "",
            subtitle: call.subtitle || "",
            status: call.status || "draft",
            introText: call.introText || "",
            badgeText: call.badgeText || "OPEN",
            heroTitle: call.heroTitle || "",
            heroAccent: call.heroAccent || "",
            isVisible: call.isVisible !== false,
            isFeatured: !!call.isFeatured,
            descriptionSections: normalizeSections(call.descriptionSections),
            mediumText: call.mediumText || "",
            eligibilityText: call.eligibilityText || "",
            benefitText: call.benefitText || "",
            magazineText: call.magazineText || "",
            applyButtonText: call.applyButtonText || "",
            applicationStartAt: toDatetimeLocalValue(call.applicationStartAt),
            applicationEndAt: toDatetimeLocalValue(call.applicationEndAt),
            announcementAt: toDatetimeLocalValue(call.announcementAt),
          };
        }
      });
      return next;
    });
  }, [sortedCalls]);

  useEffect(() => {
    setMemoDrafts((prev) => {
      const next = { ...prev };
      sortedCalls.forEach((call) => {
        const callApplications = getApplicantItems(applications, call.id);
        callApplications.forEach((app) => {
          if (next[app.id] === undefined) {
            next[app.id] = app.openCallAdminMemo || "";
          }
        });
      });
      return next;
    });
  }, [applications, sortedCalls]);

  const updateDraft = (callId, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => ({
      ...prev,
      [callId]: {
        ...(prev[callId] || {}),
        [key]: value,
      },
    }));
  };

  const updateDescriptionSection = (callId, index, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const sections = normalizeSections(current.descriptionSections);

      return {
        ...prev,
        [callId]: {
          ...current,
          descriptionSections: sections.map((section, sectionIndex) =>
            sectionIndex === index ? { ...section, [key]: value } : section
          ),
        },
      };
    });
  };

  const addDescriptionSection = (callId) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const sections = normalizeSections(current.descriptionSections);
      return {
        ...prev,
        [callId]: {
          ...current,
          descriptionSections: [...sections, createEmptySection()],
        },
      };
    });
  };

  const removeDescriptionSection = (callId, index) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const sections = normalizeSections(current.descriptionSections).filter(
        (_, sectionIndex) => sectionIndex !== index
      );

      return {
        ...prev,
        [callId]: {
          ...current,
          descriptionSections:
            sections.length > 0 ? sections : [createEmptySection()],
        },
      };
    });
  };

  const handleSeedDefault = async () => {
    const fallback = createFallbackOpenCall();
    const existing = sortedCalls.find((call) => call.id === fallback.id);
    if (existing) {
      const ok = window.confirm(
        "기본 잔상 공고가 이미 있습니다. 현재 값으로 덮어쓰시겠습니까?"
      );
      if (!ok) return;
    }

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", fallback.id),
        {
          ...fallback,
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSelectedOpenCallId(fallback.id);
      setManagerNotice("기본 잔상 공고가 생성되었습니다.");
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
    }
  };

  const setTimedSaveFeedback = (callId, feedback) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: feedback,
    }));

    if (clearTimersRef.current[callId]) {
      clearTimeout(clearTimersRef.current[callId]);
      clearTimersRef.current[callId] = null;
    }

    if (feedback?.state === "saved") {
      clearTimersRef.current[callId] = setTimeout(() => {
        setSaveFeedbacks((prev) => ({ ...prev, [callId]: null }));
        clearTimersRef.current[callId] = null;
      }, 2500);
    }
  };

  const handleSave = async (call) => {
    const draft = drafts[call.id] || {};
    const payload = {
      ...call,
      ...draft,
      descriptionSections: normalizeSections(draft.descriptionSections).map((section) => ({
        title: section.title || "",
        body: section.body || "",
      })),
      id: call.id,
      trackType: "open-call",
      updatedAt: serverTimestamp(),
      createdAt: call.createdAt || serverTimestamp(),
    };

    setTimedSaveFeedback(call.id, {
      state: "saving",
      message: "저장 중...",
    });

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", call.id),
        payload,
        { merge: true }
      );
      setTimedSaveFeedback(call.id, {
        state: "saved",
        message: "저장되었습니다.",
      });
    } catch (error) {
      console.error(error);
      setTimedSaveFeedback(call.id, {
        state: "error",
        message: formatFirestorePermissionMessage(error),
      });
    }
  };

  const formatFirestorePermissionMessage = (error) => {
    const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    if (
      message.includes("permission-denied") ||
      message.includes("missing or insufficient permissions")
    ) {
      return "Firestore 권한 오류입니다. openCalls rules가 추가되었는지 확인해 주세요.";
    }

    return "저장 중 오류가 발생했습니다.";
  };

  const updateApplicationDoc = async (appIdToUpdate, data) => {
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "applications", appIdToUpdate),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    );
  };

  const handleReviewStatusChange = async (app, nextStatus) => {
    const normalized = normalizeOpenCallReviewStatus(nextStatus);
    setReviewSavingMap((prev) => ({ ...prev, [app.id]: true }));

    try {
      await updateApplicationDoc(app.id, {
        openCallReviewStatus: normalized,
        reviewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert(formatFirestorePermissionMessage(error));
    } finally {
      setReviewSavingMap((prev) => ({ ...prev, [app.id]: false }));
    }
  };

  const handleMemoChange = (appIdToUpdate, value) => {
    setMemoDrafts((prev) => ({ ...prev, [appIdToUpdate]: value }));
  };

  const handleMemoSave = async (app) => {
    const memo = memoDrafts[app.id] ?? app.openCallAdminMemo ?? "";
    setMemoSavingMap((prev) => ({ ...prev, [app.id]: true }));

    try {
      await updateApplicationDoc(app.id, {
        openCallAdminMemo: memo,
        memoUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert(formatFirestorePermissionMessage(error));
    } finally {
      setMemoSavingMap((prev) => ({ ...prev, [app.id]: false }));
    }
  };

  const getCurrentOpenCallApplications = (openCallId) =>
    getApplicantItems(applications, openCallId);

  const getOpenCallApplicationCounts = (openCallId) => {
    const list = getCurrentOpenCallApplications(openCallId);
    const counts = list.reduce(
      (acc, app) => {
        const status = normalizeOpenCallReviewStatus(app.openCallReviewStatus);
        acc.total += 1;
        acc[status] += 1;
        return acc;
      },
      { total: 0, review: 0, shortlisted: 0, selected: 0, rejected: 0 }
    );

    return counts;
  };

  const buildOpenCallCsv = (call, rows) => {
    const headers = [
      "공고ID",
      "공고명",
      "심사상태",
      "이름",
      "이메일",
      "연락처",
      "출생연도",
      "주소",
      "상세주소",
      "매체",
      "SNS",
      "작업소개",
      "작품1_제목",
      "작품1_재료",
      "작품1_크기",
      "작품1_제작연도",
      "작품1_이미지URL",
      "작품2_제목",
      "작품2_재료",
      "작품2_크기",
      "작품2_제작연도",
      "작품2_이미지URL",
      "작품3_제목",
      "작품3_재료",
      "작품3_크기",
      "작품3_제작연도",
      "작품3_이미지URL",
      "포트폴리오URL",
      "관리자메모",
      "제출일",
    ];

    const csvRows = [
      headers.map(escapeCsv).join(","),
      ...rows.map((app) => {
        const works = Array.isArray(app.works) ? app.works : [];
        return [
          call.id,
          call.title || OPEN_CALL_FALLBACK.title,
          getOpenCallReviewMeta(app.openCallReviewStatus).label,
          app.name || "",
          app.email || app.applicantEmail || "",
          app.phone || "",
          app.birthYear || "",
          app.addressMain || "",
          app.addressDetail || "",
          app.medium || "",
          app.snsLink || "",
          app.artistStatement || "",
          getWorkValue(works[0], "title"),
          getWorkValue(works[0], "material"),
          getWorkValue(works[0], "size"),
          getWorkValue(works[0], "year"),
          getWorkValue(works[0], "imageUrl"),
          getWorkValue(works[1], "title"),
          getWorkValue(works[1], "material"),
          getWorkValue(works[1], "size"),
          getWorkValue(works[1], "year"),
          getWorkValue(works[1], "imageUrl"),
          getWorkValue(works[2], "title"),
          getWorkValue(works[2], "material"),
          getWorkValue(works[2], "size"),
          getWorkValue(works[2], "year"),
          getWorkValue(works[2], "imageUrl"),
          app.portfolioUrl || "",
          app.openCallAdminMemo || "",
          formatDate(app.submittedAt),
        ]
          .map(escapeCsv)
          .join(",");
      }),
    ];

    return "\uFEFF" + csvRows.join("\n");
  };

  const handleDownloadCsv = (call, rows) => {
    if (!rows.length) {
      alert("지원자가 없습니다");
      return;
    }

    const csv = buildOpenCallCsv(call, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unframe-open-call-${getOpenCallFileSlug(call)}-applications.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleFeatured = async (call, nextValue) => {
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", call.id),
        {
          isFeatured: nextValue,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
      return;
    }

    if (!nextValue) return;

    try {
      await Promise.all(
        sortedCalls
          .filter((item) => item.id !== call.id && item.isFeatured)
          .map((item) =>
            updateDoc(
              doc(db, "artifacts", appId, "public", "data", "openCalls", item.id),
              {
                isFeatured: false,
                updatedAt: serverTimestamp(),
              }
            )
          )
      );
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
    }
  };

  const selectedApplications = selectedOpenCallId
    ? getApplicantItems(applications, selectedOpenCallId)
    : [];
  const selectedOpenCall = useMemo(
    () => sortedCalls.find((call) => call.id === selectedOpenCallId) || null,
    [selectedOpenCallId, sortedCalls]
  );
  const selectedOpenCallCounts = useMemo(
    () => (selectedOpenCall ? getOpenCallApplicationCounts(selectedOpenCall.id) : null),
    [selectedOpenCall, selectedApplications]
  );

  return (
    <section className="mb-14 rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
            <Megaphone size={12} />
            Open Call Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">
            오픈콜 관리
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            공고를 생성하고, 공개 상태와 대표 공고 여부를 관리합니다. 지원서는
            대관 예약과 분리된 `applications`에서 필터링합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeedDefault}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#004aad] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#004aad]/15 transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          기본 잔상 공고 생성
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
            오픈콜 공고를 불러오는 중입니다...
          </p>
        </div>
      ) : sortedCalls.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-lg font-black text-zinc-900">등록된 오픈콜 공고가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-zinc-400">
            기본 잔상 공고 생성 버튼으로 첫 공고를 만들어 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCalls.map((call) => {
            const draft = drafts[call.id] || {};
            const applicantCount = getApplicantItems(applications, call.id).length;
            const isSelected = selectedOpenCallId === call.id;
            const statusMeta = STATUS_META[draft.status || call.status || "draft"];

            return (
              <div
                key={call.id}
                className="overflow-hidden rounded-[32px] border border-zinc-100 bg-zinc-50/70"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            statusMeta?.className || "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {statusMeta?.label || call.status || "draft"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                          {draft.isVisible ?? call.isVisible ? "visible" : "hidden"}
                        </span>
                        {draft.isFeatured ?? call.isFeatured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6e8d00]">
                            대표 공고
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-2xl font-black tracking-tight text-zinc-900 break-keep">
                        {draft.title || call.title || OPEN_CALL_FALLBACK.title}
                      </h4>
                      <p className="mt-2 text-sm font-bold text-zinc-500 break-keep">
                        {draft.subtitle || call.subtitle || OPEN_CALL_FALLBACK.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOpenCallId(isSelected ? "" : call.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                      >
                        <Users size={14} />
                        지원서 보기 ({applicantCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(call, !(draft.isFeatured ?? call.isFeatured))}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                      >
                        {(draft.isFeatured ?? call.isFeatured) ? (
                          <Star size={14} className="text-[#AAD004]" />
                        ) : (
                          <StarOff size={14} />
                        )}
                        대표 설정
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        title
                      </label>
                      <input
                        value={draft.title || ""}
                        onChange={(e) => updateDraft(call.id, "title", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        subtitle
                      </label>
                      <input
                        value={draft.subtitle || ""}
                        onChange={(e) => updateDraft(call.id, "subtitle", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        badgeText
                      </label>
                      <input
                        value={draft.badgeText || ""}
                        onChange={(e) => updateDraft(call.id, "badgeText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        heroTitle
                      </label>
                      <input
                        value={draft.heroTitle || ""}
                        onChange={(e) => updateDraft(call.id, "heroTitle", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        heroAccent
                      </label>
                      <input
                        value={draft.heroAccent || ""}
                        onChange={(e) => updateDraft(call.id, "heroAccent", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        introText
                      </label>
                      <textarea
                        rows={4}
                        value={draft.introText || ""}
                        onChange={(e) => updateDraft(call.id, "introText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        mediumText
                      </label>
                      <textarea
                        rows={4}
                        value={draft.mediumText || ""}
                        onChange={(e) => updateDraft(call.id, "mediumText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        eligibilityText
                      </label>
                      <textarea
                        rows={4}
                        value={draft.eligibilityText || ""}
                        onChange={(e) => updateDraft(call.id, "eligibilityText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        benefitText
                      </label>
                      <textarea
                        rows={4}
                        value={draft.benefitText || ""}
                        onChange={(e) => updateDraft(call.id, "benefitText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        magazineText
                      </label>
                      <textarea
                        rows={4}
                        value={draft.magazineText || ""}
                        onChange={(e) => updateDraft(call.id, "magazineText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        applyButtonText
                      </label>
                      <input
                        value={draft.applyButtonText || ""}
                        onChange={(e) => updateDraft(call.id, "applyButtonText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          status
                        </label>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          draft / open / closed / archived
                        </span>
                      </div>
                      <select
                        value={draft.status || "draft"}
                        onChange={(e) => updateDraft(call.id, "status", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4 xl:col-span-2">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                              application dates
                            </label>
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              datetime-local
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                applicationStartAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.applicationStartAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "applicationStartAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                applicationEndAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.applicationEndAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "applicationEndAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                announcementAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.announcementAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "announcementAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(call.id, "isVisible", !(draft.isVisible ?? call.isVisible))
                            }
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                              draft.isVisible ?? call.isVisible
                                ? "bg-[#004aad] text-white"
                                : "border border-zinc-200 bg-white text-zinc-500"
                            }`}
                          >
                            {draft.isVisible ?? call.isVisible ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                            {draft.isVisible ?? call.isVisible ? "공개 중" : "비공개"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(call.id, "isFeatured", !(draft.isFeatured ?? call.isFeatured))
                            }
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                              draft.isFeatured ?? call.isFeatured
                                ? "bg-[#AAD004] text-white"
                                : "border border-zinc-200 bg-white text-zinc-500"
                            }`}
                          >
                            {(draft.isFeatured ?? call.isFeatured) ? (
                              <BadgeCheck size={14} />
                            ) : (
                              <StarOff size={14} />
                            )}
                            {(draft.isFeatured ?? call.isFeatured) ? "대표" : "일반"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSave(call)}
                            disabled={saveFeedbacks[call.id]?.state === "saving"}
                            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:opacity-60"
                          >
                            <Save size={14} />
                            {saveFeedbacks[call.id]?.state === "saving" ? "저장 중..." : "공고 저장"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        {saveFeedbacks[call.id]?.message ? (
                          <p
                            className={`text-xs font-bold break-keep ${
                              saveFeedbacks[call.id]?.state === "saved"
                                ? "text-emerald-600"
                                : saveFeedbacks[call.id]?.state === "error"
                                ? "text-red-500"
                                : "text-zinc-400"
                            }`}
                          >
                            {saveFeedbacks[call.id].message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-zinc-100 bg-white p-4 xl:col-span-2">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            descriptionSections
                          </p>
                          <p className="mt-1 text-xs font-bold text-zinc-400">
                            섹션 추가와 삭제로 공고 설명을 구성합니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addDescriptionSection(call.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]"
                        >
                          <Plus size={14} />
                          섹션 추가
                        </button>
                      </div>

                      <div className="space-y-3">
                        {normalizeSections(draft.descriptionSections).map((section, index) => (
                          <div
                            key={`${call.id}-section-${index}`}
                            className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-4"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                              <div className="flex-1">
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                  section title
                                </label>
                                <input
                                  value={section.title || ""}
                                  onChange={(e) =>
                                    updateDescriptionSection(
                                      call.id,
                                      index,
                                      "title",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => removeDescriptionSection(call.id, index)}
                                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                              >
                                <Plus size={14} className="rotate-45" />
                                섹션 삭제
                              </button>
                            </div>

                            <div className="mt-3">
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                section body
                              </label>
                              <textarea
                                rows={4}
                                value={section.body || ""}
                                onChange={(e) =>
                                  updateDescriptionSection(
                                    call.id,
                                    index,
                                    "body",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="border-t border-zinc-200 bg-white p-5 md:p-6">
                    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-[#004aad]" />
                        <h5 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
                          지원서 목록
                        </h5>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                          {selectedApplications.length}명
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadCsv(selectedOpenCall, selectedApplications)}
                          disabled={selectedApplications.length === 0}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={14} />
                          CSV 다운로드
                        </button>
                      </div>
                    </div>

                    {selectedOpenCallCounts ? (
                      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                            전체
                          </p>
                          <p className="mt-1 text-lg font-black text-zinc-900">
                            {selectedOpenCallCounts.total}
                          </p>
                        </div>
                        {OPEN_CALL_REVIEW_STATUS_OPTIONS.map((status) => {
                          const meta = OPEN_CALL_REVIEW_STATUS_META[status];
                          return (
                            <div
                              key={status}
                              className="rounded-2xl border border-zinc-100 bg-white px-4 py-3"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                                {meta.label}
                              </p>
                              <p className="mt-1 text-lg font-black text-zinc-900">
                                {selectedOpenCallCounts[status]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {selectedApplications.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center">
                        <p className="text-sm font-bold text-zinc-400">
                          아직 이 공고의 지원서가 없습니다.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {selectedApplications.map((app) => (
                          <div
                            key={app.id}
                            className="rounded-[24px] border border-zinc-100 bg-zinc-50 px-4 py-4"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                                    {app.openCallTitle || OPEN_CALL_FALLBACK.title}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                                      getOpenCallReviewMeta(app.openCallReviewStatus).tone
                                    }`}
                                  >
                                    {getOpenCallReviewMeta(app.openCallReviewStatus).label}
                                  </span>
                                </div>

                                <p className="mt-3 text-sm font-black text-zinc-900 break-keep">
                                  {getApplicantTitle(app)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-zinc-500 break-keep">
                                  {app.email || app.applicantEmail || "-"} · {app.phone || "-"}
                                </p>
                                <p className="mt-1 text-xs font-bold text-zinc-500 break-keep">
                                  {app.medium || "-"} · {formatDate(app.submittedAt)}
                                </p>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      작업 소개
                                    </p>
                                    <p className="max-h-[4.5rem] overflow-hidden whitespace-pre-wrap break-keep text-sm font-bold leading-relaxed text-zinc-600">
                                      {app.artistStatement || "-"}
                                    </p>
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      포트폴리오 링크
                                    </p>
                                    {app.portfolioUrl ? (
                                      <a
                                        href={app.portfolioUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-[#004aad] break-all"
                                      >
                                        {app.portfolioUrl}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-zinc-500">-</p>
                                    )}
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4 md:col-span-2">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      대표 작품 1
                                    </p>
                                    {app.works?.[0]?.imageUrl ? (
                                      <a
                                        href={app.works[0].imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3"
                                      >
                                        <img
                                          src={app.works[0].imageUrl}
                                          alt="대표 작품 1 썸네일"
                                          className="h-16 w-16 rounded-2xl border border-zinc-100 bg-zinc-50 object-cover"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold text-zinc-700 break-keep">
                                            {app.works[0].title || "이미지 보기"}
                                          </p>
                                          <p className="text-xs font-bold text-zinc-400 break-all">
                                            {app.works[0].imageUrl}
                                          </p>
                                        </div>
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-zinc-500">-</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="w-full space-y-3 xl:w-[340px]">
                                <div>
                                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    심사 상태
                                  </label>
                                  <select
                                    value={normalizeOpenCallReviewStatus(app.openCallReviewStatus)}
                                    onChange={(e) => handleReviewStatusChange(app, e.target.value)}
                                    disabled={!!reviewSavingMap[app.id]}
                                    className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {OPEN_CALL_REVIEW_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status}>
                                        {OPEN_CALL_REVIEW_STATUS_META[status].label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    관리자 메모
                                  </label>
                                  <textarea
                                    rows={7}
                                    value={memoDrafts[app.id] ?? app.openCallAdminMemo ?? ""}
                                    onChange={(e) => handleMemoChange(app.id, e.target.value)}
                                    className="w-full resize-none rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                    placeholder="지원자에게만 보이는 내부 메모를 남겨 주세요."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleMemoSave(app)}
                                    disabled={!!memoSavingMap[app.id]}
                                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Save size={14} />
                                    {memoSavingMap[app.id] ? "저장 중..." : "메모 저장"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OpenCallManager;

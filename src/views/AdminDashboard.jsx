import React, { useMemo, useState } from "react";
import {
  Activity,
  FileText,
  Users,
  CheckCircle,
  Calendar,
  ChevronUp,
  ChevronDown,
  Paperclip,
  Image as ImageIcon,
  Globe,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  NotebookPen,
} from "lucide-react";
import {
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import StatCard from "../components/ui/StatCard";
import CheckCard from "../components/ui/CheckCard";
import AdminLink from "../components/ui/AdminLink";
import DetailItem from "../components/ui/DetailItem";
import { PROGRAMS } from "../constants/programs";
import { addDays } from "../utils/date";
import { sendApplicationStatusEmail } from "../lib/uploads";
import EmailTestPanel from "./EmailTestPanel";

const BLOCKING_STATUSES = ["confirmed", "planned", "preparing"];

const DEFAULT_MANUAL_BLOCK = {
  startDate: "",
  durationDays: 7,
  blockStatus: "planned",
  blockTitle: "",
  blockOwner: "",
  partnerType: "internal",
  selectedProgramId: "",
};

const getStatusLabel = (status) => {
  if (status === "planned") return "기획";
  if (status === "preparing") return "준비중";
  if (status === "confirmed") return "확정";
  if (status === "review") return "심사중";
  if (status === "rejected") return "거절";
  if (status === "additional_requested") return "추가자료 요청";
  return status || "-";
};

const getProgramLabel = (program) => {
  if (!program) return "-";
  return `${program.name} · ${program.price}만원`;
};

const formatSentAt = (value) => {
  if (!value) return "";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
};

const DeliveryStatusItem = ({ label, value, tone = "default" }) => {
  const active = !!value;

  const toneClass =
    tone === "blue"
      ? active
        ? "bg-[#004aad]/10 text-[#004aad] border-[#004aad]/20"
        : "bg-zinc-50 text-zinc-400 border-zinc-200"
      : tone === "amber"
      ? active
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-zinc-50 text-zinc-400 border-zinc-200"
      : tone === "red"
      ? active
        ? "bg-red-50 text-red-600 border-red-200"
        : "bg-zinc-50 text-zinc-400 border-zinc-200"
      : active
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-zinc-50 text-zinc-400 border-zinc-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1">
        {label}
      </p>
      <p className="text-xs font-black">
        {active ? `발송됨 · ${formatSentAt(value)}` : "미발송"}
      </p>
    </div>
  );
};

const AdminField = ({
  label,
  required = false,
  hint = "",
  example = "",
  value,
  onChange,
  placeholder = "",
  textarea = false,
  rows = 4,
}) => {
  const sharedClassName =
    "w-full rounded-[18px] border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold text-zinc-700 outline-none resize-none focus:border-[#004aad]/30 focus:bg-white transition-all";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
          {label}
        </p>
        {required && (
          <span className="px-2 py-1 rounded-full bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-[0.15em]">
            Required
          </span>
        )}
      </div>

      {hint ? (
        <p className="text-xs font-bold text-zinc-500 leading-relaxed break-keep">
          {hint}
        </p>
      ) : null}

      {example ? (
        <div className="rounded-2xl border border-dashed border-[#004aad]/20 bg-[#004aad]/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad] mb-1">
            예시
          </p>
          <p className="text-xs font-bold text-zinc-600 whitespace-pre-wrap break-keep">
            {example}
          </p>
        </div>
      ) : null}

      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={sharedClassName}
        />
      ) : (
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={sharedClassName.replace("resize-none", "")}
        />
      )}
    </div>
  );
};

const ApplicantPreviewCard = ({ eyebrow, title, description, note }) => (
  <div className="rounded-[22px] border border-[#004aad]/15 bg-[#004aad]/5 p-5">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004aad] mb-2">
      신청자에게 이렇게 보입니다
    </p>
    <div className="rounded-[18px] border border-white/80 bg-white p-4">
      {eyebrow ? (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
          {eyebrow}
        </p>
      ) : null}

      <h6 className="text-base font-black text-zinc-900 mb-2 break-keep">
        {title || "-"}
      </h6>

      {description ? (
        <p className="text-sm font-bold text-zinc-600 whitespace-pre-wrap break-keep leading-relaxed">
          {description}
        </p>
      ) : null}

      {note ? (
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
            추가 노출 메모
          </p>
          <p className="text-sm font-bold text-zinc-700 whitespace-pre-wrap break-keep leading-relaxed">
            {note}
          </p>
        </div>
      ) : null}
    </div>
  </div>
);

const AdminNotice = ({ title, body, tone = "blue" }) => {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-[#004aad]/15 bg-[#004aad]/5 text-zinc-700";

  return (
    <div className={`rounded-[18px] border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2">
        {title}
      </p>
      <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap break-keep">
        {body}
      </p>
    </div>
  );
};

const AdminDashboard = ({ applications, reservations, db, appId }) => {
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [manualBlock, setManualBlock] = useState(DEFAULT_MANUAL_BLOCK);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-desc");

  const [reviewDrafts, setReviewDrafts] = useState({});
  const [guideDrafts, setGuideDrafts] = useState({});
  const [requestDrafts, setRequestDrafts] = useState({});

  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "review").length,
      confirmed: applications.filter((a) => a.status === "confirmed").length,
    }),
    [applications]
  );

  const managedSchedules = useMemo(() => {
    return Object.entries(reservations || {})
      .filter(([_, data]) => BLOCKING_STATUSES.includes(data.status))
      .map(([startDate, data]) => ({
        id: startDate,
        startDate,
        endDate: data.endDate || addDays(startDate, 6),
        status: data.status,
        title: data.confirmedTitle || data.blockTitle || "예약된 일정",
        owner: data.confirmedArtist || data.blockOwner || "비공개",
        partnerType: data.partnerType || "internal",
        selectedProgram: data.selectedProgram || null,
        manualEntry: !!data.manualEntry,
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [reservations]);

  const hasOverlap = (startDate, endDate, ignoreId = null) => {
    return managedSchedules
      .filter((schedule) => schedule.id !== ignoreId)
      .some((schedule) => !(endDate < schedule.startDate || startDate > schedule.endDate));
  };

  const resetManualBlockForm = () => {
    setManualBlock(DEFAULT_MANUAL_BLOCK);
    setEditingScheduleId(null);
  };

  const handleEditSchedule = (schedule) => {
    const matchedProgram = schedule.selectedProgram
      ? PROGRAMS.find((p) => p.id === schedule.selectedProgram.id)
      : null;

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    setManualBlock({
      startDate: schedule.startDate,
      durationDays: diffDays,
      blockStatus: schedule.status,
      blockTitle: schedule.title,
      blockOwner: schedule.owner,
      partnerType: schedule.partnerType || "internal",
      selectedProgramId: matchedProgram?.id || "",
    });

    setEditingScheduleId(schedule.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateOrUpdateManualBlock = async () => {
    if (!manualBlock.startDate || !manualBlock.blockTitle) {
      alert("시작일과 이름을 입력해 주세요.");
      return;
    }

    const durationDays = Math.max(1, Number(manualBlock.durationDays || 7));
    const endDate = addDays(manualBlock.startDate, durationDays - 1);

    if (hasOverlap(manualBlock.startDate, endDate, editingScheduleId)) {
      alert("해당 기간은 이미 다른 일정과 겹칩니다.");
      return;
    }

    const selectedProgram =
      PROGRAMS.find((p) => p.id === manualBlock.selectedProgramId) || null;

    const payload = {
      status: manualBlock.blockStatus,
      endDate,
      manualEntry: true,
      blockTitle: manualBlock.blockTitle,
      blockOwner: manualBlock.blockOwner || "UNFRAME",
      confirmedTitle: manualBlock.blockTitle,
      confirmedArtist: manualBlock.blockOwner || "UNFRAME",
      partnerType: manualBlock.partnerType,
      selectedProgram,
      applicantCount: 0,
      writingCount: 0,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingScheduleId && editingScheduleId !== manualBlock.startDate) {
        await deleteDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "reservations",
            editingScheduleId
          )
        );
      }

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "reservations",
          manualBlock.startDate
        ),
        payload,
        { merge: true }
      );

      const wasEditing = !!editingScheduleId;
      resetManualBlockForm();
      alert(wasEditing ? "운영자 일정이 수정되었습니다." : "운영자 일정이 등록되었습니다.");
    } catch (e) {
      console.error(e);
      alert(editingScheduleId ? "수정 실패" : "등록 실패");
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!schedule.manualEntry) {
      alert("신청 승인으로 생성된 일정은 여기서 삭제할 수 없습니다.");
      return;
    }

    const ok = window.confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "reservations",
          schedule.id
        )
      );

      if (editingScheduleId === schedule.id) {
        resetManualBlockForm();
      }

      alert("운영자 일정이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  const getReviewDraft = (app) =>
    reviewDrafts[app.id] || {
      reviewSummary: app.reviewSummary || "",
      improvementSuggestions: app.improvementSuggestions || "",
    };

  const setReviewDraft = (appIdValue, key, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
        [key]: value,
      },
    }));
  };

  const getGuideDraft = (app) =>
    guideDrafts[app.id] || {
      customGuideTitle: app.customGuideTitle || "",
      customGuideIntro: app.customGuideIntro || "",
      guideNotes: app.guideNotes || "",
    };

  const setGuideDraft = (appIdValue, key, value) => {
    setGuideDrafts((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
        [key]: value,
      },
    }));
  };

  const getRequestDraft = (app) =>
    requestDrafts[app.id] || {
      requestMessage: app.requestMessage || "",
    };

  const setRequestDraft = (appIdValue, key, value) => {
    setRequestDrafts((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
        [key]: value,
      },
    }));
  };

  const handleSaveReviewDraft = async (app) => {
    const draft = getReviewDraft(app);

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", app.id),
        {
          reviewSummary: draft.reviewSummary || "",
          improvementSuggestions: draft.improvementSuggestions || "",
          updatedAt: serverTimestamp(),
        }
      );
      alert("검토 결과 메모가 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("검토 결과 저장 실패");
    }
  };

  const handleSaveGuideDraft = async (app) => {
    const draft = getGuideDraft(app);

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", app.id),
        {
          customGuideTitle: draft.customGuideTitle || "",
          customGuideIntro: draft.customGuideIntro || "",
          guideNotes: draft.guideNotes || "",
          updatedAt: serverTimestamp(),
        }
      );
      alert("가이드 내용이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("가이드 저장 실패");
    }
  };

  const handleSaveRequestDraft = async (app) => {
    const draft = getRequestDraft(app);

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", app.id),
        {
          requestMessage: draft.requestMessage || "",
          requestUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      alert("추가자료 요청 문안이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("추가자료 요청 문안 저장 실패");
    }
  };

  const buildApplicationDetailUrl = (applicationId) => {
    if (!applicationId || typeof window === "undefined") return "";
    const origin = window.location.origin;
    return `${origin}/?view=my-page&applicationId=${encodeURIComponent(
      applicationId
    )}&app=${encodeURIComponent(applicationId)}`;
  };

  const getApplicantName = (appDoc) =>
  appDoc.name ||
  appDoc.realName ||
  appDoc.brandName ||
  appDoc.stageName ||
  "Applicant";

const handleAction = async (appDoc, date, status, reason = "") => {
  try {
    const applicationDetailUrl = buildApplicationDetailUrl(appDoc.id);
    const appRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "applications",
      appDoc.id
    );

    if (status === "confirmed") {
      const guideDraft = getGuideDraft(appDoc);

      const mailAlreadySent = !!appDoc.approvedMailSentAt;
      const kakaoAlreadySent = !!appDoc.approvedKakaoSentAt;

      await updateDoc(appRef, {
        status: "confirmed",
        customGuideTitle: guideDraft.customGuideTitle || "",
        customGuideIntro: guideDraft.customGuideIntro || "",
        guideNotes: guideDraft.guideNotes || "",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "reservations", date),
        {
          status: "confirmed",
          confirmedArtist: appDoc.stageName || appDoc.name,
          confirmedTitle: appDoc.exhibitionTitle,
          partnerType: appDoc.partnerType,
          selectedProgram: appDoc.selectedProgram || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (appDoc.applicantEmail && !mailAlreadySent) {
        try {
          await sendApplicationStatusEmail({
            type: "approved",
            applicantName: getApplicantName(appDoc),
            applicantEmail: appDoc.applicantEmail,
            exhibitionTitle: appDoc.exhibitionTitle,
            selectedDate: appDoc.selectedDate || date || "",
            selectedProgram: appDoc.selectedProgram || null,
            partnerType: appDoc.partnerType,
            applicationDetailUrl,
          });

          await updateDoc(appRef, {
            approvedMailSentAt: serverTimestamp(),
          });
        } catch (mailError) {
          console.error("approve mail failed:", mailError);
        }
      }

      if (appDoc.phone && !kakaoAlreadySent) {
        try {
          const res = await fetch("/.netlify/functions/send-kakao-alimtalk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "approved",
              to: appDoc.phone,
              applicantName: getApplicantName(appDoc),
              exhibitionTitle: appDoc.exhibitionTitle,
              selectedDate: appDoc.selectedDate || date || "",
              selectedProgram: appDoc.selectedProgram || null,
              applicationId: appDoc.id,
              applicationDetailUrl,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "approve kakao failed");
          }

          await updateDoc(appRef, {
            approvedKakaoSentAt: serverTimestamp(),
          });
        } catch (kakaoError) {
          console.error("approve kakao failed:", kakaoError);
        }
      }
    } else if (status === "additional_requested") {
      const requestDraft = getRequestDraft(appDoc);
      const requestMessage = (requestDraft.requestMessage || reason || "").trim();

      const mailAlreadySent = !!appDoc.additionalRequestedMailSentAt;
      const kakaoAlreadySent = !!appDoc.additionalRequestedKakaoSentAt;

      await updateDoc(appRef, {
        status: "additional_requested",
        requestMessage,
        requestUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (appDoc.applicantEmail && !mailAlreadySent) {
        try {
          await sendApplicationStatusEmail({
            type: "additional_requested",
            applicantName: getApplicantName(appDoc),
            applicantEmail: appDoc.applicantEmail,
            exhibitionTitle: appDoc.exhibitionTitle,
            selectedDate: appDoc.selectedDate || date || "",
            selectedProgram: appDoc.selectedProgram || null,
            partnerType: appDoc.partnerType,
            requestMessage,
            applicationDetailUrl,
          });

          await updateDoc(appRef, {
            additionalRequestedMailSentAt: serverTimestamp(),
          });
        } catch (mailError) {
          console.error("request more mail failed:", mailError);
        }
      }

      if (appDoc.phone && !kakaoAlreadySent) {
        try {
          const res = await fetch("/.netlify/functions/send-kakao-alimtalk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "additional_requested",
              to: appDoc.phone,
              applicantName: getApplicantName(appDoc),
              exhibitionTitle: appDoc.exhibitionTitle,
              requestMessage,
              applicationId: appDoc.id,
              applicationDetailUrl,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "additional_requested kakao failed");
          }

          await updateDoc(appRef, {
            additionalRequestedKakaoSentAt: serverTimestamp(),
          });
        } catch (kakaoError) {
          console.error("additional_requested kakao failed:", kakaoError);
        }
      }
    } else if (status === "rejected" || status === "delete") {
      if (status === "rejected") {
        const reviewDraft = getReviewDraft(appDoc);

        const mailAlreadySent = !!appDoc.rejectedMailSentAt;
        const kakaoAlreadySent = !!appDoc.rejectedKakaoSentAt;

        await updateDoc(appRef, {
          status: "rejected",
          rejectionReason: reason || "",
          reviewSummary: reviewDraft.reviewSummary || "",
          improvementSuggestions: reviewDraft.improvementSuggestions || "",
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (appDoc.applicantEmail && !mailAlreadySent) {
          try {
            await sendApplicationStatusEmail({
              type: "rejected",
              applicantName: getApplicantName(appDoc),
              applicantEmail: appDoc.applicantEmail,
              exhibitionTitle: appDoc.exhibitionTitle,
              selectedDate: appDoc.selectedDate || date || "",
              selectedProgram: appDoc.selectedProgram || null,
              partnerType: appDoc.partnerType,
              rejectionReason: reason || "",
              reviewSummary: reviewDraft.reviewSummary || "",
              improvementSuggestions:
                reviewDraft.improvementSuggestions || "",
              applicationDetailUrl,
            });

            await updateDoc(appRef, {
              rejectedMailSentAt: serverTimestamp(),
            });
          } catch (mailError) {
            console.error("reject mail failed:", mailError);
          }
        }

        if (appDoc.phone && !kakaoAlreadySent) {
          try {
            const res = await fetch("/.netlify/functions/send-kakao-alimtalk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "rejected",
                to: appDoc.phone,
                applicantName: getApplicantName(appDoc),
                exhibitionTitle: appDoc.exhibitionTitle,
                selectedDate: appDoc.selectedDate || date || "",
                applicationId: appDoc.id,
                applicationDetailUrl,
              }),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error || "reject kakao failed");
            }

            await updateDoc(appRef, {
              rejectedKakaoSentAt: serverTimestamp(),
            });
          } catch (kakaoError) {
            console.error("reject kakao failed:", kakaoError);
          }
        }
      } else {
        await deleteDoc(appRef);
      }

      const resRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "reservations",
        date
      );

      await runTransaction(db, async (t) => {
        const snap = await t.get(resRef);
        if (snap.exists()) {
          const newCount = Math.max(0, (snap.data().applicantCount || 1) - 1);
          t.update(resRef, {
            status: newCount > 0 ? "review" : null,
            confirmedArtist: null,
            confirmedTitle: null,
            partnerType: null,
            selectedProgram: null,
            applicantCount: newCount,
          });
        }
      });
    }

    setRejectId(null);
    setRejectReason("");
    alert("Updated successfully.");
  } catch (e) {
    console.error(e);
    alert("Action failed.");
    }
  };

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let list = [...applications].filter((app) => {
      const matchesSearch =
        !term ||
        [
          app.exhibitionTitle,
          app.name,
          app.realName,
          app.stageName,
          app.brandName,
          app.phone,
          app.selectedDate,
          app.applicantEmail,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "all" ? true : app.status === statusFilter;

      const matchesProgram =
        programFilter === "all" ? true : app.selectedProgram?.id === programFilter;

      const matchesPartner =
        partnerFilter === "all" ? true : app.partnerType === partnerFilter;

      return matchesSearch && matchesStatus && matchesProgram && matchesPartner;
    });

    list.sort((a, b) => {
      if (sortOrder === "date-asc") return a.selectedDate.localeCompare(b.selectedDate);
      if (sortOrder === "date-desc") return b.selectedDate.localeCompare(a.selectedDate);
      if (sortOrder === "submitted-desc") {
        const aTime = a.submittedAt?.seconds || 0;
        const bTime = b.submittedAt?.seconds || 0;
        return bTime - aTime;
      }
      if (sortOrder === "submitted-asc") {
        const aTime = a.submittedAt?.seconds || 0;
        const bTime = b.submittedAt?.seconds || 0;
        return aTime - bTime;
      }
      return 0;
    });

    return list;
  }, [applications, searchTerm, statusFilter, programFilter, partnerFilter, sortOrder]);

  const groupedApps = useMemo(() => {
    const groups = {};
    filteredApplications.forEach((app) => {
      if (!groups[app.selectedDate]) groups[app.selectedDate] = [];
      groups[app.selectedDate].push(app);
    });

    const entries = Object.entries(groups);
    if (sortOrder === "date-asc") {
      return entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries.sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredApplications, sortOrder]);

  return (
    <section className="animate-in fade-in py-20 text-zinc-900 min-h-screen relative z-10 text-left px-4">
      <div className="mb-20 space-y-12 text-left">
        <div className="flex items-center gap-4 text-left">
          <div className="p-4 bg-[#004aad] rounded-3xl text-white shadow-xl shadow-[#004aad]/20">
            <Activity size={32} />
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-left">
            Control Center
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <StatCard icon={<FileText size={20} />} label="Total Proposals" value={stats.total} color="blue" />
          <StatCard icon={<Users size={20} />} label="Pending Review" value={stats.pending} color="orange" />
          <CheckCard icon={<CheckCircle size={20} />} label="Confirmed" value={stats.confirmed} />
        </div>
      </div>

      <div className="mb-20">
        <EmailTestPanel />
      </div>

      <div className="mb-20 grid xl:grid-cols-[0.95fr_1.05fr] gap-8">
        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl p-8 md:p-10">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Plus size={18} className="text-[#004aad]" />
              <h3 className="text-2xl font-black uppercase tracking-tight">운영자 일정 직접 등록</h3>
            </div>

            {editingScheduleId && (
              <button
                onClick={resetManualBlockForm}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X size={14} /> 편집 취소
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <input
              type="date"
              value={manualBlock.startDate}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, startDate: e.target.value }))}
              className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            />

            <input
              type="number"
              min="1"
              value={manualBlock.durationDays}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, durationDays: e.target.value }))}
              placeholder="기간(일)"
              className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            />

            <select
              value={manualBlock.blockStatus}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, blockStatus: e.target.value }))}
              className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            >
              <option value="planned">기획</option>
              <option value="preparing">준비중</option>
              <option value="confirmed">확정</option>
            </select>

            <select
              value={manualBlock.partnerType}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, partnerType: e.target.value }))}
              className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            >
              <option value="internal">Internal</option>
              <option value="artist">Artist</option>
              <option value="brand">Brand</option>
            </select>

            <input
              type="text"
              value={manualBlock.blockTitle}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, blockTitle: e.target.value }))}
              placeholder="일정명 / 전시명"
              className="md:col-span-2 bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            />

            <input
              type="text"
              value={manualBlock.blockOwner}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, blockOwner: e.target.value }))}
              placeholder="작가명 / 운영자명 / UNFRAME"
              className="md:col-span-2 bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            />

            <select
              value={manualBlock.selectedProgramId}
              onChange={(e) => setManualBlock((prev) => ({ ...prev, selectedProgramId: e.target.value }))}
              className="md:col-span-2 bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 font-bold outline-none"
            >
              <option value="">프로그램 없음</option>
              {PROGRAMS.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} · {program.price}만원
                </option>
              ))}
            </select>

            <button
              onClick={handleCreateOrUpdateManualBlock}
              className="md:col-span-2 bg-[#004aad] text-white rounded-2xl px-6 py-4 font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all"
            >
              {editingScheduleId ? "일정 수정하기" : "일정 등록하기"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={18} className="text-[#004aad]" />
            <h3 className="text-2xl font-black uppercase tracking-tight">등록된 일정</h3>
          </div>

          <div className="space-y-4 max-h-130 overflow-y-auto pr-1">
            {managedSchedules.length > 0 ? (
              managedSchedules.map((schedule) => (
                <div key={schedule.id} className="border border-zinc-100 rounded-[28px] p-5 bg-zinc-50/70">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="px-3 py-1 rounded-full bg-[#004aad]/10 text-[#004aad] text-[10px] font-black uppercase tracking-[0.18em]">
                          {getStatusLabel(schedule.status)}
                        </span>
                        {schedule.manualEntry ? (
                          <span className="px-3 py-1 rounded-full bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.18em]">
                            Manual
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.18em]">
                            Approved Application
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-black tracking-tight text-zinc-900 break-keep">{schedule.title}</h4>
                      <p className="text-sm font-bold text-zinc-500 mt-1">{schedule.owner}</p>
                    </div>

                    {schedule.manualEntry && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSchedule(schedule)}
                          className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule)}
                          className="w-10 h-10 rounded-full bg-white border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-1">Period</p>
                      <p className="text-sm font-black text-zinc-700">{schedule.startDate} ~ {schedule.endDate}</p>
                    </div>

                    <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-1">Program</p>
                      <p className="text-sm font-black text-zinc-700">{getProgramLabel(schedule.selectedProgram)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-65 flex items-center justify-center text-zinc-300 font-black uppercase tracking-[0.25em] text-sm">
                No schedules yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-14 bg-white rounded-[40px] border border-zinc-100 shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Filter size={18} className="text-[#004aad]" />
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">신청서 필터링</h3>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="전시명, 이름, 활동명, 브랜드명, 연락처, 이메일 검색"
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-11 pr-4 py-4 font-bold outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-4 font-bold outline-none"
          >
            <option value="all">전체 상태</option>
            <option value="review">심사중</option>
            <option value="confirmed">확정</option>
            <option value="rejected">거절</option>
            <option value="additional_requested">추가자료 요청</option>
          </select>

          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-4 font-bold outline-none"
          >
            <option value="all">전체 프로그램</option>
            {PROGRAMS.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-4 font-bold outline-none"
          >
            <option value="all">전체 파트너</option>
            <option value="artist">Artist</option>
            <option value="brand">Brand</option>
          </select>

          <div className="relative">
            <ArrowUpDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-11 pr-4 py-4 font-bold outline-none"
            >
              <option value="date-desc">일정 최신순</option>
              <option value="date-asc">일정 오래된순</option>
              <option value="submitted-desc">신청 최신순</option>
              <option value="submitted-asc">신청 오래된순</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="px-4 py-2 rounded-full bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.18em]">
            Filtered {filteredApplications.length}
          </span>

          {(searchTerm || statusFilter !== "all" || programFilter !== "all" || partnerFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setProgramFilter("all");
                setPartnerFilter("all");
              }}
              className="px-4 py-2 rounded-full border border-zinc-200 text-zinc-500 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-zinc-50 transition-all"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      <div className="space-y-24 text-left">
        {groupedApps.length > 0 ? (
          groupedApps.map(([date, apps]) => (
            <div key={date}>
              <div className="sticky top-24 z-10 bg-[#fdfbf7]/80 backdrop-blur-sm py-6 border-b border-gray-100 flex items-center justify-between mb-10 text-left">
                <div className="flex items-center gap-4 text-left">
                  <Calendar size={20} className="text-[#004aad]" />
                  <h3 className="text-xl md:text-3xl font-black uppercase text-left">{date}</h3>
                </div>
                <div className="px-5 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-center">
                  {apps.length} Applicants
                </div>
              </div>

              <div className="grid gap-12 text-left">
                {apps.map((app) => {
                  const reviewDraft = getReviewDraft(app);
                  const guideDraft = getGuideDraft(app);
                  const requestDraft = getRequestDraft(app);

                  return (
                    <div
                      key={app.id}
                      className={`bg-white rounded-[40px] border overflow-hidden transition-all ${
                        app.status === "confirmed"
                          ? "border-green-400 shadow-xl shadow-green-100/10"
                          : "border-gray-50 shadow-2xl shadow-gray-200/50"
                      }`}
                    >
                      <div className="p-8 md:p-12 text-left">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 text-left">
                          <div className="flex-1 space-y-6 text-left">
                            <div
                              className={`mb-4 px-3 py-1 inline-block rounded text-[8px] font-black uppercase text-white ${
                                app.status === "review"
                                  ? "bg-[#004aad]"
                                  : app.status === "confirmed"
                                  ? "bg-green-500"
                                  : app.status === "additional_requested"
                                  ? "bg-amber-500"
                                  : "bg-red-400"
                              }`}
                            >
                              {app.status}
                            </div>

                            <h4 className="text-2xl md:text-4xl font-black uppercase leading-tight wrap-break-word text-left">
                              {app.exhibitionTitle || "Untitled Project"}
                            </h4>

                            <div className="flex items-center gap-6 flex-wrap text-left">
                              <p className="text-sm font-black text-zinc-400 uppercase">
                                {app.partnerType === "brand" ? app.brandName : app.stageName || app.name}
                              </p>
                              <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                              <p className="text-sm font-black text-zinc-400">{app.phone}</p>
                              {app.selectedProgram && (
                                <>
                                  <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                                  <span className="px-3 py-1.5 rounded-full bg-[#004aad]/10 text-[#004aad] text-[10px] font-black uppercase tracking-widest">
                                    {app.selectedProgram.name} · {app.selectedProgram.price}만원
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex gap-4 flex-wrap text-left">
                              {app.portfolioUrl && (
                                <AdminLink href={app.portfolioUrl} icon={<Paperclip size={14} />} label="포트폴리오 파일" />
                              )}
                              {app.workListUrl && (
                                <AdminLink href={app.workListUrl} icon={<FileText size={14} />} label="작품리스트 파일" />
                              )}
                              {app.highResPhotosUrl && (
                                <AdminLink href={app.highResPhotosUrl} icon={<ImageIcon size={14} />} label="대표작 고화질 원본" />
                              )}
                            </div>
                          </div>

                          <div className="w-full lg:w-70 space-y-3 text-left">
                            <button
                              onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                              className="w-full py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-100 transition-all text-center"
                            >
                              {expandedId === app.id ? (
                                <>
                                  <ChevronUp size={14} /> 상세내용 닫기
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} /> 신청서 상세 보기
                                </>
                              )}
                            </button>

                            {rejectId === app.id ? (
                              <div className="space-y-3 animate-in fade-in zoom-in-95 text-left">
                                <textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="거절 안내 메모 입력..."
                                  className="w-full bg-zinc-50 p-4 rounded-xl text-xs outline-none h-24 font-bold border border-red-100 text-left transition-all"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAction(app, date, "rejected", rejectReason)}
                                    className="flex-1 py-3 bg-red-400 text-white rounded-xl text-[10px] font-black uppercase transition-all text-center"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setRejectId(null)}
                                    className="py-3 px-4 bg-zinc-100 rounded-xl text-[10px] font-black uppercase transition-all text-center"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3 text-left">
                                <button
                                  disabled={app.status === "confirmed"}
                                  onClick={() => handleAction(app, date, "confirmed")}
                                  className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-[#004aad] shadow-xl disabled:bg-zinc-100 transition-all text-center"
                                >
                                  Approve
                                </button>

                                <button
                                  onClick={() => {
                                    const message = (requestDraft.requestMessage || "").trim();
                                    if (!message) {
                                      alert("추가로 요청할 자료 내용을 먼저 입력해 주세요.");
                                      return;
                                    }
                                    handleAction(app, date, "additional_requested", message);
                                  }}
                                  className="w-full py-5 border border-amber-200 text-amber-700 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-amber-50 transition-all text-center"
                                >
                                  Request More
                                </button>

                                <button
                                  disabled={app.status === "rejected"}
                                  onClick={() => setRejectId(app.id)}
                                  className="w-full py-5 border border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-red-50 transition-all text-center"
                                >
                                  Reject
                                </button>

                                <button
                                  onClick={() => handleAction(app, date, "delete")}
                                  className="text-[9px] font-black uppercase text-zinc-300 hover:text-red-500 py-2 text-center transition-colors"
                                >
                                  Permanent Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedId === app.id && (
                        <div className="bg-zinc-50 border-t border-gray-100 p-8 md:p-16 animate-in slide-in-from-top-4 duration-500 text-left space-y-10">
                          <div className="grid md:grid-cols-2 gap-20 text-left">
                            <div className="space-y-12 text-left">
                              <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                  User Profile Information
                                </h5>
                                <div className="grid gap-4 text-left">
                                  <DetailItem
                                    label="전체 성함"
                                    value={
                                      app.partnerType === "brand"
                                        ? app.brandName
                                        : `${app.realName || "-"} (${app.englishName || "-"})`
                                    }
                                  />
                                  <DetailItem
                                    label="활동/예명"
                                    value={app.partnerType === "brand" ? "-" : app.stageName || app.realName || "-"}
                                  />
                                  <DetailItem label="이메일" value={app.applicantEmail || "-"} />
                                  <DetailItem label="연락처" value={app.phone || "-"} />
                                  <DetailItem label="생년/설립일" value={app.birthDate || "-"} />
                                  <DetailItem label="주소" value={`${app.addressMain || ""} ${app.addressDetail || ""}`.trim() || "-"} />
                                  <DetailItem label="신청 프로그램" value={getProgramLabel(app.selectedProgram)} />
                                </div>
                              </div>

                              <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                  Proposal Note
                                </h5>
                                <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap text-left">
                                  {app.partnerType === "brand" ? app.projectPurpose : app.artistNote}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-12 text-left">
                              <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                  Visual & External Assets
                                </h5>
                                <div className="flex flex-col gap-4 text-left">
                                  {app.snsLink && (
                                    <a
                                      href={app.snsLink?.startsWith("http") ? app.snsLink : `https://${app.snsLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                    >
                                      <Globe size={18} /> 공식 SNS / 웹사이트 링크 바로가기
                                    </a>
                                  )}

                                  {app.profilePhotoUrl && (
                                    <a
                                      href={app.profilePhotoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                    >
                                      <ImageIcon size={18} /> 프로필 사진 / 로고 원본 크게보기
                                    </a>
                                  )}

                                  {app.highResPhotosUrl && (
                                    <a
                                      href={app.highResPhotosUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                    >
                                      <ImageIcon size={18} /> 대표작 고화질 이미지 원본 보기
                                    </a>
                                  )}
                                </div>
                              </div>

                              {app.experimentText && (
                                <div>
                                  <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                    Experimental Trial
                                  </h5>
                                  <p className="text-sm font-bold text-zinc-600 italic leading-relaxed whitespace-pre-wrap text-left">
                                    {app.experimentText}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                            <div className="flex items-center gap-2 mb-5">
                              <Mail size={16} />
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                                발송 상태
                              </p>
                            </div>

                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                              <DeliveryStatusItem
                                label="승인 메일"
                                value={app.approvedMailSentAt}
                                tone="blue"
                              />
                              <DeliveryStatusItem
                                label="승인 알림톡"
                                value={app.approvedKakaoSentAt}
                                tone="blue"
                              />
                              <DeliveryStatusItem
                                label="미선정 메일"
                                value={app.rejectedMailSentAt}
                                tone="red"
                              />
                              <DeliveryStatusItem
                                label="미선정 알림톡"
                                value={app.rejectedKakaoSentAt}
                                tone="red"
                              />
                              <DeliveryStatusItem
                                label="추가요청 메일"
                                value={app.additionalRequestedMailSentAt}
                                tone="amber"
                              />
                              <DeliveryStatusItem
                                label="추가요청 알림톡"
                                value={app.additionalRequestedKakaoSentAt}
                                tone="amber"
                              />
                            </div>
                          </div>

                          <div className="grid lg:grid-cols-3 gap-8">
                            <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                              <div className="flex items-center gap-2 mb-5">
                                <NotebookPen size={16} />
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                                  공개용 검토 결과 입력
                                </p>
                              </div>

                              <div className="space-y-5">
                                <AdminNotice
                                  title="사용 위치"
                                  body="이 내용은 미선정 상태의 신청 상세 페이지에 노출됩니다. 단순 거절 문구보다, 검토 결과와 다음 보완 방향이 느껴지도록 쓰는 편이 좋습니다."
                                />

                                <AdminField
                                  label="검토 결과"
                                  required
                                  hint="이번 회차에서 왜 함께하지 않게 되었는지, 그러나 지나치게 직접적이거나 차갑지 않게 작성합니다."
                                  example={`이번 회차에서는 제출 자료의 방향성과 전시 구성의 전달 밀도를 중심으로 검토했습니다.
현재 단계에서는 프로젝트의 핵심 메시지가 다소 넓게 퍼져 있어, 인상적인 강점이 한 번에 응집되어 보이기 어려웠습니다.`}
                                  value={reviewDraft.reviewSummary}
                                  onChange={(e) => setReviewDraft(app.id, "reviewSummary", e.target.value)}
                                  placeholder="신청자에게 공개될 검토 결과 요약"
                                  textarea
                                  rows={6}
                                />

                                <AdminField
                                  label="보완 제안"
                                  hint="다음 지원 때 무엇을 보완하면 더 좋아질지, 실제 도움이 되는 말로 적습니다."
                                  example={`대표 이미지의 선명도와 작품 설명의 구조를 조금 더 정리해 주시면, 프로젝트의 강점이 더 분명하게 전달될 수 있습니다.
전시 구성안이나 공간 활용 방식도 한두 문단 정도 더 구체화해 주시면 좋습니다.`}
                                  value={reviewDraft.improvementSuggestions}
                                  onChange={(e) => setReviewDraft(app.id, "improvementSuggestions", e.target.value)}
                                  placeholder="다음 지원 시 참고할 보완 제안"
                                  textarea
                                  rows={6}
                                />

                                <ApplicantPreviewCard
                                  eyebrow="Review Result"
                                  title="검토 결과"
                                  description={
                                    reviewDraft.reviewSummary ||
                                    "이번 회차 검토 결과와 다음 지원 시 참고하실 수 있는 보완 포인트를 안내드립니다."
                                  }
                                  note={
                                    reviewDraft.improvementSuggestions ||
                                    "보완 제안이 여기에 함께 노출됩니다."
                                  }
                                />

                                <button
                                  onClick={() => handleSaveReviewDraft(app)}
                                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all"
                                >
                                  검토 결과 저장
                                </button>
                              </div>
                            </div>

                            <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                              <div className="flex items-center gap-2 mb-5">
                                <Mail size={16} />
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                                  승인용 가이드 입력
                                </p>
                              </div>

                              <div className="space-y-5">
                                <AdminNotice
                                  title="사용 위치"
                                  body="이 내용은 승인된 신청자의 상세 페이지 최상단에 노출됩니다. '축하 메시지'보다는 '이제 무엇을 보면 되는지'가 바로 읽히는 구조가 좋습니다."
                                />

                                <AdminField
                                  label="가이드 제목"
                                  required
                                  hint="승인 페이지의 메인 제목입니다. 너무 추상적이지 않게, 신청자가 바로 이해할 수 있게 씁니다."
                                  example="예: 진행 가이드 / 전시 진행 안내 / 브랜드 협업 진행 가이드"
                                  value={guideDraft.customGuideTitle}
                                  onChange={(e) => setGuideDraft(app.id, "customGuideTitle", e.target.value)}
                                  placeholder="예: 진행 가이드"
                                />

                                <AdminField
                                  label="가이드 소개"
                                  hint="승인 이후 신청자가 이 페이지에서 무엇을 확인하게 되는지 짧게 설명합니다."
                                  example={`승인 이후 필요한 자료와 진행 흐름을 이 페이지에서 확인하실 수 있습니다.
세부 일정 및 준비 사항은 순차적으로 안내드릴 예정입니다.`}
                                  value={guideDraft.customGuideIntro}
                                  onChange={(e) => setGuideDraft(app.id, "customGuideIntro", e.target.value)}
                                  placeholder="승인 상세 페이지 상단에 보일 소개 문구"
                                  textarea
                                  rows={5}
                                />

                                <AdminField
                                  label="개별 안내 메모"
                                  hint="이 신청 건에만 따로 전하고 싶은 설치, 제출, 운영 관련 메모를 적습니다."
                                  example={`설치 참고 이미지는 추후 메일로 추가 요청드릴 수 있습니다.
오프닝 관련 운영 여부는 프로젝트 성격에 맞춰 별도 안내드릴 예정입니다.`}
                                  value={guideDraft.guideNotes}
                                  onChange={(e) => setGuideDraft(app.id, "guideNotes", e.target.value)}
                                  placeholder="설치, 운영, 제출물 관련 개별 메모"
                                  textarea
                                  rows={6}
                                />

                                <ApplicantPreviewCard
                                  eyebrow="Approved Guide"
                                  title={guideDraft.customGuideTitle || "진행 가이드"}
                                  description={
                                    guideDraft.customGuideIntro ||
                                    "승인 이후 필요한 자료와 진행 흐름을 이 페이지에서 바로 확인하실 수 있습니다."
                                  }
                                  note={guideDraft.guideNotes}
                                />

                                <button
                                  onClick={() => handleSaveGuideDraft(app)}
                                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all"
                                >
                                  가이드 저장
                                </button>
                              </div>
                            </div>

                            <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                              <div className="flex items-center gap-2 mb-5">
                                <Mail size={16} />
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                                  추가자료 요청 입력
                                </p>
                              </div>

                              <div className="space-y-5">
                                <AdminNotice
                                  title="사용 위치"
                                  body="이 문안은 신청 상세 페이지와 추가자료 요청 메일에 함께 노출됩니다. '무엇이 부족한지'보다 '무엇을 어떻게 보내주면 되는지'가 분명해야 합니다."
                                  tone="amber"
                                />

                                <AdminField
                                  label="추가자료 요청 내용"
                                  required
                                  hint="신청자에게 다시 받아야 할 자료, 보완 방향, 회신 시 참고할 점을 한 번에 안내합니다."
                                  example={`아래 항목을 추가로 확인하고자 합니다.

1) 최신 포트폴리오 PDF 또는 ZIP
2) 대표작 이미지 원본 3~5점
3) 이번 전시/프로젝트의 핵심 구성 의도를 3~5문장 정도로 정리한 설명

가능하신 범위에서 보완 후, 신청 상세 페이지에서 재업로드 부탁드립니다.`}
                                  value={requestDraft.requestMessage}
                                  onChange={(e) => setRequestDraft(app.id, "requestMessage", e.target.value)}
                                  placeholder="신청자에게 요청할 추가 자료와 보완 방향을 입력하세요"
                                  textarea
                                  rows={8}
                                />

                                <ApplicantPreviewCard
                                  eyebrow="Additional Request"
                                  title="보완 요청"
                                  description={
                                    requestDraft.requestMessage ||
                                    "추가 확인이 필요한 자료와 요청사항이 이 영역에 노출됩니다."
                                  }
                                />

                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={() => handleSaveRequestDraft(app)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-zinc-200 bg-white text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all"
                                  >
                                    요청 문안 저장
                                  </button>

                                  <button
                                    onClick={() => {
                                      const message = (requestDraft.requestMessage || "").trim();
                                      if (!message) {
                                        alert("추가자료 요청 문안을 먼저 입력해 주세요.");
                                        return;
                                      }
                                      handleAction(app, date, "additional_requested", message);
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-95 transition-all"
                                  >
                                    추가자료 요청 발송
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-8 animate-pulse text-center">
            <BarChart3 size={80} strokeWidth={1} />
            <p className="font-black uppercase tracking-[0.4em] text-sm">No matching proposals</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminDashboard;
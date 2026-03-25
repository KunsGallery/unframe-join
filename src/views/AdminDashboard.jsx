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
  return status || "-";
};

const getProgramLabel = (program) => {
  if (!program) return "-";
  return `${program.name} · ${program.price}만원`;
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

  const handleAction = async (appDoc, date, status, reason = "") => {
  try {
    if (status === "confirmed") {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id),
        { status: "confirmed" }
      );

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

      if (appDoc.applicantEmail) {
        try {
          await sendApplicationStatusEmail({
            type: "approved",
            applicantName:
              appDoc.name ||
              appDoc.realName ||
              appDoc.brandName ||
              appDoc.stageName ||
              "Applicant",
            applicantEmail: appDoc.applicantEmail,
            exhibitionTitle: appDoc.exhibitionTitle,
            selectedDate: appDoc.selectedDate,
            selectedProgram: appDoc.selectedProgram,
            partnerType: appDoc.partnerType,
            applicationDetailUrl: `${window.location.origin}/?view=my-page&app=${appDoc.id}`,
          });
        } catch (mailError) {
          console.error("approve mail failed:", mailError);
        }
      }
    } else if (status === "additional_requested") {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id),
        {
          status: "additional_requested",
          requestMessage: reason || "",
          requestUpdatedAt: serverTimestamp(),
        }
      );

      if (appDoc.applicantEmail) {
        try {
          await sendApplicationStatusEmail({
            type: "additional_requested",
            applicantName:
              appDoc.name ||
              appDoc.realName ||
              appDoc.brandName ||
              appDoc.stageName ||
              "Applicant",
            applicantEmail: appDoc.applicantEmail,
            exhibitionTitle: appDoc.exhibitionTitle,
            selectedDate: appDoc.selectedDate,
            selectedProgram: appDoc.selectedProgram,
            partnerType: appDoc.partnerType,
            requestMessage: reason || "",
            applicationDetailUrl: `${window.location.origin}/?view=my-page&app=${appDoc.id}`,
          });
        } catch (mailError) {
          console.error("request more mail failed:", mailError);
        }
      }
    } else if (status === "rejected" || status === "delete") {
      if (status === "rejected") {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id),
          {
            status: "rejected",
            rejectionReason: reason || "",
          }
        );

        if (appDoc.applicantEmail) {
          try {
            await sendApplicationStatusEmail({
              type: "rejected",
              applicantName:
                appDoc.name ||
                appDoc.realName ||
                appDoc.brandName ||
                appDoc.stageName ||
                "Applicant",
              applicantEmail: appDoc.applicantEmail,
              exhibitionTitle: appDoc.exhibitionTitle,
              selectedDate: appDoc.selectedDate,
              selectedProgram: appDoc.selectedProgram,
              partnerType: appDoc.partnerType,
              rejectionReason: reason || "",
              applicationDetailUrl: `${window.location.origin}/?view=my-page&app=${appDoc.id}`,
            });
          } catch (mailError) {
            console.error("reject mail failed:", mailError);
          }
        }
      } else {
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id)
        );
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

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
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
              <div className="h-[260px] flex items-center justify-center text-zinc-300 font-black uppercase tracking-[0.25em] text-sm">
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
                {apps.map((app) => (
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
                                : "bg-red-400"
                            }`}
                          >
                            {app.status}
                          </div>

                          <h4 className="text-2xl md:text-4xl font-black uppercase leading-tight break-words text-left">
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

                        <div className="w-full lg:w-[280px] space-y-3 text-left">
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
                                placeholder="사유 입력..."
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
                                disabled={app.status === "rejected"}
                                onClick={() => setRejectId(app.id)}
                                className="w-full py-5 border border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-red-50 transition-all text-center"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => {
                                  const message = window.prompt("추가로 요청할 자료 내용을 입력해 주세요.");
                                  if (!message) return;

                                  handleAction(app, date, "additional_requested", message);
                                }}
                                className="w-full py-5 border border-amber-200 text-amber-700 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-amber-50 transition-all text-center"
                              >
                                Request More
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
                      <div className="bg-zinc-50 border-t border-gray-100 p-8 md:p-16 animate-in slide-in-from-top-4 duration-500 text-left">
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
                                "
                                {app.partnerType === "brand" ? app.projectPurpose : app.artistNote}
                                "
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
                                  "{app.experimentText}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
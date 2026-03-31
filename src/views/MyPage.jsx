import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  User2,
  LayoutDashboard,
  FileText,
  History,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  Upload,
  Save,
  Mail,
  Phone,
  MapPin,
  Globe2,
  Building2,
  Palette,
} from "lucide-react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const EMPTY_PROFILE = {
  realName: "",
  stageName: "",
  englishName: "",
  brandName: "",
  phone: "",
  addressMain: "",
  addressDetail: "",
  snsLink: "",
};

const STATUS_META = {
  review: {
    label: "검토 중",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    icon: <Clock3 size={14} />,
  },
  pending: {
    label: "접수 완료",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    icon: <Clock3 size={14} />,
  },
  approved: {
    label: "승인",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 size={14} />,
  },
  rejected: {
    label: "미선정",
    className: "bg-red-50 text-red-600 border-red-200",
    icon: <XCircle size={14} />,
  },
  additional_requested: {
    label: "추가자료 요청",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertCircle size={14} />,
  },
  additional_submitted: {
    label: "추가자료 제출 완료",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Upload size={14} />,
  },
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("ko-KR");
      }
      return value;
    }
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString("ko-KR");
    }
    return "-";
  } catch {
    return "-";
  }
};

const getStatusMeta = (status) => {
  return (
    STATUS_META[status] || {
      label: status || "상태 없음",
      className: "bg-zinc-100 text-zinc-600 border-zinc-200",
      icon: <Clock3 size={14} />,
    }
  );
};

const sortApplications = (apps) => {
  return [...apps].sort((a, b) => {
    const aTime = a?.submittedAt?.seconds || 0;
    const bTime = b?.submittedAt?.seconds || 0;
    return bTime - aTime;
  });
};

const TabButton = ({ icon, label, active, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
      active
        ? "bg-[#004aad] text-white border-[#004aad] shadow-lg"
        : "bg-white text-zinc-700 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
    }`}
  >
    <span className="flex items-center gap-3 min-w-0">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs sm:text-sm font-black uppercase tracking-[0.12em] break-keep">
        {label}
      </span>
    </span>

    {typeof count === "number" ? (
      <span
        className={`text-[10px] font-black px-2 py-1 rounded-full ${
          active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {count}
      </span>
    ) : null}
  </button>
);

const StatusChip = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black ${meta.className}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
};

const EmptyPanel = ({ title, desc }) => (
  <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
    <h3 className="text-lg font-black text-zinc-900 mb-3 break-keep">{title}</h3>
    <p className="text-sm font-bold text-zinc-400 leading-relaxed break-keep">{desc}</p>
  </div>
);

const ApplicationCard = ({ app, isActive, onClick }) => {
  const statusMeta = getStatusMeta(app.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-[28px] border px-5 py-5 transition-all ${
        isActive
          ? "bg-[#004aad]/5 border-[#004aad]/20 shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
          : "bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_16px_30px_rgba(0,0,0,0.04)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
            Application
          </p>
          <h3 className="text-lg md:text-xl font-black text-zinc-900 leading-tight break-keep">
            {app.exhibitionTitle || "제목 없음"}
          </h3>
        </div>
        <ChevronRight size={18} className="text-zinc-300 shrink-0 mt-1" />
      </div>

      <div className="mb-4">
        <StatusChip status={app.status} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-zinc-50 border border-zinc-100 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-1">
            Program
          </p>
          <p className="text-sm font-bold text-zinc-700 break-keep">
            {app.selectedProgram?.name
              ? `${app.selectedProgram.name} · ${app.selectedProgram.price}만원`
              : "-"}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 border border-zinc-100 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-1">
            Date
          </p>
          <p className="text-sm font-bold text-zinc-700 break-keep">
            {app.selectedDate || "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 text-[11px] font-black text-zinc-400">
        제출일 {formatDate(app.submittedAt)}
      </div>
    </button>
  );
};

const ApplicationDetailPanel = ({ app }) => {
  if (!app) {
    return (
      <EmptyPanel
        title="선택된 신청 내역이 없습니다"
        desc="좌측 또는 상단의 신청 카드에서 하나를 선택하면 상세 내용을 볼 수 있습니다."
      />
    );
  }

  const partnerLabel =
    app.partnerType === "brand" ? "Brand / Team" : "Artist";

  const nextAction =
    app.status === "additional_requested"
      ? "추가자료를 업로드해 주세요."
      : app.status === "approved"
      ? "가이드와 세부 진행 사항을 확인해 주세요."
      : app.status === "rejected"
      ? "심사 결과와 피드백을 확인해 주세요."
      : "검토가 진행 중입니다.";

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-zinc-100 bg-white px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
              Selected Application
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-zinc-900 leading-tight break-keep">
              {app.exhibitionTitle || "제목 없음"}
            </h3>
            <p className="mt-3 text-sm font-bold text-zinc-400 break-keep">
              {partnerLabel} · {app.selectedDate || "-"}
            </p>
          </div>

          <div className="shrink-0">
            <StatusChip status={app.status} />
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-[#004aad]/12 bg-[#004aad]/5 px-6 py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad] mb-2">
          Next Action
        </p>
        <p className="text-sm md:text-base font-black text-zinc-800 break-keep">
          {nextAction}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 mb-3">
            Overview
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 mb-1">
                Program
              </p>
              <p className="text-sm font-bold text-zinc-700 break-keep">
                {app.selectedProgram?.name
                  ? `${app.selectedProgram.name} · ${app.selectedProgram.price}만원`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 mb-1">
                Submitted
              </p>
              <p className="text-sm font-bold text-zinc-700">
                {formatDate(app.submittedAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 mb-1">
                Email
              </p>
              <p className="text-sm font-bold text-zinc-700 break-all">
                {app.applicantEmail || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 mb-3">
            Summary
          </p>
          <p className="text-sm font-bold text-zinc-500 leading-relaxed break-keep">
            {app.partnerType === "brand"
              ? app.projectPurpose || "아직 등록된 제안 요약이 없습니다."
              : app.artistNote || "아직 등록된 프로젝트 요약이 없습니다."}
          </p>
        </div>
      </div>
    </div>
  );
};

const ProfileForm = ({
  profileForm,
  setProfileForm,
  onSave,
  saving,
  user,
}) => (
  <div className="space-y-5">
    <div className="rounded-[30px] border border-zinc-100 bg-white px-6 py-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
        Profile
      </p>
      <h3 className="text-2xl md:text-3xl font-black text-zinc-900 break-keep">
        기본정보 관리
      </h3>
      <p className="mt-3 text-sm font-bold text-zinc-400 leading-relaxed break-keep">
        저장된 정보는 이후 신청서 작성 시 더 빠르게 활용할 수 있도록 확장할 수 있습니다.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-5">
      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          본명 / 담당자명
        </label>
        <input
          value={profileForm.realName}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, realName: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="이름을 입력해 주세요"
        />
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          활동명 / 예명
        </label>
        <input
          value={profileForm.stageName}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, stageName: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="활동명 또는 예명을 입력해 주세요"
        />
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          영문 이름
        </label>
        <input
          value={profileForm.englishName}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, englishName: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="예: Hong Gil Dong"
        />
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          브랜드명 / 소속
        </label>
        <input
          value={profileForm.brandName}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, brandName: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="브랜드명 또는 소속을 입력해 주세요"
        />
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          연락처
        </label>
        <input
          value={profileForm.phone}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="010-0000-0000"
        />
      </div>

      <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
        <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
          SNS / Website
        </label>
        <input
          value={profileForm.snsLink}
          onChange={(e) =>
            setProfileForm((prev) => ({ ...prev, snsLink: e.target.value }))
          }
          className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
          placeholder="@instagram / https://"
        />
      </div>
    </div>

    <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
        기본 주소
      </label>
      <input
        value={profileForm.addressMain}
        onChange={(e) =>
          setProfileForm((prev) => ({ ...prev, addressMain: e.target.value }))
        }
        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white mb-3"
        placeholder="기본 주소"
      />
      <input
        value={profileForm.addressDetail}
        onChange={(e) =>
          setProfileForm((prev) => ({ ...prev, addressDetail: e.target.value }))
        }
        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none focus:bg-white"
        placeholder="상세 주소"
      />
    </div>

    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#004aad] text-white text-[11px] font-black uppercase tracking-[0.14em] hover:opacity-90 transition-all disabled:opacity-50"
      >
        <Save size={15} />
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>

    <div className="rounded-[24px] border border-zinc-100 bg-zinc-50 px-4 py-4 text-xs font-bold text-zinc-500 leading-relaxed break-keep">
      로그인 계정: {user?.email || "-"}
    </div>
  </div>
);

const HistoryPanel = ({ applications }) => {
  const approvedItems = applications.filter((app) => app.status === "approved");

  if (approvedItems.length === 0) {
    return (
      <EmptyPanel
        title="아직 확정된 전시 / 협업 이력이 없습니다"
        desc="승인된 프로젝트가 쌓이면 이곳에서 진행 이력과 기록을 함께 관리할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      {approvedItems.map((app) => (
        <div
          key={app.id}
          className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
                Exhibition / Collaboration
              </p>
              <h3 className="text-xl font-black text-zinc-900 break-keep">
                {app.exhibitionTitle || "-"}
              </h3>
              <p className="mt-2 text-sm font-bold text-zinc-400 break-keep">
                {app.selectedDate || "-"} ·{" "}
                {app.selectedProgram?.name
                  ? `${app.selectedProgram.name} · ${app.selectedProgram.price}만원`
                  : "-"}
              </p>
            </div>

            <StatusChip status={app.status} />
          </div>
        </div>
      ))}
    </div>
  );
};

const UpdatesPanel = ({ applications }) => {
  const items = sortApplications(applications).slice(0, 5);

  if (items.length === 0) {
    return (
      <EmptyPanel
        title="아직 표시할 최근 업데이트가 없습니다"
        desc="신청이나 상태 변경이 발생하면 최근 업데이트가 이곳에 정리됩니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((app) => {
        const meta = getStatusMeta(app.status);
        return (
          <div
            key={app.id}
            className="rounded-[26px] border border-zinc-100 bg-white px-5 py-5"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 text-[#004aad]">{meta.icon}</div>
              <div className="min-w-0">
                <p className="text-sm font-black text-zinc-900 break-keep">
                  {app.exhibitionTitle || "제목 없음"}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-500 leading-relaxed break-keep">
                  현재 상태는 <span className="text-zinc-800">{meta.label}</span> 입니다.
                </p>
                <p className="mt-2 text-[11px] font-black text-zinc-300">
                  {formatDate(app.submittedAt)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardPanel = ({
  profileForm,
  user,
  applications,
  selectedApplication,
  setActiveTab,
}) => {
  const latestApp = sortApplications(applications)[0] || null;
  const current = selectedApplication || latestApp;

  const displayName =
    profileForm.stageName ||
    profileForm.realName ||
    profileForm.brandName ||
    user?.displayName ||
    "Partner";

  const nextAction =
    !current
      ? "아직 신청 내역이 없습니다. 새로운 신청을 시작해 보세요."
      : current.status === "additional_requested"
      ? "추가자료 요청이 도착했습니다. 신청 상세를 확인해 주세요."
      : current.status === "approved"
      ? "승인된 프로젝트의 가이드와 다음 단계를 확인해 주세요."
      : current.status === "rejected"
      ? "심사 결과와 피드백을 확인해 주세요."
      : "현재 신청 건이 검토 중입니다.";

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-zinc-100 bg-white px-6 py-6">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
              Partner Dashboard
            </p>
            <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight break-keep">
              안녕하세요, {displayName}님.
            </h2>
            <p className="mt-4 text-sm md:text-base font-bold text-zinc-500 leading-relaxed break-keep">
              현재 진행 상태와 다음 액션을 한눈에 확인할 수 있도록 정리했습니다.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#004aad]/12 bg-[#004aad]/5 px-5 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad] mb-2">
              Next Action
            </p>
            <p className="text-sm font-black text-zinc-800 leading-relaxed break-keep">
              {nextAction}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
            Total Applications
          </p>
          <p className="text-3xl font-black text-zinc-900">{applications.length}</p>
        </div>

        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
            Latest Status
          </p>
          <div className="mt-2">
            {current ? <StatusChip status={current.status} /> : <p className="text-sm font-bold text-zinc-400">-</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 mb-2">
            Selected Program
          </p>
          <p className="text-sm font-bold text-zinc-700 break-keep">
            {current?.selectedProgram?.name
              ? `${current.selectedProgram.name} · ${current.selectedProgram.price}만원`
              : "-"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-black text-zinc-900">현재 신청 요약</h3>
            <button
              type="button"
              onClick={() => setActiveTab("applications")}
              className="text-[10px] font-black uppercase tracking-[0.14em] text-[#004aad]"
            >
              See More
            </button>
          </div>
          {current ? <ApplicationDetailPanel app={current} /> : <EmptyPanel title="신청 내역 없음" desc="아직 등록된 신청 내역이 없습니다." />}
        </div>

        <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-black text-zinc-900">기본 프로필 요약</h3>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="text-[10px] font-black uppercase tracking-[0.14em] text-[#004aad]"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User2 size={16} className="text-zinc-300 mt-0.5" />
              <p className="text-sm font-bold text-zinc-600 break-keep">
                {profileForm.realName || profileForm.stageName || user?.displayName || "-"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-zinc-300 mt-0.5" />
              <p className="text-sm font-bold text-zinc-600 break-all">
                {user?.email || "-"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Phone size={16} className="text-zinc-300 mt-0.5" />
              <p className="text-sm font-bold text-zinc-600">
                {profileForm.phone || "-"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Globe2 size={16} className="text-zinc-300 mt-0.5" />
              <p className="text-sm font-bold text-zinc-600 break-all">
                {profileForm.snsLink || "-"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-zinc-300 mt-0.5" />
              <p className="text-sm font-bold text-zinc-600 break-keep">
                {profileForm.addressMain || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyPage = ({
  applications,
  handleReturn,
  db,
  appId,
  user,
  focusedApplicationId,
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAppId, setSelectedAppId] = useState(focusedApplicationId || "");
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const orderedApplications = useMemo(() => sortApplications(applications || []), [applications]);

  useEffect(() => {
    if (!selectedAppId && focusedApplicationId) {
      setSelectedAppId(focusedApplicationId);
    }
  }, [focusedApplicationId, selectedAppId]);

  useEffect(() => {
    if (!selectedAppId && orderedApplications.length > 0) {
      setSelectedAppId(orderedApplications[0].id);
    }
  }, [orderedApplications, selectedAppId]);

  const selectedApplication = useMemo(
    () => orderedApplications.find((app) => app.id === selectedAppId) || orderedApplications[0] || null,
    [orderedApplications, selectedAppId]
  );

  useEffect(() => {
    if (!user?.uid) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const ref = doc(db, "artifacts", appId, "users", user.uid, "profile", "basic");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setProfileForm({ ...EMPTY_PROFILE, ...snap.data() });
        } else {
          setProfileForm({
            ...EMPTY_PROFILE,
            realName: user.displayName || "",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [db, appId, user]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;

    try {
      setProfileSaving(true);
      const ref = doc(db, "artifacts", appId, "users", user.uid, "profile", "basic");

      await setDoc(
        ref,
        {
          ...profileForm,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("기본정보가 저장되었습니다.");
    } catch (error) {
      console.error(error);
      alert("기본정보 저장 중 오류가 발생했습니다.");
    } finally {
      setProfileSaving(false);
    }
  };

  const tabs = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={16} />,
    },
    {
      key: "applications",
      label: "Applications",
      icon: <FileText size={16} />,
      count: orderedApplications.length,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <User2 size={16} />,
    },
    {
      key: "history",
      label: "History",
      icon: <History size={16} />,
    },
    {
      key: "updates",
      label: "Updates",
      icon: <Bell size={16} />,
    },
  ];

  return (
    <section className="animate-in fade-in duration-700 max-w-7xl mx-auto px-4">
      <div className="mb-8 md:mb-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
            My Page
          </p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 break-keep">
            Partner Hub
          </h1>
        </div>

        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-zinc-100 bg-white text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-900 transition-all"
        >
          <ArrowLeft size={15} />
          Back
        </button>
      </div>

      <div className="grid xl:grid-cols-[260px_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
        <aside className="xl:sticky xl:top-28">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {profileLoading ? (
            <div className="rounded-[32px] border border-zinc-100 bg-white px-6 py-20 text-center">
              <p className="text-sm font-black text-zinc-400">프로필을 불러오는 중입니다...</p>
            </div>
          ) : activeTab === "dashboard" ? (
            <DashboardPanel
              profileForm={profileForm}
              user={user}
              applications={orderedApplications}
              selectedApplication={selectedApplication}
              setActiveTab={setActiveTab}
            />
          ) : activeTab === "applications" ? (
            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-5">
              <div className="space-y-4">
                {orderedApplications.length === 0 ? (
                  <EmptyPanel
                    title="아직 신청 내역이 없습니다"
                    desc="신청이 등록되면 이곳에서 상태와 상세 내용을 한눈에 확인하실 수 있습니다."
                  />
                ) : (
                  orderedApplications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      isActive={selectedApplication?.id === app.id}
                      onClick={() => setSelectedAppId(app.id)}
                    />
                  ))
                )}
              </div>

              <div>
                <ApplicationDetailPanel app={selectedApplication} />
              </div>
            </div>
          ) : activeTab === "profile" ? (
            <ProfileForm
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              onSave={handleSaveProfile}
              saving={profileSaving}
              user={user}
            />
          ) : activeTab === "history" ? (
            <HistoryPanel applications={orderedApplications} />
          ) : activeTab === "updates" ? (
            <UpdatesPanel applications={orderedApplications} />
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default MyPage;
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Upload,
  Loader2,
  RefreshCcw,
  FileText,
  ArrowRight,
  CircleHelp,
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  uploadImageToImgbb,
  uploadDocumentToR2,
  validateImageFile,
  validateDocumentFile,
} from "../lib/uploads";

const getStatusMeta = (status) => {
  if (status === "confirmed") {
    return {
      label: "승인",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle2 size={14} />,
    };
  }

  if (status === "rejected") {
    return {
      label: "미선정",
      className: "bg-red-100 text-red-600",
      icon: <AlertCircle size={14} />,
    };
  }

  if (status === "additional_requested") {
    return {
      label: "추가자료 요청",
      className: "bg-amber-100 text-amber-700",
      icon: <Mail size={14} />,
    };
  }

  return {
    label: "심사중",
    className: "bg-[#004aad]/10 text-[#004aad]",
    icon: <Clock3 size={14} />,
  };
};

const getStatusPageCopy = (app) => {
  if (app.status === "confirmed") {
    return {
      eyebrow: "Approved",
      title: app.customGuideTitle || "진행 가이드",
      description:
        app.customGuideIntro ||
        "승인 이후 필요한 자료와 진행 흐름을 이 페이지에서 확인하실 수 있습니다. 세부 일정과 준비 사항은 순차적으로 안내드립니다.",
    };
  }

  if (app.status === "rejected") {
    return {
      eyebrow: "Review Result",
      title: "검토 결과",
      description:
        "이번 회차 검토 결과와 다음 지원 시 참고하실 수 있는 보완 포인트를 안내드립니다.",
    };
  }

  if (app.status === "additional_requested") {
    return {
      eyebrow: "Additional Request",
      title: "보완 요청",
      description:
        "추가 확인이 필요한 자료와 요청사항을 확인하신 뒤, 이 페이지에서 바로 업로드 및 회신하실 수 있습니다.",
    };
  }

  return {
    eyebrow: "In Review",
    title: "현재 검토 중입니다",
    description:
      "제출해 주신 자료를 순차적으로 확인하고 있습니다. 결과 또는 추가 요청이 있을 경우, 이 페이지와 이메일을 통해 안내드립니다.",
  };
};

const getGuideSections = (app) => {
  const programName = app?.selectedProgram?.name || "선택 프로그램";
  const programPrice = app?.selectedProgram?.price
    ? `${app.selectedProgram.price}만원`
    : "";
  const partnerType = app?.partnerType || "artist";
  const projectTitle = app?.exhibitionTitle || "프로젝트";

  const commonSections = [
    {
      id: "next-steps",
      title: "다음 진행 단계",
      description:
        "승인 이후의 커뮤니케이션과 준비 과정을 한눈에 확인할 수 있도록 정리했습니다.",
      items: [
        "세부 일정 및 진행 방향은 등록된 이메일을 통해 순차적으로 안내됩니다.",
        "필요 시 추가 서류, 설치 참고자료, 이미지 원본 등을 요청드릴 수 있습니다.",
        "오프닝, 현장 운영, 기본 안내 방식은 프로젝트 성격에 맞춰 조율됩니다.",
      ],
    },
    {
      id: "communication",
      title: "커뮤니케이션 원칙",
      description:
        "프로젝트 진행 중 전달되는 주요 안내는 이메일을 기준으로 하며, 필요한 경우 추가 연락이 진행됩니다.",
      items: [
        "중요한 안내는 이메일을 기준으로 전달됩니다.",
        "제출 자료의 변경이 필요한 경우 사전 공유 후 진행해 주세요.",
        "일정 변경이나 취소가 필요한 경우 가능한 빠르게 알려주셔야 합니다.",
      ],
    },
  ];

  const artistSections = [
    {
      id: "artist-materials",
      title: "작가 제출 자료 가이드",
      description:
        "전시 진행을 위해 아래 자료를 요청드릴 수 있습니다. 프로젝트 성격에 따라 일부 항목은 조정될 수 있습니다.",
      items: [
        "작품 리스트 최종본",
        "대표 이미지 및 설치 참고 이미지",
        "작가 노트 또는 전시 소개문 최종본",
        "캡션 표기 정보 및 영문 표기 확인",
      ],
    },
    {
      id: "artist-space",
      title: "전시 운영 안내",
      description: `${projectTitle}는 ${programName}${programPrice ? ` (${programPrice})` : ""} 기준으로 운영 검토가 완료된 상태입니다.`,
      items: [
        "설치 및 철수 관련 기본 일정은 사전 조율 후 확정됩니다.",
        "공간 운영 및 관람 동선 관련 세부 사항은 내부 기준에 따라 조정될 수 있습니다.",
        "오프닝 진행 여부 및 현장 응대 방식은 프로젝트 방향에 맞춰 개별 안내됩니다.",
      ],
    },
  ];

  const brandSections = [
    {
      id: "brand-materials",
      title: "브랜드/기획 제출 자료 가이드",
      description:
        "협업 및 공간 활용 검토를 위해 아래 자료를 기준으로 최종 정리를 요청드릴 수 있습니다.",
      items: [
        "프로젝트 소개서 또는 기획안 최종본",
        "브랜드 소개 자료 및 시각 자료",
        "공간 활용 방식, 설치 방식 관련 참고 자료",
        "운영 및 일정 관련 실무 담당 정보",
      ],
    },
    {
      id: "brand-operation",
      title: "프로젝트 운영 안내",
      description: `${projectTitle}는 ${programName}${programPrice ? ` (${programPrice})` : ""} 기준으로 운영 검토가 완료된 상태입니다.`,
      items: [
        "공간 활용 범위와 세부 연출은 사전 협의 후 확정됩니다.",
        "현장 운영, 응대 방식, 기본 안내 요소는 프로젝트 목적에 따라 조율됩니다.",
        "추가 제작물 또는 현장 설치 요소가 필요한 경우 별도 협의가 진행될 수 있습니다.",
      ],
    },
  ];

  return [...(partnerType === "brand" ? brandSections : artistSections), ...commonSections];
};

const getReviewBlocks = (app) => {
  return {
    summary:
      app.reviewSummary ||
      "이번 회차에서는 프로젝트의 전체 방향성과 전달 밀도, 제출 자료의 완성도를 중심으로 검토했습니다.",
    improvement:
      app.improvementSuggestions ||
      "대표 이미지의 선명도, 프로젝트 설명의 구조, 전시 구성안의 구체성을 조금 더 정리해주시면 다음 검토에서 강점이 더 분명하게 전달될 수 있습니다.",
  };
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded-[22px] border border-zinc-100 bg-white p-5">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
      {label}
    </p>
    <p className="text-sm font-bold text-zinc-700 break-keep whitespace-pre-wrap">
      {value || "-"}
    </p>
  </div>
);

const SectionCard = ({ title, description, items }) => (
  <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004aad] mb-3">
      {title}
    </p>
    {description && (
      <p className="text-sm font-bold text-zinc-600 leading-relaxed mb-5 break-keep whitespace-pre-wrap">
        {description}
      </p>
    )}
    {items?.length > 0 && (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={`${title}-${idx}`} className="flex items-start gap-3">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
            <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
              {item}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const DetailInfoCard = ({ eyebrow, title, children, tone = "default" }) => {
  const toneClass =
    tone === "blue"
      ? "border-[#004aad]/15 bg-[#004aad]/5"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "red"
      ? "border-red-200 bg-red-50"
      : "border-zinc-100 bg-white";

  return (
    <div className={`rounded-3xl border p-5 md:p-6 ${toneClass}`}>
      {eyebrow ? (
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 mb-2">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h4 className="text-lg md:text-xl font-black text-zinc-900 mb-3 break-keep">
          {title}
        </h4>
      ) : null}
      <div className="text-sm md:text-[15px] font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap break-keep">
        {children}
      </div>
    </div>
  );
};

const UploadLine = ({ label, value, loading, error, success, onClick }) => (
  <div className="rounded-[20px] border border-zinc-100 bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-1">
          {label}
        </p>
        <p className="text-sm font-bold text-zinc-700 break-all">
          {value ? "업로드 완료" : "미등록"}
        </p>
      </div>

      <button
        onClick={onClick}
        type="button"
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-zinc-100 transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        교체 업로드
      </button>
    </div>

    {error && <p className="mt-3 text-xs font-black text-red-500">{error}</p>}
    {success && <p className="mt-3 text-xs font-black text-emerald-600">{success}</p>}
  </div>
);

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
};

const MyPage = ({ applications = [], handleReturn, db, appId, user, focusedApplicationId }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [responseMap, setResponseMap] = useState({});
  const [uploadingMap, setUploadingMap] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [savingId, setSavingId] = useState(null);

  const portfolioRefs = useRef({});
  const workListRefs = useRef({});
  const highResRefs = useRef({});

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aDate = a.selectedDate || "";
      const bDate = b.selectedDate || "";
      return bDate.localeCompare(aDate);
    });
  }, [applications]);

  useEffect(() => {
    if (!focusedApplicationId) return;
    const found = applications.find((app) => app.id === focusedApplicationId);
    if (found) {
      setExpandedId(found.id);
    }
  }, [focusedApplicationId, applications]);

  const setUploading = (applicationId, field, value) => {
    setUploadingMap((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || {}),
        [field]: value,
      },
    }));
  };

  const setFieldError = (applicationId, field, value) => {
    setUploadErrors((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || {}),
        [field]: value,
      },
    }));
  };

  const setResponseField = (applicationId, key, value) => {
    setResponseMap((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || {}),
        [key]: value,
      },
    }));
  };

  const getDraftValue = (app, key) => {
    return responseMap[app.id]?.[key] ?? app[key] ?? "";
  };

  const handleDocumentReplace = async (app, fieldName, folder, file) => {
    const error = validateDocumentFile(file);
    if (error) {
      setFieldError(app.id, fieldName, error);
      return;
    }

    setFieldError(app.id, fieldName, "");
    setUploading(app.id, fieldName, true);

    try {
      const result = await uploadDocumentToR2({
        file,
        folder,
        userId: user?.uid || "anonymous",
      });

      setResponseField(app.id, fieldName, result.url);
    } catch (err) {
      setFieldError(app.id, fieldName, err.message || "문서 업로드 실패");
    } finally {
      setUploading(app.id, fieldName, false);
    }
  };

  const handleImageReplace = async (app, fieldName, file) => {
    const error = validateImageFile(file);
    if (error) {
      setFieldError(app.id, fieldName, error);
      return;
    }

    setFieldError(app.id, fieldName, "");
    setUploading(app.id, fieldName, true);

    try {
      const result = await uploadImageToImgbb(file);
      setResponseField(app.id, fieldName, result.url);
    } catch (err) {
      setFieldError(app.id, fieldName, err.message || "이미지 업로드 실패");
    } finally {
      setUploading(app.id, fieldName, false);
    }
  };

  const handleResubmit = async (app) => {
    const draft = responseMap[app.id] || {};
    const additionalResponse = (draft.additionalResponse || "").trim();

    if (!additionalResponse) {
      alert("추가자료에 대한 설명 또는 회신 내용을 입력해 주세요.");
      return;
    }

    const appUploadState = uploadingMap[app.id] || {};
    if (Object.values(appUploadState).some(Boolean)) {
      alert("업로드가 완료될 때까지 기다려 주세요.");
      return;
    }

    setSavingId(app.id);

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "applications", app.id),
        {
          status: "review",
          additionalResponse,
          additionalSubmittedAt: serverTimestamp(),
          portfolioUrl: draft.portfolioUrl || app.portfolioUrl || "",
          workListUrl: draft.workListUrl || app.workListUrl || "",
          highResPhotosUrl: draft.highResPhotosUrl || app.highResPhotosUrl || "",
        }
      );

      for (const phone of ["01037848885", "01020494878"]) {
        try {
          await fetch("/.netlify/functions/send-kakao-alimtalk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "additional_submitted_admin",
              to: phone,
              applicantName:
                app.name || app.realName || app.brandName || app.stageName || "신청자",
              exhibitionTitle: app.exhibitionTitle || "-",
            }),
          });
        } catch (kakaoError) {
          console.error("additional_submitted_admin kakao failed:", kakaoError);
        }
      }

      alert("추가자료가 재제출되었습니다.");
      setResponseMap((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          additionalResponse: "",
        },
      }));
    } catch (error) {
      console.error(error);
      alert("재제출 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto py-20 px-4 text-zinc-900">
      <div className="flex items-center justify-between mb-14">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004aad] mb-4">
            My Applications
          </p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
            신청 내역
          </h2>
        </div>

        <button
          onClick={handleReturn}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 text-xs font-black uppercase tracking-[0.2em]"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {sortedApplications.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl p-16 text-center">
          <p className="text-zinc-300 font-black uppercase tracking-[0.3em] text-sm">
            No applications yet
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedApplications.map((app) => {
            const meta = getStatusMeta(app.status);
            const pageCopy = getStatusPageCopy(app);
            const isExpanded = expandedId === app.id;
            const appUploads = uploadingMap[app.id] || {};
            const appErrors = uploadErrors[app.id] || {};
            const guideSections = getGuideSections(app);
            const reviewBlocks = getReviewBlocks(app);

            return (
              <div
                key={app.id}
                className="bg-white rounded-[36px] border border-zinc-100 shadow-xl overflow-hidden"
              >
                <div className="p-8 md:p-10">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                    <div className="space-y-5">
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black ${meta.className}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </div>

                      <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-tight break-keep">
                        {app.exhibitionTitle || "Untitled Project"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-zinc-500">
                        <span className="inline-flex items-center gap-2">
                          <Calendar size={14} />
                          {app.selectedDate || "-"}
                        </span>

                        {app.selectedProgram && (
                          <span className="px-3 py-1.5 rounded-full bg-[#004aad]/10 text-[#004aad] text-[10px] font-black uppercase tracking-widest">
                            {app.selectedProgram.name} · {app.selectedProgram.price}만원
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="inline-flex items-center justify-center gap-2 bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-zinc-100 transition-all"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} />
                          상세 닫기
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          상세 보기
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50 p-8 md:p-10 space-y-8">
                    <div className="rounded-[30px] border border-zinc-100 bg-white p-7 md:p-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#004aad] mb-4">
                        {pageCopy.eyebrow}
                      </p>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                          {app.status === "confirmed" ? (
                            <CheckCircle2 size={20} />
                          ) : app.status === "rejected" ? (
                            <AlertCircle size={20} />
                          ) : app.status === "additional_requested" ? (
                            <CircleHelp size={20} />
                          ) : (
                            <Clock3 size={20} />
                          )}
                        </div>

                        <div>
                          <h4 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-2">
                            {pageCopy.title}
                          </h4>
                          <p className="text-sm font-bold text-zinc-600 leading-relaxed break-keep">
                            {pageCopy.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                      <SummaryCard label="프로젝트명" value={app.exhibitionTitle || "-"} />
                      <SummaryCard label="선택 일정" value={app.selectedDate || "-"} />
                      <SummaryCard
                        label="선택 프로그램"
                        value={
                          app.selectedProgram
                            ? `${app.selectedProgram.name} · ${app.selectedProgram.price}만원`
                            : "-"
                        }
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <SummaryCard
                        label="신청자 정보"
                        value={`이름: ${app.name || app.realName || app.brandName || "-"}\n이메일: ${
                          app.applicantEmail || "-"
                        }\n연락처: ${app.phone || "-"}`}
                      />
                      <SummaryCard
                        label="기본 자료"
                        value={`포트폴리오: ${getDraftValue(app, "portfolioUrl") ? "등록됨" : "미등록"}\n작품리스트: ${
                          getDraftValue(app, "workListUrl") ? "등록됨" : "미등록"
                        }\n대표작 원본: ${getDraftValue(app, "highResPhotosUrl") ? "등록됨" : "미등록"}`}
                      />
                    </div>

                    {app.status === "review" && (
                      <div className="space-y-5">
                        <DetailInfoCard
                          eyebrow="In Review"
                          title="현재 검토 중입니다"
                          tone="blue"
                        >
                          제출해 주신 자료를 순차적으로 확인하고 있습니다.
                          결과 또는 추가 요청이 있을 경우, 이 페이지와 이메일을 통해 안내드립니다.
                        </DetailInfoCard>

                        <div className="grid md:grid-cols-2 gap-5">
                          <SectionCard
                            title="검토 진행 안내"
                            description="현재 신청 내용은 내부 검토 중이며, 결과는 이메일 및 안내 메시지를 통해 전달됩니다."
                            items={[
                              "검토 단계에서는 신청 내용이 내부 기준에 따라 순차적으로 확인됩니다.",
                              "필요 시 추가자료 요청 또는 일정 관련 보완 안내가 진행될 수 있습니다.",
                              "제출 자료는 상세 영역에서 다시 확인하실 수 있습니다.",
                            ]}
                          />
                          <SectionCard
                            title="프로젝트 개요"
                            description={
                              app.partnerType === "brand"
                                ? app.projectPurpose || "-"
                                : app.artistNote || "-"
                            }
                          />
                        </div>
                      </div>
                    )}

                    {app.status === "confirmed" && (
                      <div className="space-y-5">
                        <DetailInfoCard
                          eyebrow="Approved"
                          title={app.customGuideTitle || "진행 가이드"}
                          tone="blue"
                        >
                          {app.customGuideIntro ||
                            "승인 이후 필요한 자료와 진행 흐름을 이 페이지에서 확인하실 수 있습니다. 세부 일정과 준비 사항은 순차적으로 안내드립니다."}
                        </DetailInfoCard>

                        <div className="grid md:grid-cols-2 gap-5">
                          {guideSections.slice(0, 2).map((section) => (
                            <SectionCard
                              key={section.id}
                              title={section.title}
                              description={section.description}
                              items={section.items}
                            />
                          ))}
                        </div>

                        {guideSections.slice(2).map((section) => (
                          <SectionCard
                            key={section.id}
                            title={section.title}
                            description={section.description}
                            items={section.items}
                          />
                        ))}

                        {app.guideNotes ? (
                          <DetailInfoCard
                            eyebrow="Director Note"
                            title="개별 안내 메모"
                            tone="default"
                          >
                            {app.guideNotes}
                          </DetailInfoCard>
                        ) : null}
                      </div>
                    )}

                    {app.status === "rejected" && (
                      <div className="space-y-5">
                        <DetailInfoCard
                          eyebrow="Review Result"
                          title="검토 결과"
                          tone="red"
                        >
                          {reviewBlocks.summary}
                        </DetailInfoCard>

                        {app.improvementSuggestions ? (
                          <DetailInfoCard
                            eyebrow="Suggestion"
                            title="보완 제안"
                            tone="default"
                          >
                            {reviewBlocks.improvement}
                          </DetailInfoCard>
                        ) : null}
                      </div>
                    )}

                    {app.status === "additional_requested" && (
                      <div className="space-y-5">
                        <DetailInfoCard
                          eyebrow="Additional Request"
                          title="보완 요청"
                          tone="amber"
                        >
                          {app.requestMessage ||
                            "추가 확인이 필요한 자료와 요청사항이 등록되면 이곳에 표시됩니다."}
                        </DetailInfoCard>

                        {app.requestUpdatedAt ? (
                          <div className="text-xs font-bold text-zinc-400">
                            최근 요청일 · {formatDateTime(app.requestUpdatedAt)}
                          </div>
                        ) : null}

                        <div className="rounded-[28px] border border-[#004aad]/15 bg-[#004aad]/5 p-6 md:p-7">
                          <div className="flex items-center gap-2 text-[#004aad] mb-4">
                            <RefreshCcw size={15} />
                            <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                              추가자료 재제출
                            </p>
                          </div>

                          <div className="space-y-4">
                            <UploadLine
                              label="포트폴리오"
                              value={getDraftValue(app, "portfolioUrl")}
                              loading={appUploads.portfolioUrl}
                              error={appErrors.portfolioUrl}
                              success={responseMap[app.id]?.portfolioUrl ? "새 파일 업로드 완료" : ""}
                              onClick={() => portfolioRefs.current[app.id]?.click()}
                            />

                            <UploadLine
                              label="작품리스트"
                              value={getDraftValue(app, "workListUrl")}
                              loading={appUploads.workListUrl}
                              error={appErrors.workListUrl}
                              success={responseMap[app.id]?.workListUrl ? "새 파일 업로드 완료" : ""}
                              onClick={() => workListRefs.current[app.id]?.click()}
                            />

                            <UploadLine
                              label="대표작 원본"
                              value={getDraftValue(app, "highResPhotosUrl")}
                              loading={appUploads.highResPhotosUrl}
                              error={appErrors.highResPhotosUrl}
                              success={
                                responseMap[app.id]?.highResPhotosUrl ? "새 파일 업로드 완료" : ""
                              }
                              onClick={() => highResRefs.current[app.id]?.click()}
                            />

                            <input
                              type="file"
                              className="hidden"
                              ref={(el) => (portfolioRefs.current[app.id] = el)}
                              accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleDocumentReplace(app, "portfolioUrl", "portfolio-reupload", file);
                              }}
                            />

                            <input
                              type="file"
                              className="hidden"
                              ref={(el) => (workListRefs.current[app.id] = el)}
                              accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleDocumentReplace(app, "workListUrl", "work-list-reupload", file);
                              }}
                            />

                            <input
                              type="file"
                              className="hidden"
                              ref={(el) => (highResRefs.current[app.id] = el)}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleImageReplace(app, "highResPhotosUrl", file);
                              }}
                            />

                            <div className="rounded-[20px] border border-zinc-100 bg-white p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
                                회신 내용
                              </p>

                              <p className="text-sm font-bold text-zinc-500 leading-relaxed break-keep mb-3">
                                어떤 자료를 보완했는지, 또는 함께 확인해 주셨으면 하는 내용을 간단히 적어 주세요.
                              </p>

                              <textarea
                                value={responseMap[app.id]?.additionalResponse || ""}
                                onChange={(e) =>
                                  setResponseField(app.id, "additionalResponse", e.target.value)
                                }
                                placeholder="요청받은 자료에 대한 설명이나 보완 내용을 작성해 주세요."
                                className="w-full h-32 rounded-2xl border border-zinc-100 bg-white p-4 text-sm font-bold text-zinc-700 outline-none resize-none"
                              />
                            </div>

                            {app.additionalSubmittedAt ? (
                              <div className="rounded-[18px] border border-zinc-100 bg-white p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                                  Last Submission
                                </p>
                                <p className="text-sm font-bold text-zinc-700">
                                  {formatDateTime(app.additionalSubmittedAt)}
                                </p>
                              </div>
                            ) : null}

                            <button
                              onClick={() => handleResubmit(app)}
                              disabled={savingId === app.id}
                              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-[#004aad] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all disabled:opacity-50"
                            >
                              {savingId === app.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  제출중
                                </>
                              ) : (
                                <>
                                  <ArrowRight size={14} />
                                  추가자료 재제출
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-3">
                        제출한 프로젝트 개요
                      </p>
                      <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap break-keep">
                        {app.partnerType === "brand"
                          ? app.projectPurpose || "-"
                          : app.artistNote || "-"}
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-zinc-100 bg-white p-6 md:p-7">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText size={16} />
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300">
                          업로드 자료 바로가기
                        </p>
                      </div>
                      <div className="space-y-3 text-sm font-bold">
                        {getDraftValue(app, "portfolioUrl") && (
                          <a
                            href={getDraftValue(app, "portfolioUrl")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[#004aad] hover:underline"
                          >
                            포트폴리오 보기
                          </a>
                        )}
                        {getDraftValue(app, "workListUrl") && (
                          <a
                            href={getDraftValue(app, "workListUrl")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[#004aad] hover:underline"
                          >
                            작품리스트 보기
                          </a>
                        )}
                        {getDraftValue(app, "highResPhotosUrl") && (
                          <a
                            href={getDraftValue(app, "highResPhotosUrl")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[#004aad] hover:underline"
                          >
                            대표작 원본 보기
                          </a>
                        )}
                        {!getDraftValue(app, "portfolioUrl") &&
                          !getDraftValue(app, "workListUrl") &&
                          !getDraftValue(app, "highResPhotosUrl") && (
                            <p className="text-zinc-400">등록된 자료가 없습니다.</p>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MyPage;
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
      label: "불합격",
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

  const setUploading = (appIdValue, field, value) => {
    setUploadingMap((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
        [field]: value,
      },
    }));
  };

  const setFieldError = (appIdValue, field, value) => {
    setUploadErrors((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
        [field]: value,
      },
    }));
  };

  const setResponseField = (appIdValue, key, value) => {
    setResponseMap((prev) => ({
      ...prev,
      [appIdValue]: {
        ...(prev[appIdValue] || {}),
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
            const isExpanded = expandedId === app.id;
            const appUploads = uploadingMap[app.id] || {};
            const appErrors = uploadErrors[app.id] || {};

            return (
              <div
                key={app.id}
                className="bg-white rounded-[36px] border border-zinc-100 shadow-xl overflow-hidden"
              >
                <div className="p-8 md:p-10">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                    <div className="space-y-5">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black ${meta.className}`}>
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

                      {app.status === "additional_requested" && app.requestMessage && (
                        <div className="max-w-3xl rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 mb-2">
                            추가 요청 사항
                          </p>
                          <p className="text-sm font-bold text-amber-900 leading-relaxed whitespace-pre-wrap">
                            {app.requestMessage}
                          </p>
                        </div>
                      )}

                      {app.status === "rejected" && app.rejectionReason && (
                        <div className="max-w-3xl rounded-[24px] border border-red-200 bg-red-50 px-5 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600 mb-2">
                            안내 메모
                          </p>
                          <p className="text-sm font-bold text-red-800 leading-relaxed whitespace-pre-wrap">
                            {app.rejectionReason}
                          </p>
                        </div>
                      )}
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
                  <div className="border-t border-zinc-100 bg-zinc-50 p-8 md:p-10">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-5">
                        <div className="rounded-[24px] bg-white border border-zinc-100 p-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
                            신청자 정보
                          </p>
                          <div className="space-y-2 text-sm font-bold text-zinc-700">
                            <p>이름: {app.name || app.realName || app.brandName || "-"}</p>
                            <p>이메일: {app.applicantEmail || "-"}</p>
                            <p>연락처: {app.phone || "-"}</p>
                            <p>생년/설립일: {app.birthDate || "-"}</p>
                          </div>
                        </div>

                        <div className="rounded-[24px] bg-white border border-zinc-100 p-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
                            선택 정보
                          </p>
                          <div className="space-y-2 text-sm font-bold text-zinc-700">
                            <p>일정: {app.selectedDate || "-"}</p>
                            <p>
                              프로그램:{" "}
                              {app.selectedProgram
                                ? `${app.selectedProgram.name} · ${app.selectedProgram.price}만원`
                                : "-"}
                            </p>
                            <p>파트너 유형: {app.partnerType || "-"}</p>
                          </div>
                        </div>

                        <div className="rounded-[24px] bg-white border border-zinc-100 p-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-3">
                            업로드 자료
                          </p>
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

                      <div className="space-y-5">
                        <div className="rounded-[24px] bg-white border border-zinc-100 p-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
                            프로젝트 개요
                          </p>
                          <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap">
                            {app.partnerType === "brand"
                              ? app.projectPurpose || "-"
                              : app.artistNote || "-"}
                          </p>
                        </div>

                        {app.status === "additional_requested" && (
                          <div className="rounded-[24px] border border-[#004aad]/15 bg-[#004aad]/5 p-5">
                            <div className="flex items-center gap-2 text-[#004aad] mb-3">
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
                                success={responseMap[app.id]?.highResPhotosUrl ? "새 파일 업로드 완료" : ""}
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

                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 mb-2">
                                  회신 내용
                                </p>
                                <textarea
                                  value={responseMap[app.id]?.additionalResponse || ""}
                                  onChange={(e) =>
                                    setResponseField(app.id, "additionalResponse", e.target.value)
                                  }
                                  placeholder="요청받은 자료에 대한 설명이나 보완 내용을 작성해 주세요."
                                  className="w-full h-32 rounded-[20px] border border-zinc-100 bg-white p-4 text-sm font-bold text-zinc-700 outline-none resize-none"
                                />
                              </div>

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
                                    <RefreshCcw size={14} />
                                    추가자료 재제출
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
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
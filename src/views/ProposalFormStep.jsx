import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Palette,
  ChevronLeft,
  Save,
  Upload,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import {
  doc,
  setDoc,
  serverTimestamp,
  runTransaction,
  addDoc,
  collection,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import InputBlock from "../components/ui/InputBlock";
import FileBtn from "../components/ui/FileBtn";
import { addDays } from "../utils/date";
import {
  uploadImageToImgbb,
  uploadDocumentToR2,
  validateImageFile,
  validateDocumentFile,
  sendApplicationEmails,
} from "../lib/uploads";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const EMPTY_FORM_DATA = {
  name: "",
  realName: "",
  stageName: "",
  englishName: "",
  birthDate: "",
  phone: "",
  addressMain: "",
  addressDetail: "",
  profilePhotoUrl: "",
  snsLink: "",
  portfolioUrl: "",
  exhibitionTitle: "",
  artistNote: "",
  workListUrl: "",
  highResPhotosUrl: "",
  experimentText: "",
  brandName: "",
  brandRole: "",
  projectPurpose: "",
  targetAudience: "",
  budgetRange: "",
  privacyAgreed: false,
};

const normalizePhone = (value) => value.replace(/[^\d]/g, "");

const isValidBirthDate = (value) => /^\d{8}$/.test(value);

const isValidPhone = (value) => {
  const onlyDigits = normalizePhone(value);
  return onlyDigits.length >= 10 && onlyDigits.length <= 11;
};

const validateFormData = ({ formData, partnerType, selectedProgram }) => {
  const errors = {};
  const isBrand = partnerType === "brand";

  if (!selectedProgram) errors.selectedProgram = "프로그램을 먼저 선택해 주세요.";
  if (!formData.phone || !isValidPhone(formData.phone)) {
    errors.phone = "연락처 형식을 확인해 주세요.";
  }
  if (!formData.birthDate || !isValidBirthDate(formData.birthDate)) {
    errors.birthDate = "YYYYMMDD 형식으로 입력해 주세요.";
  }
  if (!formData.addressMain?.trim()) {
    errors.addressMain = "기본 주소를 입력해 주세요.";
  }
  if (!formData.exhibitionTitle?.trim()) {
    errors.exhibitionTitle = "전시명 또는 프로젝트명을 입력해 주세요.";
  }
  if (!formData.privacyAgreed) {
    errors.privacyAgreed = "개인정보 수집 및 이용 동의가 필요합니다.";
  }

  if (isBrand) {
    if (!formData.brandName?.trim()) errors.brandName = "브랜드명 / 소속을 입력해 주세요.";
    if (!formData.name?.trim()) errors.name = "담당자 성함을 입력해 주세요.";
    if (!formData.projectPurpose?.trim()) {
      errors.projectPurpose = "공간 활용 계획 및 협업 제안서를 입력해 주세요.";
    }
  } else {
    if (!formData.realName?.trim()) errors.realName = "아티스트 본명을 입력해 주세요.";
    if (!formData.artistNote?.trim()) {
      errors.artistNote = "작가 노트 및 프로젝트 개요를 입력해 주세요.";
    }
  }

  if (!formData.profilePhotoUrl) {
    errors.profilePhotoUrl = isBrand
      ? "브랜드 로고를 업로드해 주세요."
      : "프로필 사진을 업로드해 주세요.";
  }
  if (!formData.portfolioUrl) {
    errors.portfolioUrl = "포트폴리오 파일을 업로드해 주세요.";
  }
  if (!formData.workListUrl) {
    errors.workListUrl = "작품리스트 파일을 업로드해 주세요.";
  }
  if (!formData.highResPhotosUrl) {
    errors.highResPhotosUrl = "대표작 원본 이미지를 업로드해 주세요.";
  }

  return errors;
};

const UploadStatus = ({ error, successText }) => {
  if (error) {
    return (
      <div className="mt-2 flex items-center gap-2 text-red-500 text-[11px] font-black break-keep">
        <AlertCircle size={14} />
        <span>{error}</span>
      </div>
    );
  }

  if (successText) {
    return (
      <div className="mt-2 flex items-center gap-2 text-emerald-600 text-[11px] font-black break-keep">
        <CheckCircle2 size={14} />
        <span>{successText}</span>
      </div>
    );
  }

  return null;
};

const STEP_ITEMS = [
  { key: "program", no: "01", label: "PROGRAM" },
  { key: "info", no: "02", label: "INFO" },
  { key: "upload", no: "03", label: "UPLOAD" },
  { key: "submit", no: "04", label: "SUBMIT" },
];

const ProposalFormStep = ({
  selectedDate,
  partnerType,
  selectedProgram,
  formData,
  setFormData,
  onBack,
  onSubmitSuccess,
  db,
  appId,
  user,
  handleLogin,
  setSelectedDate,
  setSelectedProgram,
  setPartnerType,
}) => {
  const [uploadingMap, setUploadingMap] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftBanner, setDraftBanner] = useState(null);
  const [activeStepKey, setActiveStepKey] = useState("info");

  const infoSectionRef = useRef(null);
  const uploadSectionRef = useRef(null);
  const submitSectionRef = useRef(null);

  const fileInputRefs = {
    profile: useRef(),
    highRes: useRef(),
    workList: useRef(),
    portfolio: useRef(),
  };

  const isBrand = partnerType === "brand";
  const isUploading = useMemo(
    () => Object.values(uploadingMap).some(Boolean),
    [uploadingMap]
  );

  const draftDocRef = user?.uid
    ? doc(db, "artifacts", appId, "users", user.uid, "drafts", "current")
    : null;

  useEffect(() => {
    const getStepByScroll = () => {
      const sections = [
        { key: "info", ref: infoSectionRef },
        { key: "upload", ref: uploadSectionRef },
        { key: "submit", ref: submitSectionRef },
      ];

      const anchorY = 170;
      let current = "info";
      let smallestDistance = Number.POSITIVE_INFINITY;

      sections.forEach(({ key, ref }) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchorY);

        if (rect.top <= anchorY + 40 && distance < smallestDistance) {
          smallestDistance = distance;
          current = key;
        }
      });

      // 맨 아래 근처면 SUBMIT 우선
      const submitEl = submitSectionRef.current;
      if (submitEl) {
        const rect = submitEl.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.72) {
          current = "submit";
        }
      }

      setActiveStepKey(current);
    };

    getStepByScroll();
    window.addEventListener("scroll", getStepByScroll, { passive: true });
    window.addEventListener("resize", getStepByScroll);

    return () => {
      window.removeEventListener("scroll", getStepByScroll);
      window.removeEventListener("resize", getStepByScroll);
    };
  }, []);

  const syncWritingPresence = async (date, uid, expiresAtMs = null) => {
    if (!date || !uid) return;

    const resDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "reservations",
      date
    );

    const snap = await getDoc(resDocRef);
    const current = snap.exists() ? snap.data() : {};
    const currentUsers = current.writingUsers || {};
    const now = Date.now();

    const prunedUsers = Object.fromEntries(
      Object.entries(currentUsers).filter(([_, value]) => Number(value) > now)
    );

    if (expiresAtMs) {
      prunedUsers[uid] = expiresAtMs;
    } else {
      delete prunedUsers[uid];
    }

    const activeCount = Object.keys(prunedUsers).length;
    const currentStatus = current.status;

    let nextStatus = currentStatus;
    if (currentStatus === "writing" || currentStatus == null) {
      nextStatus = activeCount > 0 ? "writing" : null;
    }

    await setDoc(
      resDocRef,
      {
        writingUsers: prunedUsers,
        writingCount: activeCount,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const deleteDraftCompletely = async (draftData) => {
    if (!draftDocRef || !user?.uid) return;

    try {
      const targetDate = draftData?.selectedDate || selectedDate;
      await deleteDoc(draftDocRef);
      if (targetDate) {
        await syncWritingPresence(targetDate, user.uid, null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!draftDocRef || !user || user.isAnonymous) return;

    const restoreDraft = async () => {
      try {
        const snap = await getDoc(draftDocRef);
        if (!snap.exists()) return;

        const draft = snap.data();
        const now = Date.now();
        const expiresAt = Number(draft.expiresAt || 0);

        if (!expiresAt || expiresAt <= now) {
          await deleteDraftCompletely(draft);
          return;
        }

        setFormData({ ...EMPTY_FORM_DATA, ...(draft.formData || {}) });

        if (draft.selectedDate) setSelectedDate(draft.selectedDate);
        if (draft.selectedProgram) setSelectedProgram(draft.selectedProgram);
        if (draft.partnerType) setPartnerType(draft.partnerType);

        setDraftBanner({
          type: "restored",
          expiresAt,
          selectedDate: draft.selectedDate,
          selectedProgram: draft.selectedProgram,
        });
      } catch (error) {
        console.error(error);
      }
    };

    restoreDraft();
  }, [draftDocRef, user, setFormData, setSelectedDate, setSelectedProgram, setPartnerType]);

  const setUploading = (field, value) => {
    setUploadingMap((prev) => ({ ...prev, [field]: value }));
  };

  const clearUploadError = (field) => {
    setUploadErrors((prev) => ({ ...prev, [field]: "" }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setUploadErrors((prev) => ({ ...prev, [fieldName]: error }));
      return;
    }

    clearUploadError(fieldName);
    setUploading(fieldName, true);

    try {
      const result = await uploadImageToImgbb(file);
      setFormData((prev) => ({ ...prev, [fieldName]: result.url }));
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldName]: err.message || "이미지 업로드 실패",
      }));
    } finally {
      setUploading(fieldName, false);
    }
  };

  const handleDocumentUpload = async (e, fieldName, folder) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateDocumentFile(file);
    if (error) {
      setUploadErrors((prev) => ({ ...prev, [fieldName]: error }));
      return;
    }

    clearUploadError(fieldName);
    setUploading(fieldName, true);

    try {
      const result = await uploadDocumentToR2({
        file,
        folder,
        userId: user?.uid || "anonymous",
      });

      setFormData((prev) => ({ ...prev, [fieldName]: result.url }));
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldName]: err.message || "문서 업로드 실패",
      }));
    } finally {
      setUploading(fieldName, false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftDocRef || !user?.uid) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedDate) {
      alert("일정을 먼저 선택해 주세요.");
      return;
    }

    try {
      const now = Date.now();
      const expiresAt = now + DRAFT_TTL_MS;

      await setDoc(
        draftDocRef,
        {
          status: "draft",
          formData,
          selectedDate,
          selectedProgram,
          partnerType,
          lastSavedAt: now,
          expiresAt,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await syncWritingPresence(selectedDate, user.uid, expiresAt);

      setDraftBanner({
        type: "saved",
        expiresAt,
        selectedDate,
        selectedProgram,
      });

      alert("임시저장되었습니다. 24시간 후 자동 만료됩니다.");
    } catch (error) {
      console.error(error);
      alert("임시저장 중 오류가 발생했습니다.");
    }
  };

  const handleDiscardDraft = async () => {
    const ok = window.confirm("임시저장본을 삭제하고 새로 작성하시겠습니까?");
    if (!ok) return;

    try {
      const snap = draftDocRef ? await getDoc(draftDocRef) : null;
      const draftData = snap?.exists() ? snap.data() : null;

      await deleteDraftCompletely(draftData);
      setFormData(EMPTY_FORM_DATA);
      setFieldErrors({});
      setUploadErrors({});
      setDraftBanner(null);

      alert("임시저장본이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      alert("임시저장 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (!user || user.isAnonymous) {
      alert("로그인이 필요합니다.");
      handleLogin();
      return;
    }

    const errors = validateFormData({ formData, partnerType, selectedProgram });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      alert("필수 입력값과 업로드 상태를 확인해 주세요.");
      return;
    }

    if (isUploading) {
      alert("업로드가 완료될 때까지 기다려 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "reservations",
        selectedDate
      );

      await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(resDocRef);
        const currentCount = resSnap.exists()
          ? resSnap.data().applicantCount || 0
          : 0;

        transaction.set(
          resDocRef,
          {
            status: "review",
            applicantCount: currentCount + 1,
            updatedAt: serverTimestamp(),
            partnerType,
          },
          { merge: true }
        );
      });

      const appDocRef = await addDoc(
        collection(db, "artifacts", appId, "public", "data", "applications"),
        {
          userId: user.uid,
          applicantEmail: user.email,
          status: "review",
          selectedDate,
          partnerType,
          selectedProgram,
          ...formData,
          phone: normalizePhone(formData.phone),
          submittedAt: serverTimestamp(),
        }
      );

      const applicationDetailUrl = `${window.location.origin}/?view=my-page&applicationId=${encodeURIComponent(
        appDocRef.id
      )}&app=${encodeURIComponent(appDocRef.id)}`;

      try {
        await sendApplicationEmails({
          applicantName:
            formData.name ||
            formData.realName ||
            formData.brandName ||
            formData.stageName ||
            "Applicant",
          applicantEmail: user.email,
          exhibitionTitle: formData.exhibitionTitle,
          selectedDate,
          selectedProgram,
          partnerType,
          phone: normalizePhone(formData.phone),
          brandName: formData.brandName,
          stageName: formData.stageName,
          applicationDetailUrl,
          submittedAt: new Date().toISOString(),
          applicationId: appDocRef.id,
        });
      } catch (mailError) {
        console.error("mail send failed:", mailError);
      }

      try {
        await fetch("/.netlify/functions/send-kakao-alimtalk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "application_received",
            to: normalizePhone(formData.phone),
            applicantName:
              formData.name ||
              formData.realName ||
              formData.brandName ||
              formData.stageName ||
              "Applicant",
            exhibitionTitle: formData.exhibitionTitle,
            selectedDate,
            selectedProgram,
            applicationId: appDocRef.id,
            applicationDetailUrl,
          }),
        });
      } catch (kakaoError) {
        console.error("application_received kakao failed:", kakaoError);
      }

      await deleteDraftCompletely({
        selectedDate,
      });

      onSubmitSuccess();
    } catch (e) {
      console.error(e);
      alert("제출 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="application-form-section"
      className="max-w-4xl mx-auto animate-in fade-in py-8 md:py-10 min-h-screen relative z-10 text-zinc-900 text-left px-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 md:mb-10">
        <button
          onClick={onBack}
          className="w-full sm:w-auto justify-center sm:justify-start text-zinc-400 hover:text-black flex items-center text-[11px] font-black uppercase tracking-[0.18em] gap-2 transition-all hover:-translate-x-1 rounded-2xl border border-zinc-100 bg-white px-4 py-3"
        >
          <ChevronLeft size={16} /> Calendar
        </button>

        <button
          onClick={handleSaveDraft}
          disabled={isUploading || isSubmitting}
          className="w-full sm:w-auto justify-center flex items-center gap-2 bg-zinc-50 px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white border border-zinc-100 transition-all shadow-sm shadow-zinc-100 disabled:opacity-40"
        >
          <Save size={16} /> Save Draft
        </button>
      </div>

      <div className="sticky top-3 z-30 mb-8 md:mb-10">
        <div className="rounded-[24px] border border-zinc-100 bg-white/92 backdrop-blur-md px-4 py-4 md:px-5 md:py-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {STEP_ITEMS.map((step, index) => {
              const isDone =
                step.key === "program" ||
                (step.key === "info" &&
                  (activeStepKey === "upload" || activeStepKey === "submit")) ||
                (step.key === "upload" && activeStepKey === "submit");

              const isActive = step.key === activeStepKey;

              return (
                <React.Fragment key={step.key}>
                  <div
                    className={`min-w-[88px] md:min-w-[110px] flex-1 rounded-2xl border px-3 py-3 text-center transition-all ${
                      isActive
                        ? "border-[#004aad]/20 bg-[#004aad]/8"
                        : isDone
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div
                      className={`text-[9px] font-black uppercase tracking-[0.22em] mb-1 ${
                        isActive
                          ? "text-[#004aad]"
                          : isDone
                          ? "text-emerald-600"
                          : "text-zinc-300"
                      }`}
                    >
                      {step.no}
                    </div>
                    <div
                      className={`text-[11px] md:text-xs font-black uppercase tracking-[0.16em] ${
                        isActive
                          ? "text-[#004aad]"
                          : isDone
                          ? "text-emerald-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>

                  {index !== STEP_ITEMS.length - 1 && (
                    <div className="hidden sm:block h-px flex-1 min-w-[16px] bg-zinc-200" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-8 md:mb-10 grid gap-4 md:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[24px] md:rounded-[28px] border border-[#004aad]/15 bg-[#004aad]/5 px-5 py-5 md:px-6 md:py-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004aad] mb-2">
            Estimated Time
          </p>
          <p className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
            약 3분
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-500 leading-relaxed break-keep">
            기본 정보 입력과 자료 업로드까지 포함한 평균 소요 시간입니다.
          </p>
        </div>

        <div className="rounded-[24px] md:rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 mb-3">
            Before You Start
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                Portfolio
              </p>
              <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                포트폴리오 PDF 또는 ZIP
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                Work List
              </p>
              <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                작품리스트 또는 기획 구성안
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                Image
              </p>
              <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                대표 이미지 또는 로고 원본
              </p>
            </div>
          </div>
        </div>
      </div>

      {draftBanner && (
        <div className="mb-8 bg-[#004aad]/5 border border-[#004aad]/10 rounded-[24px] md:rounded-[28px] px-5 py-5 md:px-6 md:py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 text-[#004aad] text-xs font-black uppercase tracking-[0.2em] mb-2">
              <RefreshCcw size={14} />
              {draftBanner.type === "restored"
                ? "Draft Automatically Restored"
                : "Draft Saved"}
            </div>
            <p className="text-sm font-bold text-zinc-700 break-keep leading-relaxed">
              {draftBanner.type === "restored"
                ? "이전에 저장한 작성중인 내용을 자동 복원했습니다."
                : "임시저장되었습니다. 24시간 후 자동 만료됩니다."}
            </p>
            <p className="text-xs font-black text-zinc-400 mt-2 leading-relaxed">
              {draftBanner.selectedDate}{" "}
              {draftBanner.selectedProgram
                ? `· ${draftBanner.selectedProgram.name} · ${draftBanner.selectedProgram.price}만원`
                : ""}
            </p>
          </div>

          <button
            onClick={handleDiscardDraft}
            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-red-200 text-red-500 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-red-50 transition-all"
          >
            <Trash2 size={14} />
            Draft 삭제 후 새로 작성
          </button>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 p-5 sm:p-6 md:p-12 xl:p-16 rounded-[34px] md:rounded-[48px] xl:rounded-[60px] shadow-2xl space-y-12 md:space-y-16">
        <input
          type="file"
          ref={fileInputRefs.profile}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "profilePhotoUrl")}
        />
        <input
          type="file"
          ref={fileInputRefs.highRes}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "highResPhotosUrl")}
        />
        <input
          type="file"
          ref={fileInputRefs.workList}
          className="hidden"
          accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleDocumentUpload(e, "workListUrl", "work-list")}
        />
        <input
          type="file"
          ref={fileInputRefs.portfolio}
          className="hidden"
          accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleDocumentUpload(e, "portfolioUrl", "portfolio")}
        />

        <header className="border-b border-zinc-100 pb-8 md:pb-10 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[#004aad] shrink-0">
              {isBrand ? <Building2 size={28} /> : <Palette size={28} />}
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-[#004aad] leading-none break-keep">
                {isBrand ? "브랜드 및 기획자 제안 양식" : "아티스트 전시 지원 양식"}
              </h2>
              <p className="text-zinc-400 text-[10px] sm:text-xs mt-3 font-black tracking-[0.18em] sm:tracking-widest uppercase leading-relaxed">
                일정: {selectedDate} ~ {addDays(selectedDate, 6)}
              </p>
            </div>
          </div>

          {selectedProgram && (
            <div className="mt-6 w-full sm:inline-flex sm:w-auto flex-col gap-2 bg-[#004aad]/5 border border-[#004aad]/10 rounded-2xl px-5 py-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
                Selected Program
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-900 break-keep">
                {selectedProgram.name} · {selectedProgram.price}만원
              </span>
            </div>
          )}

          {fieldErrors.selectedProgram && (
            <div className="mt-4 text-red-500 text-xs font-black">
              {fieldErrors.selectedProgram}
            </div>
          )}
        </header>

        <div ref={infoSectionRef} className="space-y-12 md:space-y-16">
          {isBrand ? (
            <div className="grid md:grid-cols-2 gap-10 md:gap-12 animate-in fade-in text-left">
              <div>
                <InputBlock
                  label="브랜드명 / 소속"
                  required
                  value={formData.brandName}
                  onChange={(e) =>
                    setFormData({ ...formData, brandName: e.target.value })
                  }
                />
                {fieldErrors.brandName && (
                  <p className="mt-3 text-red-500 text-xs font-black">{fieldErrors.brandName}</p>
                )}
              </div>

              <div>
                <InputBlock
                  label="담당자 성함"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {fieldErrors.name && (
                  <p className="mt-3 text-red-500 text-xs font-black">{fieldErrors.name}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-10 md:space-y-12 animate-in fade-in text-left">
              <div className="grid md:grid-cols-2 gap-10 md:gap-12 text-left">
                <div>
                  <InputBlock
                    label="아티스트 본명"
                    required
                    value={formData.realName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        realName: e.target.value,
                        name: e.target.value,
                      })
                    }
                  />
                  {fieldErrors.realName && (
                    <p className="mt-3 text-red-500 text-xs font-black">{fieldErrors.realName}</p>
                  )}
                </div>

                <div>
                  <InputBlock
                    label="활동명 / 예명"
                    placeholder="미입력 시 본명 사용"
                    value={formData.stageName}
                    onChange={(e) =>
                      setFormData({ ...formData, stageName: e.target.value })
                    }
                  />
                </div>
              </div>

              <InputBlock
                label="영문 이름"
                placeholder="예: Hong Gil Dong"
                value={formData.englishName}
                onChange={(e) =>
                  setFormData({ ...formData, englishName: e.target.value })
                }
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-10 md:gap-12 text-left">
            <div>
              <InputBlock
                label="연락처"
                placeholder="010-0000-0000"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {fieldErrors.phone && (
                <p className="mt-3 text-red-500 text-xs font-black">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <InputBlock
                label={isBrand ? "설립일" : "생년월일"}
                placeholder="YYYYMMDD"
                required
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
              />
              {fieldErrors.birthDate && (
                <p className="mt-3 text-red-500 text-xs font-black">{fieldErrors.birthDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-5 md:space-y-6 text-left">
            <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest">
              주소 *
            </label>
            <input
              className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left"
              placeholder="기본 주소"
              value={formData.addressMain}
              onChange={(e) =>
                setFormData({ ...formData, addressMain: e.target.value })
              }
            />
            <input
              className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left"
              placeholder="상세 주소"
              value={formData.addressDetail}
              onChange={(e) =>
                setFormData({ ...formData, addressDetail: e.target.value })
              }
            />
            {fieldErrors.addressMain && (
              <p className="text-red-500 text-xs font-black">{fieldErrors.addressMain}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-12 border-t border-gray-50 pt-12 md:pt-16 text-left">
            <div>
              <button
                onClick={() => fileInputRefs.profile.current.click()}
                className="aspect-[1/1] sm:aspect-square w-full bg-zinc-50 border border-dashed border-zinc-200 rounded-[30px] md:rounded-[42px] flex flex-col items-center justify-center gap-2 hover:bg-white transition-all overflow-hidden relative group shadow-inner"
              >
                {formData.profilePhotoUrl ? (
                  <img
                    src={formData.profilePhotoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : null}

                {uploadingMap.profilePhotoUrl ? (
                  <Loader2 className="animate-spin text-[#004aad]" />
                ) : (
                  <div className="z-10 bg-white/80 p-4 md:p-5 rounded-full shadow-xl transition-transform group-hover:scale-110">
                    <Upload size={22} className="text-[#004aad]" />
                  </div>
                )}

                <div className="z-10 text-[9px] font-black text-zinc-400 mt-2 text-center uppercase">
                  {isBrand ? "BRAND LOGO" : "PROFILE PHOTO"}
                </div>
              </button>

              <UploadStatus
                error={uploadErrors.profilePhotoUrl || fieldErrors.profilePhotoUrl}
                successText={formData.profilePhotoUrl ? "이미지 업로드 완료" : ""}
              />
            </div>

            <div className="space-y-10 md:space-y-12 text-zinc-900 text-left">
              <InputBlock
                label="SNS / Website"
                placeholder="@instagram / https://"
                value={formData.snsLink}
                onChange={(e) =>
                  setFormData({ ...formData, snsLink: e.target.value })
                }
              />

              <div>
                <InputBlock
                  label={isBrand ? "프로젝트 명" : "전시명 (가제)"}
                  required
                  value={formData.exhibitionTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, exhibitionTitle: e.target.value })
                  }
                />
                {fieldErrors.exhibitionTitle && (
                  <p className="mt-3 text-red-500 text-xs font-black">
                    {fieldErrors.exhibitionTitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 md:space-y-6 pt-8 md:pt-10 border-t border-gray-50 text-left">
            <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest leading-relaxed">
              {isBrand
                ? "공간 활용 계획 및 협업 제안서 *"
                : "작가 노트 및 프로젝트 개요 *"}
            </label>
            <textarea
              className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-10 rounded-[28px] md:rounded-[40px] h-56 md:h-80 text-base outline-none focus:bg-white shadow-sm resize-none font-bold transition-colors text-zinc-900 text-left"
              value={isBrand ? formData.projectPurpose : formData.artistNote}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [isBrand ? "projectPurpose" : "artistNote"]: e.target.value,
                })
              }
            />
            {(fieldErrors.projectPurpose || fieldErrors.artistNote) && (
              <p className="text-red-500 text-xs font-black">
                {fieldErrors.projectPurpose || fieldErrors.artistNote}
              </p>
            )}
          </div>
        </div>

        <div ref={uploadSectionRef} className="space-y-12">
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div>
              <FileBtn
                label="포트폴리오"
                hasFile={!!formData.portfolioUrl}
                onClick={() => fileInputRefs.portfolio.current.click()}
                loading={uploadingMap.portfolioUrl}
              />
              <UploadStatus
                error={uploadErrors.portfolioUrl || fieldErrors.portfolioUrl}
                successText={formData.portfolioUrl ? "문서 업로드 완료" : ""}
              />
            </div>

            <div>
              <FileBtn
                label="작품리스트"
                hasFile={!!formData.workListUrl}
                onClick={() => fileInputRefs.workList.current.click()}
                loading={uploadingMap.workListUrl}
              />
              <UploadStatus
                error={uploadErrors.workListUrl || fieldErrors.workListUrl}
                successText={formData.workListUrl ? "문서 업로드 완료" : ""}
              />
            </div>

            <div>
              <FileBtn
                label="대표작 원본"
                hasFile={!!formData.highResPhotosUrl}
                onClick={() => fileInputRefs.highRes.current.click()}
                loading={uploadingMap.highResPhotosUrl}
                isPrimary
              />
              <UploadStatus
                error={uploadErrors.highResPhotosUrl || fieldErrors.highResPhotosUrl}
                successText={formData.highResPhotosUrl ? "이미지 업로드 완료" : ""}
              />
            </div>
          </div>

          <div className="rounded-[24px] md:rounded-[28px] border border-[#004aad]/12 bg-[#004aad]/5 px-5 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004aad] mb-3">
              Upload Guide
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                  Portfolio
                </p>
                <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                  PDF, ZIP, DOC, DOCX
                </p>
                <p className="mt-2 text-xs font-bold text-zinc-400 leading-relaxed break-keep">
                  포트폴리오 전체본 또는 대표 작업 중심 자료를 권장합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                  Work List
                </p>
                <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                  PDF, ZIP, DOC, DOCX
                </p>
                <p className="mt-2 text-xs font-bold text-zinc-400 leading-relaxed break-keep">
                  작품 정보, 캡션, 구성안이 정리된 문서를 권장합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                  Image
                </p>
                <p className="text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                  JPG, PNG, WEBP
                </p>
                <p className="mt-2 text-xs font-bold text-zinc-400 leading-relaxed break-keep">
                  대표작 또는 로고는 가능한 한 고해상도 원본을 권장합니다.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs font-bold text-zinc-400 leading-relaxed break-keep">
              업로드 중에는 제출 버튼이 비활성화됩니다. 파일 업로드가 모두 끝난 뒤 제출해 주세요.
            </p>
          </div>

          <div className="rounded-[24px] md:rounded-[28px] border border-zinc-100 bg-zinc-50 px-5 py-4 text-xs font-bold text-zinc-500 leading-relaxed break-keep">
            이미지 파일은 ImgBB로 업로드되고, 포트폴리오/작품리스트 같은 문서 파일은 Cloudflare R2로 업로드됩니다.
            임시저장본은 24시간 후 자동 만료됩니다.
          </div>
        </div>

        <div ref={submitSectionRef} className="pt-10 md:pt-16 flex flex-col items-center">
          <label className="flex items-start sm:items-center gap-4 md:gap-6 cursor-pointer mb-6 group w-full">
            <input
              type="checkbox"
              checked={formData.privacyAgreed}
              onChange={(e) =>
                setFormData({ ...formData, privacyAgreed: e.target.checked })
              }
              className="mt-1 sm:mt-0 w-6 h-6 md:w-8 md:h-8 accent-[#004aad] rounded border-zinc-200 shrink-0"
            />
            <span className="text-sm md:text-lg font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase tracking-[0.12em] md:tracking-widest break-keep">
              개인정보 수집 및 이용 동의
            </span>
          </label>

          {fieldErrors.privacyAgreed && (
            <p className="mb-8 text-red-500 text-xs font-black">
              {fieldErrors.privacyAgreed}
            </p>
          )}

          <div className="w-full space-y-4">
            <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-4 text-xs font-bold text-zinc-500 leading-relaxed break-keep text-center">
              제출 후 결과 및 추가 요청은 마이페이지와 등록된 이메일, 알림을 통해 순차적으로 안내됩니다.
            </div>

            <button
              onClick={handleSubmit}
              disabled={isUploading || isSubmitting}
              className="w-full bg-zinc-900 text-white py-6 md:py-10 rounded-full font-black uppercase tracking-[0.24em] md:tracking-[0.4em] text-base md:text-2xl shadow-2xl hover:bg-[#004aad] active:scale-95 transition-all text-center shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  SUBMITTING
                </span>
              ) : (
                <span className="inline-flex items-center gap-3">
                  Submit Proposal <ArrowRight size={26} />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProposalFormStep;
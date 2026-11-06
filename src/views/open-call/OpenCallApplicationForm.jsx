import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { auth } from "../../lib/firebase";
import { callSalonFunction } from "../../lib/salonApi";
import {
  sendApplicationEmails,
  uploadDocumentToR2,
  uploadImageToR2,
  validateDocumentFile,
  validateImageFile,
} from "../../lib/uploads";
import {
  DEFAULT_OPEN_CALL_SALES_CONSENT,
  DEFAULT_OPEN_CALL_TERMS,
  OPEN_CALL_BIO_MAX_LENGTH,
  OPEN_CALL_FALLBACK,
  OPEN_CALL_MAX_WORKS,
  OPEN_CALL_MIN_WORKS,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  normalizeOpenCallFormSettings,
  normalizeOpenCallNotificationSettings,
} from "../../constants/openCall";
import {
  MISSING_FIELD,
  addUploadedImages,
  applySavedProfile,
  buildSubmission,
  createEmptyApplication,
  createEmptyWork,
  validateApplication,
} from "./openCallApplication";

const INPUT = "min-h-11 w-full rounded-sm border border-zinc-400 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";
const SECTION = "border-t-2 border-zinc-950 pt-4";
const SECTION_TITLE = "mb-4 text-lg font-bold text-zinc-950";

const draftKey = (openCallId) => `open-call-application:${openCallId}`;

const readDraft = (openCallId) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey(openCallId)) || "null");
    return saved && Array.isArray(saved.works) ? { ...createEmptyApplication(), ...saved } : null;
  } catch {
    return null;
  }
};

const writeDraft = (openCallId, data) => {
  try {
    window.localStorage.setItem(draftKey(openCallId), JSON.stringify(data));
  } catch {
    // The form still works when browser storage is blocked; only resuming is lost.
  }
};

const clearDraft = (openCallId) => {
  try {
    window.localStorage.removeItem(draftKey(openCallId));
  } catch {
    // Nothing to clear when browser storage is blocked.
  }
};

const MISSING_STYLE = "[&_input]:border-amber-500 [&_input]:bg-amber-50 [&_textarea]:border-amber-500 [&_textarea]:bg-amber-50 [&_select]:border-amber-500 [&_select]:bg-amber-50";

const FieldError = ({ message }) =>
  message && message !== MISSING_FIELD ? <p className="mt-1 text-sm text-amber-900">{message}</p> : null;

const Field = ({ label, optional, error, className = "", children }) => (
  <label data-missing={error === MISSING_FIELD || undefined} className={`block min-w-0 ${className} ${error === MISSING_FIELD ? MISSING_STYLE : ""}`}>
    <span className="mb-1 block text-sm font-semibold text-zinc-900">
      {label}
      {optional ? <span className="ml-1 font-normal text-zinc-500">선택</span> : null}
    </span>
    {children}
    <FieldError message={error} />
  </label>
);

const CustomField = ({ field, value, error, onChange }) => {
  if (field.type === "checkbox") {
    return (
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="flex min-h-11 items-center gap-2.5 text-sm text-zinc-900">
          <input type="checkbox" className="h-5 w-5 accent-[#004aad]" checked={value === true} onChange={(event) => onChange(event.target.checked)} />
          {field.label}
        </label>
        <FieldError message={error} />
      </div>
    );
  }

  const shared = { value: value || "", onChange: (event) => onChange(event.target.value) };
  return (
    <Field label={field.label} optional={!field.required} error={error} className={field.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
      {field.type === "textarea" ? (
        <textarea rows={3} maxLength={field.maxLength || undefined} placeholder={field.placeholder} className={`${INPUT} py-2 leading-relaxed`} {...shared} />
      ) : field.type === "select" ? (
        <select className={INPUT} {...shared}>
          <option value="">{field.placeholder || "선택해 주세요"}</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          type={{ url: "url", email: "email", phone: "tel" }[field.type] || "text"}
          maxLength={field.maxLength || undefined}
          placeholder={field.placeholder}
          className={INPUT}
          {...shared}
        />
      )}
    </Field>
  );
};

const OpenCallApplicationForm = ({ openCall, user, handleLogin, initialProfileData, onBack, onSubmitSuccess, previewMode = false }) => {
  const currentOpenCall = useMemo(() => createFallbackOpenCall(openCall || OPEN_CALL_FALLBACK), [openCall]);
  const customFields = useMemo(
    () =>
      normalizeOpenCallFormSettings(currentOpenCall.formSettings)
        .customFields.filter((field) => field?.enabled !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [currentOpenCall.formSettings]
  );
  const notificationSettings = normalizeOpenCallNotificationSettings(currentOpenCall.notificationSettings);
  const canSubmitOpenCall = getOpenCallDisplayStatus(currentOpenCall).canApply;
  const needsLogin = !previewMode && (!user || user.isAnonymous);

  const [form, setForm] = useState(() => {
    const base = (!previewMode && readDraft(currentOpenCall.id)) || createEmptyApplication();
    return applySavedProfile(base, initialProfileData, user?.email || "");
  });
  const [customValues, setCustomValues] = useState({});
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [salesAgreed, setSalesAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadError, setUploadError] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const summaryRef = useRef(null);

  useEffect(() => {
    if (!previewMode) writeDraft(currentOpenCall.id, form);
  }, [currentOpenCall.id, form, previewMode]);

  useEffect(() => {
    setForm((current) => applySavedProfile(current, initialProfileData, user?.email || ""));
  }, [initialProfileData, user?.email]);

  const setField = (key, value) => {
    setErrors((current) => ({ ...current, [key]: undefined }));
    setForm((current) => ({ ...current, [key]: value }));
  };
  const field = (key) => ({ value: form[key], onChange: (event) => setField(key, event.target.value) });

  const setWork = (index, key, value) => {
    setErrors((current) => ({ ...current, works: undefined, [`work-${index}-${key}`]: undefined }));
    setForm((current) => ({
      ...current,
      works: current.works.map((work, position) => (position === index ? { ...work, [key]: value } : work)),
    }));
  };
  const removeWork = (index) => {
    setErrors({});
    setForm((current) => ({ ...current, works: current.works.filter((_, position) => position !== index) }));
  };

  const uploadImages = async (files, replaceIndex = null) => {
    if (previewMode) {
      setNotice("미리보기에서는 파일을 올릴 수 없습니다.");
      return;
    }

    setUploadError("");
    const slots = replaceIndex === null ? OPEN_CALL_MAX_WORKS - form.works.filter((work) => work.imageUrl).length : 1;
    const picked = files.slice(0, slots);
    if (files.length > slots) setUploadError(`작품은 ${OPEN_CALL_MAX_WORKS}점까지 올릴 수 있어 ${slots}장만 올립니다.`);

    const invalid = picked.map(validateImageFile).find(Boolean);
    if (invalid) {
      setUploadError(invalid);
      return;
    }

    setUploadingCount((count) => count + picked.length);
    const results = await Promise.allSettled(
      picked.map((file) => uploadImageToR2({ file, folder: "open-call/works" }))
    );
    setUploadingCount((count) => count - picked.length);

    const urls = results.filter((result) => result.status === "fulfilled").map((result) => result.value.url);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) setUploadError(failed.reason?.message || "이미지를 올리지 못했습니다. 다시 시도해 주세요.");

    if (replaceIndex !== null && urls[0]) {
      setWork(replaceIndex, "imageUrl", urls[0]);
    } else if (urls.length > 0) {
      setErrors((current) => ({ ...current, works: undefined }));
      setForm((current) => ({ ...current, works: addUploadedImages(current.works, urls) }));
    }
  };

  const uploadPortfolio = async (file) => {
    if (previewMode) {
      setNotice("미리보기에서는 파일을 올릴 수 없습니다.");
      return;
    }

    const invalid = validateDocumentFile(file);
    if (invalid) {
      setErrors((current) => ({ ...current, portfolioUrl: invalid }));
      return;
    }

    setUploadingCount((count) => count + 1);
    try {
      const result = await uploadDocumentToR2({ file, folder: "open-call/portfolio" });
      setField("portfolioUrl", result.url);
    } catch (error) {
      setErrors((current) => ({ ...current, portfolioUrl: error.message || "파일을 올리지 못했습니다." }));
    } finally {
      setUploadingCount((count) => count - 1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateApplication(form, customFields, customValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Wait for the highlights to render, then take the applicant to the first one.
      requestAnimationFrame(() => {
        const first = document.querySelector("form [data-missing]");
        if (!first) {
          summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        first.scrollIntoView({ behavior: "smooth", block: "center" });
        first.querySelector("input:not([type=file]), textarea, select")?.focus({ preventScroll: true });
      });
      return;
    }
    if (previewMode) {
      setNotice("미리보기에서는 제출되지 않습니다.");
      return;
    }
    if (uploadingCount > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setNotice("");
    try {
      const { applicationId } = await callSalonFunction("submit-application", {
        ...buildSubmission(form, customFields, customValues),
        openCallId: currentOpenCall.id,
        termsAgreed,
        salesAgreed,
      });
      clearDraft(currentOpenCall.id);

      if (notificationSettings.applicantEmailEnabled || notificationSettings.adminEmailEnabled) {
        await sendApplicationEmails({ applicationId }).catch((error) => console.error("open-call mail failed:", error));
      }
      if (notificationSettings.kakaoEnabled) {
        const token = await auth.currentUser?.getIdToken();
        await fetch("/.netlify/functions/send-kakao-alimtalk", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: "application_received", applicationId }),
        }).catch((error) => console.error("open-call kakao failed:", error));
      }

      onSubmitSuccess?.({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ""),
        openCallTitle: currentOpenCall.title,
        openCallId: currentOpenCall.id,
        applicationId,
        submittedAt: new Date().toLocaleString("ko-KR"),
      });
    } catch (error) {
      console.error(error);
      setNotice(error.message || "제출하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const bothAgreed = termsAgreed && salesAgreed;
  const termsText = String(currentOpenCall.termsText || "").trim() || DEFAULT_OPEN_CALL_TERMS;
  const salesConsentText = String(currentOpenCall.salesConsentText || "").trim() || DEFAULT_OPEN_CALL_SALES_CONSENT;

  return (
    <section className="mx-auto w-full max-w-4xl break-keep px-4 py-6 text-zinc-950 md:px-6">
      {onBack ? (
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-zinc-700 hover:text-zinc-950">
          <ArrowLeft size={16} />공고로 돌아가기
        </button>
      ) : null}

      <header className="mb-6 mt-3">
        <p className="text-sm text-zinc-600">{currentOpenCall.title} 지원서</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">오픈콜 지원하기</h1>
        <p className="mt-2 text-sm text-zinc-700">작성 중인 내용은 이 기기에 자동으로 저장됩니다.</p>
      </header>

      {!previewMode && !canSubmitOpenCall ? (
        <p role="alert" className="mb-5 rounded-sm bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">지금은 접수 가능한 오픈콜이 아닙니다.</p>
      ) : null}
      {needsLogin ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-sm bg-zinc-100 px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">파일을 올리고 제출하려면 구글 로그인이 필요합니다.</p>
          <button type="button" onClick={handleLogin} className="min-h-10 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white">구글로 로그인</button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>지원자 정보</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="이름" error={errors.name}><input autoComplete="name" className={INPUT} {...field("name")} /></Field>
            <Field label="영어 이름" error={errors.englishName}><input className={INPUT} placeholder="Gil-dong Hong" {...field("englishName")} /></Field>
            <Field label="활동명" optional error={errors.stageName}><input className={INPUT} {...field("stageName")} /></Field>
            <Field label="출생연도" error={errors.birthYear}><input inputMode="numeric" maxLength={4} className={INPUT} placeholder="1994" {...field("birthYear")} /></Field>
            <Field label="휴대폰번호" error={errors.phone}><input type="tel" autoComplete="tel" className={INPUT} placeholder="010-0000-0000" {...field("phone")} /></Field>
            <Field label="이메일" error={errors.email}><input type="email" autoComplete="email" className={INPUT} {...field("email")} /></Field>
            <Field label="홈페이지 또는 SNS" error={errors.snsLink}><input className={INPUT} placeholder="https:// 또는 @아이디" {...field("snsLink")} /></Field>
            <Field label="기타 사이트" optional error={errors.otherLink}><input className={INPUT} {...field("otherLink")} /></Field>
            <div className="min-w-0" data-missing={errors.portfolioUrl === MISSING_FIELD || undefined}>
              <span className="mb-1 block text-sm font-semibold text-zinc-900">포트폴리오 파일</span>
              <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-dashed px-3 text-sm text-zinc-800 focus-within:ring-1 focus-within:ring-[#004aad] ${errors.portfolioUrl === MISSING_FIELD ? "border-amber-500 bg-amber-50" : "border-zinc-400 bg-white"}`}>
                {form.portfolioUrl ? <Check size={16} className="shrink-0 text-emerald-700" /> : <FileText size={16} className="shrink-0" />}
                <span className="truncate">{form.portfolioUrl ? "올림 완료 (누르면 교체)" : "PDF 파일 올리기"}</span>
                <input type="file" accept=".pdf,.zip,.doc,.docx" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadPortfolio(file); }} />
              </label>
              <FieldError message={errors.portfolioUrl} />
            </div>
            <Field label="짧은 작가소개" optional error={errors.artistStatement} className="sm:col-span-2 lg:col-span-3">
              <textarea rows={2} maxLength={OPEN_CALL_BIO_MAX_LENGTH} className={`${INPUT} py-2 leading-relaxed`} placeholder={`${OPEN_CALL_BIO_MAX_LENGTH}자 이내`} {...field("artistStatement")} />
            </Field>
            {customFields.map((custom) => (
              <CustomField
                key={custom.id}
                field={custom}
                value={customValues[custom.id]}
                error={errors[`custom-${custom.id}`]}
                onChange={(value) => {
                  setErrors((current) => ({ ...current, [`custom-${custom.id}`]: undefined }));
                  setCustomValues((current) => ({ ...current, [custom.id]: value }));
                }}
              />
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-950">출품작</h2>
              <p className="text-sm text-zinc-700">고화질 이미지로 {OPEN_CALL_MIN_WORKS}점 이상 {OPEN_CALL_MAX_WORKS}점까지 올려 주세요.</p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white focus-within:ring-2 focus-within:ring-[#004aad] focus-within:ring-offset-2">
              <Upload size={16} />이미지 여러 장 올리기
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; if (files.length) uploadImages(files); }} />
            </label>
          </div>
          {uploadingCount > 0 ? <p role="status" className="mb-3 flex items-center gap-2 text-sm text-zinc-700"><Loader2 size={16} className="animate-spin" />파일을 올리는 중입니다.</p> : null}
          <FieldError message={uploadError || errors.works} />

          <ul className="space-y-3">
            {form.works.map((work, index) => (
              <li key={index} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-zinc-300 pb-3 sm:grid-cols-[88px_minmax(0,1fr)]">
                <div>
                  <label data-missing={errors[`work-${index}-imageUrl`] === MISSING_FIELD || undefined} className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-dashed text-zinc-500 focus-within:ring-1 focus-within:ring-[#004aad] ${errors[`work-${index}-imageUrl`] === MISSING_FIELD ? "border-amber-500 bg-amber-50" : "border-zinc-400 bg-white"}`}>
                    {work.imageUrl ? <img src={work.imageUrl} alt={`작품 ${index + 1} 미리보기`} className="h-full w-full object-contain" /> : <Upload size={18} aria-hidden="true" />}
                    <span className="sr-only">작품 {index + 1} 이미지 {work.imageUrl ? "교체" : "올리기"}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadImages([file], index); }} />
                  </label>
                  <FieldError message={errors[`work-${index}-imageUrl`]} />
                  {form.works.length > OPEN_CALL_MIN_WORKS ? (
                    <button type="button" onClick={() => removeWork(index)} className="mt-1 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-sm text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                      <X size={16} aria-hidden="true" />삭제<span className="sr-only"> 작품 {index + 1}</span>
                    </button>
                  ) : null}
                </div>
                <div className="grid min-w-0 grid-cols-2 items-start gap-2 sm:grid-cols-4">
                  <Field label="작품명" error={errors[`work-${index}-title`]} className="col-span-2"><input className={INPUT} value={work.title || ""} onChange={(event) => setWork(index, "title", event.target.value)} /></Field>
                  <Field label="재료" error={errors[`work-${index}-material`]} className="col-span-2"><input className={INPUT} placeholder="캔버스에 유채" value={work.material || ""} onChange={(event) => setWork(index, "material", event.target.value)} /></Field>
                  <Field label="세로 (cm)" error={errors[`work-${index}-height`]}><input inputMode="decimal" className={INPUT} placeholder="60" value={work.height || ""} onChange={(event) => setWork(index, "height", event.target.value)} /></Field>
                  <Field label="가로 (cm)" error={errors[`work-${index}-width`]}><input inputMode="decimal" className={INPUT} placeholder="90" value={work.width || ""} onChange={(event) => setWork(index, "width", event.target.value)} /></Field>
                  <Field label="제작연도" error={errors[`work-${index}-year`]}><input inputMode="numeric" className={INPUT} placeholder="2026" value={work.year || ""} onChange={(event) => setWork(index, "year", event.target.value)} /></Field>
                  <Field label="작품가격" error={errors[`work-${index}-price`]}><input className={INPUT} placeholder="1,200,000원" value={work.price || ""} onChange={(event) => setWork(index, "price", event.target.value)} /></Field>
                </div>
              </li>
            ))}
          </ul>
          {form.works.length < OPEN_CALL_MAX_WORKS ? (
            <button type="button" onClick={() => setForm((current) => ({ ...current, works: [...current.works, createEmptyWork()] }))} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-zinc-400 bg-white px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
              <Plus size={16} />작품 한 줄 추가
            </button>
          ) : null}
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>동의</h2>
          <div className="space-y-1">
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-zinc-900">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#004aad]" checked={termsAgreed} onChange={(event) => setTermsAgreed(event.target.checked)} />
              이 오픈콜의 약관(개인정보 수집·이용 포함)에 동의합니다.
            </label>
            <details className="ml-7 text-sm">
              <summary className="min-h-7 cursor-pointer font-semibold text-[#004aad]">약관 전문 보기</summary>
              <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line rounded-sm bg-white p-3 leading-relaxed text-zinc-800">{termsText}</p>
            </details>
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-zinc-900">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#004aad]" checked={salesAgreed} onChange={(event) => setSalesAgreed(event.target.checked)} />
              {salesConsentText}
            </label>
          </div>

          <div ref={summaryRef} className="mt-4">
            {errorCount > 0 ? (
              <p role="status" className="mb-3 text-sm text-zinc-800">표시된 칸 {errorCount}곳을 확인해 주세요.</p>
            ) : null}
            {notice ? <p role="status" className="mb-3 text-sm font-medium text-zinc-900">{notice}</p> : null}
            {bothAgreed ? (
              <button type="submit" disabled={isSubmitting || uploadingCount > 0 || needsLogin || (!previewMode && !canSubmitOpenCall)} className="min-h-14 w-full rounded-sm bg-[#004aad] text-base font-bold text-white hover:bg-[#003c8d] disabled:opacity-50">
                {isSubmitting ? "제출하는 중…" : uploadingCount > 0 ? "파일을 올리는 중…" : "지원서 제출하기"}
              </button>
            ) : (
              <p className="rounded-sm bg-zinc-100 px-4 py-4 text-center text-sm text-zinc-700">위 두 항목에 모두 동의하면 제출 버튼이 나타납니다.</p>
            )}
          </div>
        </section>
      </form>
    </section>
  );
};

export default OpenCallApplicationForm;

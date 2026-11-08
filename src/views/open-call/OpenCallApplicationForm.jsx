import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useFileUrls } from "../../lib/privateFiles";
import { callSalonFunction } from "../../lib/salonApi";
import {
  DOCUMENT_MAX_SIZE,
  IMAGE_MAX_SIZE,
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
  applySavedProfile,
  buildSubmission,
  completeWorkUpload,
  createEmptyApplication,
  createEmptyWork,
  formatKRW,
  formatPriceInput,
  reserveWorkRows,
  stripUploadState,
  validateApplication,
} from "./openCallApplication";

const INPUT = "min-h-11 w-full rounded-sm border border-zinc-400 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";
const DONE_PAUSE_MS = 600;
const toMegabytes = (bytes) => `${bytes / (1024 * 1024)}MB`;
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
    window.localStorage.setItem(draftKey(openCallId), JSON.stringify(stripUploadState(data)));
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

const Field = ({ label, optional, error, aside, className = "", children }) => (
  <label data-missing={error === MISSING_FIELD || undefined} className={`block min-w-0 ${className} ${error === MISSING_FIELD ? MISSING_STYLE : ""}`}>
    <span className="mb-1 flex items-baseline justify-between gap-2 text-sm font-semibold text-zinc-900">
      <span className="shrink-0">
        {label}
        {optional ? <span className="ml-1 font-normal text-zinc-500">선택</span> : null}
      </span>
      {aside ? <span className="min-w-0 truncate text-xs font-normal tabular-nums text-zinc-500" title={aside}>{aside}</span> : null}
    </span>
    {children}
    <FieldError message={error} />
  </label>
);

const UploadStatus = ({ upload, onRetry, className = "" }) => {
  if (!upload) return null;

  if (upload.status === "error") {
    return (
      <div role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}>
        <p className="min-w-0 font-medium text-red-700">{upload.message}</p>
        <button type="button" onClick={onRetry} className="min-h-10 rounded-sm border border-zinc-400 bg-white px-3 font-semibold text-zinc-900 hover:bg-zinc-100">다시 올리기</button>
      </div>
    );
  }

  if (upload.status === "done") {
    return (
      <p className={`flex min-w-0 items-center gap-1.5 text-sm text-zinc-700 ${className}`}>
        <Check size={16} className="shrink-0 text-emerald-700" aria-hidden="true" />
        <span className="shrink-0 font-medium">올라감</span>
        <span className="truncate text-zinc-500">{upload.name}</span>
      </p>
    );
  }

  return (
    <div className={`min-w-0 text-sm ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-zinc-700">{upload.name}</span>
        <span className="shrink-0 font-medium tabular-nums text-zinc-900">{upload.progress}%</span>
      </div>
      <div role="progressbar" aria-label={`${upload.name} 올리는 중`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={upload.progress} className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-[#004aad] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${upload.progress}%` }} />
      </div>
    </div>
  );
};

const SUBMIT_STAGES = { sending: "지원서를 보내는 중", done: "접수 완료" };

const SubmitOverlay = ({ title, stage }) => {
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  return (
    <div ref={rootRef} tabIndex={-1} role="status" aria-live="polite" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fdfbf7]/90 px-6 text-center outline-none">
      <p className="text-sm text-zinc-700">{title}</p>
      <div className="mt-5 flex h-8 items-center justify-center">
        {stage === "done"
          ? <Check size={28} className="text-emerald-700" aria-hidden="true" />
          : <Loader2 size={28} className="animate-spin text-[#004aad] motion-reduce:animate-none" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-xl font-bold text-zinc-950">{SUBMIT_STAGES[stage]}</p>
      <p className="mt-2 text-sm text-zinc-700">창을 닫지 말고 잠시만 기다려 주세요.</p>
    </div>
  );
};

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
  const [uploads, setUploads] = useState({});
  // Uploaded works are private references; this turns them into short-lived preview links.
  const fileUrl = useFileUrls(form.works.map((work) => work.imageUrl));
  const [batchIds, setBatchIds] = useState([]);
  const [submitStage, setSubmitStage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const summaryRef = useRef(null);
  const controllersRef = useRef({});

  const isSubmitting = Boolean(submitStage);
  const uploadList = Object.values(uploads);
  const uploadingCount = uploadList.filter((upload) => upload.status === "uploading").length;
  const batch = batchIds.map((id) => uploads[id]).filter(Boolean);
  const batchDone = batch.filter((upload) => upload.status === "done").length;
  const isBusy = uploadingCount > 0 || isSubmitting;

  useEffect(() => {
    if (!isBusy) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isBusy]);

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => Object.values(controllers).forEach((controller) => controller.abort());
  }, []);

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
    const { uploadId } = form.works[index];
    if (uploadId) {
      controllersRef.current[uploadId]?.abort();
      setUploads((current) => {
        const { [uploadId]: _removed, ...rest } = current;
        return rest;
      });
      setBatchIds((current) => current.filter((id) => id !== uploadId));
    }
    setErrors({});
    setForm((current) => ({ ...current, works: current.works.filter((_, position) => position !== index) }));
  };

  const patchUpload = (id, patch) =>
    setUploads((current) => (current[id] ? { ...current, [id]: { ...current[id], ...patch } } : current));

  const runUpload = async ({ id, kind, file }) => {
    controllersRef.current[id]?.abort();
    const controller = new AbortController();
    controllersRef.current[id] = controller;
    setUploads((current) => ({ ...current, [id]: { id, kind, file, name: file.name, progress: 0, status: "uploading", message: "" } }));

    const options = { file, signal: controller.signal, onProgress: (progress) => patchUpload(id, { progress }) };
    try {
      const { url } = kind === "portfolio"
        ? await uploadDocumentToR2({ ...options, folder: "open-call/portfolio" })
        : await uploadImageToR2({ ...options, folder: "open-call/works" });

      if (kind === "portfolio") {
        setField("portfolioUrl", url);
      } else {
        setForm((current) => ({ ...current, works: completeWorkUpload(current.works, id, url) }));
        setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.endsWith("-imageUrl"))));
      }
      patchUpload(id, { status: "done", progress: 100 });
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      patchUpload(id, { status: "error", message: error.message || "파일을 올리지 못했습니다. 인터넷 연결을 확인하고 다시 올려 주세요." });
    } finally {
      if (controllersRef.current[id] === controller) delete controllersRef.current[id];
    }
  };

  const uploadImages = (files, replaceIndex = null) => {
    if (previewMode) {
      setNotice("미리보기에서는 파일을 올릴 수 없습니다.");
      return;
    }

    const invalid = files.map((file) => [file, validateImageFile(file)]).filter(([, message]) => message);
    const valid = files.filter((file) => !validateImageFile(file));
    const messages = invalid.map(([file, message]) => `${file.name}: ${message}`);
    const picks = valid.map((file) => ({ id: crypto.randomUUID(), file }));

    let reserved = picks;
    if (replaceIndex === null) {
      const { works, reservedIds } = reserveWorkRows(form.works, picks.map((pick) => pick.id));
      reserved = picks.filter((pick) => reservedIds.includes(pick.id));
      if (reserved.length < picks.length) messages.push(`작품은 ${OPEN_CALL_MAX_WORKS}점까지 올릴 수 있어 ${reserved.length}장만 올립니다.`);
      setForm((current) => ({ ...current, works }));
    } else if (picks[0]) {
      setWork(replaceIndex, "uploadId", picks[0].id);
    }

    setUploadError(messages.join(" "));
    setBatchIds((current) => {
      const stillRunning = current.filter((id) => uploads[id]?.status === "uploading");
      return [...stillRunning, ...reserved.map((pick) => pick.id)];
    });
    reserved.forEach(({ id, file }) => runUpload({ id, kind: "work", file }));
  };

  const uploadPortfolio = (file) => {
    if (previewMode) {
      setNotice("미리보기에서는 파일을 올릴 수 없습니다.");
      return;
    }

    const invalid = validateDocumentFile(file);
    if (invalid) {
      setErrors((current) => ({ ...current, portfolioUrl: invalid }));
      return;
    }
    setErrors((current) => ({ ...current, portfolioUrl: undefined }));
    runUpload({ id: "portfolio", kind: "portfolio", file });
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
    if (isBusy) return;

    setSubmitStage("sending");
    setNotice("");
    setSubmitError("");
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

      setSubmitStage("done");
      await new Promise((resolve) => setTimeout(resolve, DONE_PAUSE_MS));
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
      setSubmitStage("");
      setSubmitError(error.message || "제출하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const bothAgreed = termsAgreed && salesAgreed;
  const termsText = String(currentOpenCall.termsText || "").trim() || DEFAULT_OPEN_CALL_TERMS;
  const salesConsentText = String(currentOpenCall.salesConsentText || "").trim() || DEFAULT_OPEN_CALL_SALES_CONSENT;

  return (
    <section className="mx-auto w-full max-w-4xl break-keep px-4 py-6 text-zinc-950 md:px-6">
      {isSubmitting ? <SubmitOverlay title={currentOpenCall.title} stage={submitStage} /> : null}
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

      <form onSubmit={handleSubmit} noValidate inert={isSubmitting} className="space-y-7">
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
              <UploadStatus upload={uploads.portfolio} onRetry={() => runUpload(uploads.portfolio)} className="mt-1.5" />
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
              <p className="text-sm text-zinc-700">고화질 이미지로 {OPEN_CALL_MIN_WORKS}점 이상 {OPEN_CALL_MAX_WORKS}점까지 올려 주세요. 이미지는 1장당 {toMegabytes(IMAGE_MAX_SIZE)}, 포트폴리오는 {toMegabytes(DOCUMENT_MAX_SIZE)}까지 올릴 수 있습니다.</p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white focus-within:ring-2 focus-within:ring-[#004aad] focus-within:ring-offset-2">
              <Upload size={16} />이미지 여러 장 올리기
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; if (files.length) uploadImages(files); }} />
            </label>
          </div>
          {uploadingCount > 0 && batch.length > 1 ? <p role="status" className="mb-3 text-sm font-medium tabular-nums text-zinc-900">{batchDone} / {batch.length}장 올림</p> : null}
          <FieldError message={uploadError} />

          <ul className="space-y-3">
            {form.works.map((work, index) => (
              <li key={index} className="grid grid-cols-1 gap-3 border-b border-zinc-300 pb-3 sm:grid-cols-[88px_minmax(0,1fr)]">
                <div className="flex items-start gap-3 sm:block">
                  <label data-missing={errors[`work-${index}-imageUrl`] === MISSING_FIELD || undefined} className={`relative flex aspect-square w-[88px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-dashed text-zinc-500 focus-within:ring-1 focus-within:ring-[#004aad] ${errors[`work-${index}-imageUrl`] === MISSING_FIELD ? "border-amber-500 bg-amber-50" : "border-zinc-400 bg-white"}`}>
                    {work.imageUrl && fileUrl(work.imageUrl) ? <img src={fileUrl(work.imageUrl)} alt={`작품 ${index + 1} 미리보기`} className="h-full w-full object-contain" /> : work.imageUrl ? <Check size={18} className="text-emerald-700" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
                    <span className="sr-only">작품 {index + 1} 이미지 {work.imageUrl ? "교체" : "올리기"}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadImages([file], index); }} />
                  </label>
                  <FieldError message={errors[`work-${index}-imageUrl`]} />
                  {form.works.length > OPEN_CALL_MIN_WORKS ? (
                    <button type="button" onClick={() => removeWork(index)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-sm px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 sm:mt-1 sm:w-full">
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
                  <Field label="작품가격" aside={formatKRW(work.price)} error={errors[`work-${index}-price`]}><input inputMode="numeric" className={INPUT} placeholder="1,200,000원" value={work.price || ""} onChange={(event) => setWork(index, "price", formatPriceInput(event.target.value))} /></Field>
                  <UploadStatus upload={uploads[work.uploadId]} onRetry={() => runUpload(uploads[work.uploadId])} className="col-span-2 sm:col-span-4" />
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
            {submitError ? <p role="alert" className="mb-3 text-sm font-medium text-red-700">{submitError}</p> : null}
            {bothAgreed ? (
              <button type="submit" disabled={isSubmitting || uploadingCount > 0 || needsLogin || (!previewMode && !canSubmitOpenCall)} className="min-h-14 w-full rounded-sm bg-[#004aad] text-base font-bold text-white hover:bg-[#003c8d] disabled:opacity-50">
                지원서 제출하기
              </button>
            ) : (
              <p className="rounded-sm bg-zinc-100 px-4 py-4 text-center text-sm text-zinc-700">위 두 항목에 모두 동의하면 제출 버튼이 나타납니다.</p>
            )}
            {uploadingCount > 0 ? <p role="status" className="mt-2 text-center text-sm text-zinc-700">파일을 올리는 중입니다</p> : null}
          </div>
        </section>
      </form>
    </section>
  );
};

export default OpenCallApplicationForm;

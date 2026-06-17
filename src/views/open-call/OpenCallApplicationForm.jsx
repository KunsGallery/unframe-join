import React, { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  Sparkles,
  Upload,
  User2,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import InputBlock from "../../components/ui/InputBlock";
import {
  sendApplicationEmails,
  uploadDocumentToR2,
  uploadImageToImgbb,
  validateDocumentFile,
  validateImageFile,
} from "../../lib/uploads";
import {
  OPEN_CALL_FALLBACK,
  OPEN_CALL_ID,
  OPEN_CALL_CUSTOM_FIELD_TYPES,
  OPEN_CALL_SUBTITLE,
  OPEN_CALL_TITLE,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  normalizeOpenCallFormSettings,
  normalizeOpenCallNotificationSettings,
  renderOpenCallTemplate,
} from "../../constants/openCall";
import { OPEN_CALL_PRIVACY_TEXT } from "../../constants/openCallPrivacy";

const EMPTY_WORK = {
  imageUrl: "",
  title: "",
  material: "",
  size: "",
  year: "",
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  birthYear: "",
  addressMain: "",
  addressDetail: "",
  medium: "",
  snsLink: "",
  artistStatement: "",
  portfolioUrl: "",
  privacyAgreed: false,
  works: [EMPTY_WORK, EMPTY_WORK, EMPTY_WORK].map((item) => ({ ...item })),
};

const normalizePhone = (value) => String(value || "").replace(/[^\d]/g, "");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const isBirthYear = (value) => /^\d{4}$/.test(String(value || "").trim());

const trimValue = (value) => String(value || "").trim();

const isSectionEnabled = (section) => section?.enabled !== false;
const isFieldEnabled = (field) => field?.enabled !== false;
const isFieldRequired = (field) => field?.required !== false;

const getCustomFieldInputType = (fieldType) =>
  OPEN_CALL_CUSTOM_FIELD_TYPES.includes(fieldType) ? fieldType : "text";

const getCustomFieldValue = (field, values) => {
  if (field?.type === "checkbox") {
    return values?.[field.id] === true;
  }

  return trimValue(values?.[field.id]);
};

const getCustomFieldErrorMessage = (field) => {
  const label = field?.label?.trim() || "추가 입력 항목";
  return field?.type === "checkbox"
    ? `'${label}' 항목을 확인해 주세요.`
    : `'${label}' 항목을 입력해 주세요.`;
};

const normalizeCustomFieldAnswer = (field, value) => {
  if (field?.type === "checkbox") {
    return value === true;
  }

  return trimValue(value);
};

const getRequiredChecks = (data, works, formSettings, customFieldValues, customFields) => {
  const sections = formSettings?.sections || {};
  const fields = formSettings?.fields || {};
  const worksSectionEnabled = isSectionEnabled(sections.works);
  const requiredChecks = [
    data.name.trim(),
    data.phone.trim(),
    data.email.trim(),
  ];

  if (isFieldEnabled(fields.birthYear) && isFieldRequired(fields.birthYear)) {
    requiredChecks.push(data.birthYear.trim());
  }

  if (isFieldEnabled(fields.address) && isFieldRequired(fields.address)) {
    requiredChecks.push(data.addressMain.trim());
  }

  if (isFieldEnabled(fields.medium) && isFieldRequired(fields.medium)) {
    requiredChecks.push(data.medium.trim());
  }

  if (isFieldEnabled(fields.snsLink) && isFieldRequired(fields.snsLink)) {
    requiredChecks.push(data.snsLink.trim());
  }

  const requiredWorkCount = worksSectionEnabled
    ? Math.min(works.length, Math.max(0, Number(sections.works?.requiredCount || 0)))
    : 0;

  for (let index = 0; index < requiredWorkCount; index += 1) {
    const work = works[index] || {};
    requiredChecks.push(
      work.imageUrl.trim(),
      work.title.trim(),
      work.material.trim(),
      work.size.trim(),
      work.year.trim()
    );
  }

  if (isSectionEnabled(sections.statement)) {
    requiredChecks.push(data.artistStatement.trim());
  }

  if (isSectionEnabled(sections.portfolio) && sections.portfolio?.required !== false) {
    requiredChecks.push(data.portfolioUrl.trim());
  }

  if (isSectionEnabled(sections.privacy) && sections.privacy?.required !== false) {
    requiredChecks.push(data.privacyAgreed);
  }

  (Array.isArray(customFields) ? customFields : []).forEach((field) => {
    if (field?.enabled === false || !field?.required) return;
    requiredChecks.push(getCustomFieldValue(field, customFieldValues));
  });

  return requiredChecks;
};

const getWorkLabel = (index) => `대표 작품 ${index + 1}`;

const normalizeWork = (work) => ({
  imageUrl: trimValue(work.imageUrl),
  title: trimValue(work.title),
  material: trimValue(work.material),
  size: trimValue(work.size),
  year: trimValue(work.year),
});

const getInitialEmail = (user) => user?.email || "";

const FieldError = ({ message }) => {
  if (!message) return null;

  return (
    <p className="mt-2 text-[11px] sm:text-xs font-black text-red-500 leading-relaxed break-keep">
      {message}
    </p>
  );
};

const OpenCallApplicationForm = ({
  openCall,
  db,
  appId,
  user,
  handleLogin,
  initialProfileData,
  onBack,
  onSubmitSuccess,
}) => {
  const [formData, setFormData] = useState(() => ({
    ...EMPTY_FORM,
    email: getInitialEmail(user),
  }));
  const [uploadingMap, setUploadingMap] = useState({});
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [profileLoadedBanner, setProfileLoadedBanner] = useState(false);

  const currentOpenCall = useMemo(
    () => createFallbackOpenCall(openCall || OPEN_CALL_FALLBACK),
    [openCall]
  );
  const formSettings = useMemo(
    () => normalizeOpenCallFormSettings(currentOpenCall.formSettings),
    [currentOpenCall.formSettings]
  );
  const notificationSettings = useMemo(
    () =>
      normalizeOpenCallNotificationSettings(
        currentOpenCall.notificationSettings
      ),
    [currentOpenCall.notificationSettings]
  );
  const openCallStatus = useMemo(
    () => getOpenCallDisplayStatus(currentOpenCall),
    [currentOpenCall]
  );
  const canSubmitOpenCall = openCallStatus.canApply;

  const workImageRefs = [useRef(null), useRef(null), useRef(null)];
  const portfolioRef = useRef(null);

  const hasUsableProfile = useMemo(() => {
    if (!initialProfileData) return false;
    return Boolean(
      initialProfileData.realName ||
        initialProfileData.stageName ||
        initialProfileData.englishName ||
        initialProfileData.brandName ||
        initialProfileData.phone ||
        initialProfileData.addressMain ||
        initialProfileData.addressDetail ||
        initialProfileData.snsLink
    );
  }, [initialProfileData]);

  const customFields = useMemo(
    () =>
      (Array.isArray(formSettings.customFields) ? formSettings.customFields : [])
        .filter((field) => field?.enabled !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [formSettings.customFields]
  );

  const [customFieldValues, setCustomFieldValues] = useState({});

  const progress = useMemo(() => {
    const works = formData.works.map(normalizeWork);
    const requiredChecks = getRequiredChecks(
      formData,
      works,
      formSettings,
      customFieldValues,
      customFields
    );
    const done = requiredChecks.filter(Boolean).length;
    const total = requiredChecks.length;
    return {
      done,
      total,
      percent: total === 0 ? 100 : Math.round((done / total) * 100),
    };
  }, [customFieldValues, customFields, formData, formSettings]);

  const worksSectionEnabled = isSectionEnabled(formSettings.sections.works);
  const requiredWorkCount = worksSectionEnabled
    ? Math.min(
        formData.works.length,
        Math.max(0, Number(formSettings.sections.works?.requiredCount || 0))
      )
    : 0;
  const visibleWorkCount = worksSectionEnabled
    ? Math.min(
        formData.works.length,
        Math.max(0, Number(formSettings.sections.works?.maxCount || 0))
      )
    : 0;
  const visibleWorks = formData.works.slice(0, visibleWorkCount);
  const showBirthYearField = isFieldEnabled(formSettings.fields.birthYear);
  const showAddressField = isFieldEnabled(formSettings.fields.address);
  const showMediumField = isFieldEnabled(formSettings.fields.medium);
  const showSnsField = isFieldEnabled(formSettings.fields.snsLink);
  const showStatementSection = isSectionEnabled(formSettings.sections.statement);
  const statementMaxLength = Math.max(0, Number(formSettings.sections.statement?.maxLength || 0));
  const showPortfolioSection = isSectionEnabled(formSettings.sections.portfolio);
  const showPrivacySection = isSectionEnabled(formSettings.sections.privacy);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = (key, value) => {
    clearFieldError(key);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const setCustomFieldValue = (field, value) => {
    clearFieldError(field.id);
    setCustomFieldValues((prev) => ({
      ...prev,
      [field.id]: value,
    }));
  };

  const setWorkField = (index, key, value) => {
    const errorKeys = {
      title: `work${index + 1}Title`,
      material: `work${index + 1}Material`,
      size: `work${index + 1}Size`,
      year: `work${index + 1}Year`,
      imageUrl: `work${index + 1}Image`,
    };
    clearFieldError(errorKeys[key]);

    setFormData((prev) => {
      const nextWorks = prev.works.map((work, workIndex) =>
        workIndex === index ? { ...work, [key]: value } : work
      );
      return { ...prev, works: nextWorks };
    });
  };

  const setUploading = (key, value) => {
    setUploadingMap((prev) => ({ ...prev, [key]: value }));
  };

  const clearUploadError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const getValidationErrors = (data, works, settings, customFieldValuesToValidate, customFieldsToValidate) => {
    const nextErrors = {};
    const sections = settings?.sections || {};
    const fields = settings?.fields || {};
    const requiredWorkCount = isSectionEnabled(sections.works)
      ? Math.min(works.length, Math.max(0, Number(sections.works?.requiredCount || 0)))
      : 0;

    if (!data.name?.trim()) nextErrors.name = "이름을 입력해 주세요.";
    if (!data.phone?.trim()) nextErrors.phone = "연락처를 입력해 주세요.";
    if (data.phone?.trim() && normalizePhone(data.phone).length < 10) {
      nextErrors.phone = "연락처는 숫자 10~11자리로 입력해 주세요.";
    }
    if (!data.email?.trim()) nextErrors.email = "이메일을 입력해 주세요.";
    if (data.email?.trim() && !isEmail(data.email)) {
      nextErrors.email = "이메일 형식을 확인해 주세요.";
    }

    if (isFieldEnabled(fields.birthYear) && isFieldRequired(fields.birthYear)) {
      if (!data.birthYear?.trim()) {
        nextErrors.birthYear = "출생연도를 입력해 주세요.";
      } else if (!isBirthYear(data.birthYear)) {
        nextErrors.birthYear = "출생연도는 4자리 숫자로 입력해 주세요.";
      }
    }

    if (isFieldEnabled(fields.address) && isFieldRequired(fields.address)) {
      if (!data.addressMain?.trim()) nextErrors.addressMain = "주소를 입력해 주세요.";
    }

    if (isFieldEnabled(fields.medium) && isFieldRequired(fields.medium)) {
      if (!data.medium?.trim()) nextErrors.medium = "매체를 입력해 주세요.";
    }

    if (isFieldEnabled(fields.snsLink) && isFieldRequired(fields.snsLink)) {
      if (!data.snsLink?.trim()) nextErrors.snsLink = "SNS / 웹사이트 링크를 입력해 주세요.";
    }

    for (let index = 0; index < requiredWorkCount; index += 1) {
      const work = works[index] || {};
      const workLabel = `대표 작품 ${index + 1}`;
      if (!work.imageUrl?.trim()) nextErrors[`work${index + 1}Image`] = `${workLabel} 이미지를 업로드해 주세요.`;
      if (!work.title?.trim()) nextErrors[`work${index + 1}Title`] = `${workLabel} 제목을 입력해 주세요.`;
      if (!work.material?.trim()) nextErrors[`work${index + 1}Material`] = `${workLabel} 재료를 입력해 주세요.`;
      if (!work.size?.trim()) nextErrors[`work${index + 1}Size`] = `${workLabel} 크기를 입력해 주세요.`;
      if (!work.year?.trim()) nextErrors[`work${index + 1}Year`] = `${workLabel} 제작연도를 입력해 주세요.`;
    }

    if (isSectionEnabled(sections.statement)) {
      const maxLength = Math.max(0, Number(sections.statement?.maxLength || 0));
      if (!data.artistStatement?.trim()) {
        nextErrors.artistStatement = "작업 소개를 입력해 주세요.";
      } else if (maxLength > 0 && (data.artistStatement || "").trim().length > maxLength) {
        nextErrors.artistStatement = `작업 소개는 ${maxLength}자 이내로 입력해 주세요.`;
      }
    }

    if (isSectionEnabled(sections.portfolio) && sections.portfolio?.required !== false) {
      if (!data.portfolioUrl?.trim()) nextErrors.portfolioUrl = "포트폴리오 PDF를 업로드해 주세요.";
    }

    if (isSectionEnabled(sections.privacy) && sections.privacy?.required !== false) {
      if (!data.privacyAgreed) nextErrors.privacyAgreed = "개인정보 수집 및 이용에 동의해 주세요.";
    }

    (Array.isArray(customFieldsToValidate) ? customFieldsToValidate : []).forEach((field) => {
      if (field?.enabled === false || !field?.required) return;

      const fieldValue = getCustomFieldValue(field, customFieldValuesToValidate);
      const isMissing =
        field.type === "checkbox"
          ? fieldValue !== true
          : !String(fieldValue || "").trim();

      if (isMissing) {
        nextErrors[field.id] = getCustomFieldErrorMessage(field);
      }
    });

    return nextErrors;
  };
  const handleUseSavedProfile = () => {
    if (!hasUsableProfile) {
      alert("저장된 기본정보가 없습니다.");
      return;
    }

    const hasExistingInput =
      formData.name ||
      formData.phone ||
      formData.email ||
      formData.birthYear ||
      formData.addressMain ||
      formData.addressDetail ||
      formData.medium ||
      formData.snsLink;

    if (hasExistingInput) {
      const ok = window.confirm("현재 입력된 기본정보를 저장된 정보로 교체할까요?");
      if (!ok) return;
    }

    setFormData((prev) => ({
      ...prev,
      name: initialProfileData.realName || initialProfileData.stageName || prev.name,
      phone: initialProfileData.phone || prev.phone,
      email: user?.email || prev.email,
      addressMain: initialProfileData.addressMain || prev.addressMain,
      addressDetail: initialProfileData.addressDetail || prev.addressDetail,
      snsLink: initialProfileData.snsLink || prev.snsLink,
    }));

    setProfileLoadedBanner(true);
  };

  const handleImageUpload = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, [`work-${index}-image`]: error }));
      return;
    }

    const key = `work-${index}-image`;
    clearUploadError(key);
    setUploading(key, true);

    try {
      const result = await uploadImageToImgbb(file);
      const uploadedUrl = result?.url || result?.publicUrl || "";
      console.log("WORK_IMAGE_UPLOADED", { index, url: uploadedUrl, result });
      clearFieldError(`work${index + 1}Image`);
      setWorkField(index, "imageUrl", uploadedUrl);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [key]: err.message || "이미지 업로드 실패",
      }));
    } finally {
      setUploading(key, false);
      event.target.value = "";
    }
  };

  const handlePortfolioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateDocumentFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, portfolioUrl: error }));
      return;
    }

    clearUploadError("portfolioUrl");
    setUploading("portfolioUrl", true);

    try {
      const result = await uploadDocumentToR2({
        file,
        folder: "open-call/portfolio",
        userId: user?.uid || "anonymous",
      });

      const uploadedUrl = result?.url || result?.publicUrl || "";
      console.log("PORTFOLIO_UPLOADED", result);
      clearFieldError("portfolioUrl");
      setField("portfolioUrl", uploadedUrl);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        portfolioUrl: err.message || "포트폴리오 업로드 실패",
      }));
    } finally {
      setUploading("portfolioUrl", false);
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!canSubmitOpenCall) {
      alert("현재 접수 가능한 오픈콜이 아닙니다.");
      return;
    }

    const works = formData.works.map(normalizeWork);
    const nextErrors = getValidationErrors(
      formData,
      works,
      formSettings,
      customFieldValues,
      customFields
    );
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      console.log("OPEN_CALL_VALIDATION_ERRORS", nextErrors);
      console.log("OPEN_CALL_FORM_DATA", formData);
      console.log("OPEN_CALL_WORKS", works);
      alert("필수항목을 확인해 주세요. 화면에 표시된 항목을 확인해 주세요.");
      setTimeout(() => {
        document.getElementById("open-call-error-summary")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
      return;
    }

    const anyUploading = Object.values(uploadingMap).some(Boolean);
    if (anyUploading || isSubmitting) {
      alert("업로드가 완료될 때까지 기다려 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const customFieldAnswers = customFields.reduce((acc, field) => {
        acc[field.id] = {
          label: field.label || field.id,
          type: field.type || "text",
          value: normalizeCustomFieldAnswer(field, customFieldValues[field.id]),
        };
        return acc;
      }, {});

      const appDocRef = await addDoc(
        collection(db, "artifacts", appId, "public", "data", "applications"),
        {
          trackType: "open-call",
          openCallId: currentOpenCall.id || OPEN_CALL_ID,
          openCallTitle: currentOpenCall.title || OPEN_CALL_TITLE,
          status: "review",
          userId: user.uid,
          applicantEmail: trimValue(formData.email) || user.email || "",
          name: trimValue(formData.name),
          phone: normalizePhone(formData.phone),
          email: trimValue(formData.email),
          birthYear: isFieldEnabled(formSettings.fields.birthYear)
            ? trimValue(formData.birthYear)
            : "",
          addressMain: isFieldEnabled(formSettings.fields.address)
            ? trimValue(formData.addressMain)
            : "",
          addressDetail: isFieldEnabled(formSettings.fields.address)
            ? trimValue(formData.addressDetail)
            : "",
          medium: isFieldEnabled(formSettings.fields.medium)
            ? trimValue(formData.medium)
            : "",
          snsLink: isFieldEnabled(formSettings.fields.snsLink)
            ? trimValue(formData.snsLink)
            : "",
          artistStatement: isSectionEnabled(formSettings.sections.statement)
            ? trimValue(formData.artistStatement)
            : "",
          works,
          portfolioUrl: isSectionEnabled(formSettings.sections.portfolio)
            ? trimValue(formData.portfolioUrl)
            : "",
          privacyAgreed: isSectionEnabled(formSettings.sections.privacy)
            ? formData.privacyAgreed
            : false,
          customFieldAnswers,
          submittedAt: serverTimestamp(),
        }
      );

      const applicationDetailUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/?view=my-page&applicationId=${encodeURIComponent(
              appDocRef.id
            )}&app=${encodeURIComponent(appDocRef.id)}`
          : "";
      const templateContext = {
        name: trimValue(formData.name) || user?.displayName || "",
        email: trimValue(formData.email) || user?.email || "",
        phone: normalizePhone(formData.phone),
        openCallTitle: currentOpenCall.title || OPEN_CALL_TITLE,
        openCallId: currentOpenCall.id || OPEN_CALL_ID,
        applicationId: appDocRef.id,
        submittedAt: new Date().toLocaleString("ko-KR"),
      };
      const applicantName =
        trimValue(formData.name) || user?.displayName || "Applicant";
      const applicantEmail = trimValue(formData.email) || user?.email || "";
      const openCallProgram = {
        name: currentOpenCall.title || OPEN_CALL_TITLE,
        price: 0,
      };
      const openCallDateLabel =
        currentOpenCall.subtitle || OPEN_CALL_SUBTITLE || "Open Call";

      if (
        notificationSettings.applicantEmailEnabled ||
        notificationSettings.adminEmailEnabled
      ) {
        try {
          await sendApplicationEmails({
            applicantName,
            applicantEmail,
            exhibitionTitle: currentOpenCall.title || OPEN_CALL_TITLE,
            selectedDate: openCallDateLabel,
            selectedProgram: openCallProgram,
            partnerType: "open-call",
            phone: normalizePhone(formData.phone),
            brandName: "",
            stageName: currentOpenCall.heroAccent || "",
            myPageUrl: applicationDetailUrl,
            applicationDetailUrl,
            submittedAt: new Date().toISOString(),
            applicationId: appDocRef.id,
            sendApplicantEmail: notificationSettings.applicantEmailEnabled,
            sendAdminEmail: notificationSettings.adminEmailEnabled,
            applicantEmailSubject: renderOpenCallTemplate(
              notificationSettings.applicantEmailSubject,
              templateContext
            ),
            applicantEmailBody: renderOpenCallTemplate(
              notificationSettings.applicantEmailBody,
              templateContext
            ),
            adminEmailSubject: renderOpenCallTemplate(
              notificationSettings.adminEmailSubject,
              templateContext
            ),
            adminEmailBody: renderOpenCallTemplate(
              notificationSettings.adminEmailBody,
              templateContext
            ),
          });
        } catch (mailError) {
          console.error("open-call mail failed:", mailError);
        }
      }

      if (notificationSettings.kakaoEnabled) {
        try {
          await fetch("/.netlify/functions/send-kakao-alimtalk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "application_received",
              to: normalizePhone(formData.phone),
              applicantName,
              exhibitionTitle: currentOpenCall.title || OPEN_CALL_TITLE,
              selectedDate: openCallDateLabel,
              selectedProgram: openCallProgram,
              applicationId: appDocRef.id,
              applicationDetailUrl,
              kakaoMessage: renderOpenCallTemplate(
                notificationSettings.kakaoMessage,
                templateContext
              ),
            }),
          });
        } catch (kakaoError) {
          console.error("open-call kakao failed:", kakaoError);
        }
      }

      if (notificationSettings.smsEnabled) {
        console.info("SMS 알림 설정은 저장되었지만 현재 발송 체계가 없습니다.");
      }

      onSubmitSuccess({
        name: templateContext.name,
        email: templateContext.email,
        phone: templateContext.phone,
        openCallTitle: templateContext.openCallTitle,
        openCallId: templateContext.openCallId,
        applicationId: templateContext.applicationId,
        submittedAt: templateContext.submittedAt,
      });
    } catch (error) {
      console.error(error);
      alert("제출 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWorkCard = (work, index) => {
    const isRequiredWork = index < requiredWorkCount;
    const fileKey = `work-${index}-image`;
    const loading = !!uploadingMap[fileKey];
    const workNumber = index + 1;

    return (
      <div
        key={`work-${index}`}
        className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 mb-1">
              {getWorkLabel(index)}
            </p>
            <h3 className="text-lg font-black text-zinc-900 break-keep">
              {isRequiredWork ? "필수" : "선택"}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => workImageRefs[index].current?.click()}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
              isRequiredWork
                ? "bg-[#004AAD] text-white"
                : "border border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {work.imageUrl ? "이미지 변경" : "이미지 업로드"}
          </button>
        </div>

        <input
          ref={workImageRefs[index]}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleImageUpload(event, index)}
        />

        {work.imageUrl ? (
          <div className="mt-4 overflow-hidden rounded-[22px] border border-zinc-100 bg-zinc-50">
            <img
              src={work.imageUrl}
              alt={`${getWorkLabel(index)} preview`}
              className="h-56 w-full object-cover"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm font-bold text-zinc-400">
            {isRequiredWork
              ? `${getWorkLabel(index)} 이미지를 업로드해 주세요.`
              : "이미지 업로드 후 선택 정보를 입력해 주세요."}
          </div>
        )}

        <FieldError message={errors[fileKey] || fieldErrors[`work${workNumber}Image`]} />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <InputBlock
              label={`${getWorkLabel(index)} 제목`}
              required={isRequiredWork}
              value={work.title}
              onChange={(e) => setWorkField(index, "title", e.target.value)}
              placeholder="작품명을 입력해 주세요"
            />
            {fieldErrors[`work${workNumber}Title`] ? (
              <FieldError message={fieldErrors[`work${workNumber}Title`]} />
            ) : null}
          </div>

          <div>
            <InputBlock
              label={`${getWorkLabel(index)} 재료`}
              required={isRequiredWork}
              value={work.material}
              onChange={(e) => setWorkField(index, "material", e.target.value)}
              placeholder="예: 캔버스에 아크릴"
            />
            {fieldErrors[`work${workNumber}Material`] ? (
              <FieldError message={fieldErrors[`work${workNumber}Material`]} />
            ) : null}
          </div>

          <div>
            <InputBlock
              label={`${getWorkLabel(index)} 크기`}
              required={isRequiredWork}
              value={work.size}
              onChange={(e) => setWorkField(index, "size", e.target.value)}
              placeholder="예: 91 x 116 cm"
            />
            {fieldErrors[`work${workNumber}Size`] ? (
              <FieldError message={fieldErrors[`work${workNumber}Size`]} />
            ) : null}
          </div>

          <div>
            <InputBlock
              label={`${getWorkLabel(index)} 제작연도`}
              required={isRequiredWork}
              value={work.year}
              onChange={(e) => setWorkField(index, "year", e.target.value)}
              placeholder="예: 2026"
            />
            {fieldErrors[`work${workNumber}Year`] ? (
              <FieldError message={fieldErrors[`work${workNumber}Year`]} />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8 text-zinc-900">
      <div className="rounded-[34px] border border-white/70 bg-white/70 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.05)] backdrop-blur-xl md:px-8 md:py-8">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 shadow-sm transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#6e8d00]">
            <Sparkles size={12} />
            OPEN CALL
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-[#004AAD]/12 bg-[#004AAD]/5 px-5 py-5 md:px-6 md:py-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004AAD] mb-2">
            Application Form
          </p>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-zinc-900 break-keep">
            {currentOpenCall.title || OPEN_CALL_TITLE}
          </h1>
          <p className="mt-3 whitespace-pre-line text-sm md:text-base font-medium leading-relaxed text-zinc-600 break-keep">
            {currentOpenCall.subtitle || OPEN_CALL_SUBTITLE}
          </p>
          {!canSubmitOpenCall ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Notice
              </p>
              <p className="mt-1 text-sm font-bold text-amber-800 break-keep">
                현재 접수 가능한 오픈콜이 아닙니다.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-[22px] border border-zinc-100 bg-white px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 mb-1">
                Progress
              </p>
              <p className="text-sm font-bold text-zinc-700">
                {progress.done} / {progress.total} completed
              </p>
            </div>

            <div className="w-full md:max-w-[260px]">
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#004AAD] transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-2 text-right text-[11px] font-black text-[#004AAD]">
                {progress.percent}%
              </div>
            </div>
          </div>
        </div>

        {hasUsableProfile && (
          <div className="mt-5 rounded-[28px] border border-[#004AAD]/12 bg-[#004AAD]/5 px-5 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD] mb-2">
                  Saved Profile
                </p>
                <p className="text-sm md:text-base font-bold text-zinc-700 leading-relaxed break-keep">
                  마이페이지에 저장한 기본정보를 불러올 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseSavedProfile}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#004AAD] px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90"
              >
                <Download size={14} />
                내 기본정보 불러오기
              </button>
            </div>

            {profileLoadedBanner && (
              <p className="mt-4 flex items-start gap-2 text-emerald-600 text-[11px] font-black break-keep">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                저장된 기본정보를 반영했습니다.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 space-y-6 md:space-y-8">
          <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
            <div className="mb-5 flex items-center gap-3">
              <User2 size={18} className="text-[#004AAD]" />
              <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                기본정보
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <InputBlock
                  label="이름"
                  required
                  value={formData.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="이름을 입력해 주세요"
                />
                <FieldError message={fieldErrors.name} />
              </div>

              <div>
                <InputBlock
                  label="연락처"
                  required
                  value={formData.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="010-0000-0000"
                />
                <FieldError message={fieldErrors.phone} />
              </div>

              <div>
                <InputBlock
                  label="이메일"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@example.com"
                />
                <FieldError message={fieldErrors.email} />
              </div>

              {showBirthYearField ? (
                <div>
                  <InputBlock
                    label="출생연도"
                    required={isFieldRequired(formSettings.fields.birthYear)}
                    value={formData.birthYear}
                    onChange={(e) => setField("birthYear", e.target.value)}
                    placeholder="예: 1994"
                  />
                  <FieldError message={fieldErrors.birthYear} />
                </div>
              ) : null}
            </div>

            {showAddressField || showMediumField || showSnsField ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {showAddressField ? (
                  <>
                    <div>
                      <InputBlock
                        label="주소"
                        required={isFieldRequired(formSettings.fields.address)}
                        value={formData.addressMain}
                        onChange={(e) => setField("addressMain", e.target.value)}
                        placeholder="기본 주소를 입력해 주세요"
                      />
                      <FieldError message={fieldErrors.addressMain} />
                    </div>

                    <div>
                      <InputBlock
                        label="상세주소"
                        value={formData.addressDetail}
                        onChange={(e) => setField("addressDetail", e.target.value)}
                        placeholder="동, 호수 등 상세 주소"
                      />
                    </div>
                  </>
                ) : null}

                {showMediumField ? (
                  <div>
                    <InputBlock
                      label="매체"
                      required={isFieldRequired(formSettings.fields.medium)}
                      value={formData.medium}
                      onChange={(e) => setField("medium", e.target.value)}
                      placeholder="예: 회화 / 설치 / 사진"
                    />
                    <FieldError message={fieldErrors.medium} />
                  </div>
                ) : null}

                {showSnsField ? (
                  <div>
                    <InputBlock
                      label="SNS 또는 웹사이트 링크"
                      required={isFieldRequired(formSettings.fields.snsLink)}
                      value={formData.snsLink}
                      onChange={(e) => setField("snsLink", e.target.value)}
                      placeholder="@instagram / https://"
                    />
                    <FieldError message={fieldErrors.snsLink} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {customFields.length > 0 ? (
            <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
              <div className="mb-5 flex items-center gap-3">
                <Sparkles size={18} className="text-[#004AAD]" />
                <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                  추가 입력 항목
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {customFields.map((field) => {
                  const fieldValue = getCustomFieldValue(field, customFieldValues);
                  const fieldError = fieldErrors[field.id];
                  const description = field.description || "";
                  const baseLabel = (
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2 font-bold text-left">
                      {field.label || "추가 입력 항목"}
                      {field.required ? <span className="text-red-500">*</span> : null}
                    </span>
                  );

                  if (field.type === "checkbox") {
                    return (
                      <div key={field.id} className="md:col-span-2 rounded-[24px] border border-zinc-100 bg-zinc-50/70 px-4 py-4">
                        {baseLabel}
                        {description ? (
                          <p className="mt-2 whitespace-pre-line text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                            {description}
                          </p>
                        ) : null}
                        <label className="mt-4 flex items-start gap-3 rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                          <input
                            type="checkbox"
                            checked={fieldValue === true}
                            onChange={(e) => setCustomFieldValue(field, e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#004AAD] focus:ring-[#004AAD]"
                          />
                          <span className="text-sm font-bold text-zinc-700 break-keep">
                            {field.placeholder || "동의 또는 확인 항목입니다."}
                          </span>
                        </label>
                        <FieldError message={fieldError} />
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.id} className="md:col-span-2 rounded-[24px] border border-zinc-100 bg-zinc-50/70 px-4 py-4">
                        {baseLabel}
                        {description ? (
                          <p className="mt-2 whitespace-pre-line text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                            {description}
                          </p>
                        ) : null}
                        <textarea
                          value={String(fieldValue || "")}
                          onChange={(e) => setCustomFieldValue(field, e.target.value)}
                          placeholder={field.placeholder || "답변을 입력해 주세요."}
                          rows={5}
                          className="mt-4 w-full rounded-[24px] border border-zinc-100 bg-white px-5 py-4 text-sm md:text-base font-medium leading-relaxed text-zinc-800 outline-none transition-all focus:border-[#004AAD]/25 focus:bg-white resize-none"
                        />
                        <FieldError message={fieldError} />
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.id} className="rounded-[24px] border border-zinc-100 bg-zinc-50/70 px-4 py-4">
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2 font-bold text-left">
                          {field.label || "추가 입력 항목"}
                          {field.required ? <span className="text-red-500">*</span> : null}
                        </span>
                        {description ? (
                          <p className="mt-2 whitespace-pre-line text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                            {description}
                          </p>
                        ) : null}
                        <select
                          value={String(fieldValue || "")}
                          onChange={(e) => setCustomFieldValue(field, e.target.value)}
                          className="mt-4 w-full rounded-[24px] border border-zinc-100 bg-white px-5 py-4 text-sm md:text-base font-medium leading-relaxed text-zinc-800 outline-none transition-all focus:border-[#004AAD]/25 focus:bg-white"
                        >
                          <option value="">{field.placeholder || "선택해 주세요."}</option>
                          {(Array.isArray(field.options) ? field.options : []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <FieldError message={fieldError} />
                      </div>
                    );
                  }

                  const inputType =
                    getCustomFieldInputType(field.type) === "url"
                      ? "url"
                      : getCustomFieldInputType(field.type) === "email"
                      ? "email"
                      : getCustomFieldInputType(field.type) === "phone"
                      ? "tel"
                      : "text";

                  return (
                    <div key={field.id}>
                      <InputBlock
                        label={field.label || "추가 입력 항목"}
                        required={field.required}
                        type={inputType}
                        value={String(fieldValue || "")}
                        onChange={(e) => setCustomFieldValue(field, e.target.value)}
                        placeholder={field.placeholder || "답변을 입력해 주세요."}
                      />
                      {description ? (
                        <p className="mt-2 whitespace-pre-line text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                          {description}
                        </p>
                      ) : null}
                      <FieldError message={fieldError} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {worksSectionEnabled ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Palette size={18} className="text-[#004AAD]" />
                <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                  대표 작품
                </h2>
              </div>

              {visibleWorks.map((work, index) => renderWorkCard(work, index))}
            </div>
          ) : null}

          {showStatementSection ? (
            <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
              <div className="mb-5 flex items-center gap-3">
                <FileText size={18} className="text-[#004AAD]" />
                <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                  작업 소개
                </h2>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  {statementMaxLength || 0}자 이내
                </span>
              </div>

              <textarea
                value={formData.artistStatement}
                onChange={(e) => setField("artistStatement", e.target.value)}
                placeholder={`작업 소개를 ${statementMaxLength || 0}자 이내로 작성해 주세요.`}
                rows={8}
                maxLength={statementMaxLength || undefined}
                className="w-full rounded-[24px] border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm md:text-base font-medium leading-relaxed text-zinc-800 outline-none transition-all focus:border-[#004AAD]/25 focus:bg-white resize-none"
              />
              <div className="mt-3 flex items-center justify-between gap-4 text-[11px] font-black">
                <span className="text-zinc-400">
                  현재 {formData.artistStatement.length} / {statementMaxLength || 0}자
                </span>
                <span
                  className={`${
                    statementMaxLength > 0 && formData.artistStatement.length > statementMaxLength
                      ? "text-red-500"
                      : "text-[#004AAD]"
                  }`}
                >
                  {statementMaxLength || 0}자 이내
                </span>
              </div>
              <FieldError message={fieldErrors.artistStatement} />
            </div>
          ) : null}

          {showPortfolioSection ? (
            <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
              <div className="mb-5 flex items-center gap-3">
                <ImageIcon size={18} className="text-[#004AAD]" />
                <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                  포트폴리오
                </h2>
              </div>

              <input
                ref={portfolioRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handlePortfolioUpload}
              />

              <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 md:px-5 md:py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-zinc-900 break-keep">
                      포트폴리오 PDF 업로드
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-500 break-keep">
                      PDF 형식으로 업로드해 주세요. 기존 R2 업로드를 재사용합니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => portfolioRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-all hover:border-[#004AAD]/20 hover:text-[#004AAD]"
                  >
                    {uploadingMap.portfolioUrl ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {formData.portfolioUrl ? "업로드 변경" : "업로드"}
                  </button>
                </div>

                {formData.portfolioUrl ? (
                  <a
                    href={formData.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#004AAD]"
                  >
                    <FileText size={13} />
                    업로드된 포트폴리오 보기
                  </a>
                ) : (
                  <p className="mt-4 text-xs font-black text-zinc-400">
                    업로드된 파일이 아직 없습니다.
                  </p>
                )}

                <FieldError message={errors.portfolioUrl || fieldErrors.portfolioUrl} />
              </div>
            </div>
          ) : null}

          {Object.keys(fieldErrors).length > 0 ? (
            <div
              id="open-call-error-summary"
              className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 md:px-6 md:py-6"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 text-red-500" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-red-700 break-keep">
                    입력되지 않은 항목이 있습니다.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-red-600 break-keep">
                    {Object.entries(fieldErrors).map(([key, message]) => (
                      <li key={key}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {showPrivacySection ? (
            <div className="rounded-[28px] border border-zinc-100 bg-white px-5 py-5 md:px-6 md:py-6">
              <div className="mb-4 flex items-center gap-3">
                <AlertCircle size={18} className="text-[#004AAD]" />
                <h2 className="text-lg md:text-xl font-black text-zinc-900 break-keep">
                  개인정보 수집 및 이용 동의
                </h2>
              </div>

              <label className="flex items-start gap-3 rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={formData.privacyAgreed}
                  onChange={(e) => setField("privacyAgreed", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#004AAD] focus:ring-[#004AAD]"
                />
                <span className="text-sm font-bold text-zinc-700 break-keep">
                  개인정보 수집 및 이용에 동의합니다.
                </span>
              </label>
              <FieldError message={fieldErrors.privacyAgreed} />

              <button
                type="button"
                onClick={() => setShowPrivacy((prev) => !prev)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
              >
                {showPrivacy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                자세히 보기
              </button>

              {showPrivacy && (
                <div className="mt-4 max-h-72 overflow-y-auto rounded-[24px] border border-zinc-100 bg-zinc-50 p-4">
                  <pre className="whitespace-pre-line break-keep text-[12px] font-medium leading-6 text-zinc-600">
                    {OPEN_CALL_PRIVACY_TEXT}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">
            {currentOpenCall.subtitle || OPEN_CALL_SUBTITLE}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !canSubmitOpenCall ||
              isSubmitting ||
              Object.values(uploadingMap).some(Boolean)
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#004AAD] px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_35px_rgba(0,74,173,0.2)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {canSubmitOpenCall ? "지원서 제출" : "접수 불가"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default OpenCallApplicationForm;

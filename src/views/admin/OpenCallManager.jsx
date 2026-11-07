import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
  Trash2,
  Users,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  OPEN_CALL_FALLBACK,
  OPEN_CALL_CUSTOM_FIELD_TYPES,
  OPEN_CALL_TITLE,
  createFallbackOpenCall,
  buildFallbackDescriptionSections,
  normalizeOpenCallCompletionSettings,
  pickActiveOpenCall,
  normalizeOpenCallDescriptionSections,
  normalizeOpenCallFormSettings,
  normalizeOpenCallFaqs,
  normalizeOpenCallLandingLabels,
  normalizeOpenCallNotificationSettings,
} from "../../constants/openCall";
import OpenCallApplicationForm from "../open-call/OpenCallApplicationForm";
import { splitIntroText } from "../open-call/openCallView";
import { uploadImageToR2 } from "../../lib/uploads";
import { readPosterPalette } from "./open-call/posterColor";
import OpenCallContentEditor from "./open-call/OpenCallContentEditor";
import OpenCallCreateDialog from "./open-call/OpenCallCreateDialog";
import OpenCallPagePreview from "./open-call/OpenCallPagePreview";
import OpenCallStoryMaker from "./open-call/OpenCallStoryMaker";
import {
  buildBlankOpenCall,
  buildDuplicateOpenCall,
  createOpenCallId,
  moveListItem,
  toStoredOpenCallDate,
} from "./open-call/openCallEditorModel";

const QUIET_BUTTON = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50";
const OPEN_CALL_MANAGER_TABS = [
  { id: "landing", label: "공고 내용" },
  { id: "form", label: "신청 양식" },
  { id: "applications", label: "지원서" },
  { id: "promotion", label: "홍보 이미지" },
];

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

const createDescriptionSectionId = () =>
  `section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyDescriptionSection = (order = 1) => ({
  id: createDescriptionSectionId(),
  title: "",
  body: "",
  order,
  isVisible: true,
});

const normalizeDescriptionSectionDrafts = (sections) =>
  normalizeOpenCallDescriptionSections(Array.isArray(sections) ? sections : []).map(
    (section, index) => ({
      id: section.id || createDescriptionSectionId(),
      title: section.title || "",
      body: section.body || "",
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1,
      isVisible: section.isVisible !== false,
    })
  );

const buildDescriptionSectionDrafts = (call) => {
  const hasDescriptionSectionsField = Object.prototype.hasOwnProperty.call(
    call || {},
    "descriptionSections"
  );
  const source = hasDescriptionSectionsField
    ? Array.isArray(call?.descriptionSections)
      ? call.descriptionSections
      : []
    : buildFallbackDescriptionSections(call);

  const normalized = normalizeDescriptionSectionDrafts(source);
  return hasDescriptionSectionsField ? normalized : normalized.length > 0 ? normalized : [createEmptyDescriptionSection(1)];
};

const getNextDescriptionSectionOrder = (sections) => {
  const list = Array.isArray(sections) ? sections : [];
  return list.reduce((max, section) => {
    const order = Number(section?.order);
    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, 0) + 1;
};

const normalizeDescriptionSectionPayload = (sections) =>
  normalizeDescriptionSectionDrafts(Array.isArray(sections) ? sections : []).map((section, index) => ({
    id: section.id || createDescriptionSectionId(),
    title: section.title || "",
    body: section.body || "",
    order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1,
    isVisible: section.isVisible !== false,
  }));

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

const getOpenCallDraftFormSettings = (draft, call) =>
  normalizeOpenCallFormSettings(
    draft?.formSettings || call?.formSettings || OPEN_CALL_FALLBACK.formSettings
  );

const normalizeFeaturedOpenCallStatus = (status) => {
  if (status === "draft" || status === "archived") {
    return "open";
  }

  return status || "open";
};

const normalizeOpenCallPublicationState = (call = {}) => {
  const next = { ...call };

  if (next.isFeatured === true) {
    next.isVisible = true;
    next.status = normalizeFeaturedOpenCallStatus(next.status);
  }

  if (next.isVisible === false) {
    next.isFeatured = false;
  }

  return next;
};

const PUBLICATION_STATE_META = {
  private: { label: "비공개" },
  public: { label: "공개" },
  featured: { label: "공개 중" },
  archived: { label: "마감" },
};

const getPublicationState = (call) => {
  if (!call) return "private";
  if (call.isVisible === false) return "private";
  if (call.isFeatured === true) return "featured";
  if (call.status === "closed" || call.status === "archived") return "archived";
  return "public";
};

const buildPublicationStatePatch = (call, state) => {
  const currentStatus = call?.status || "draft";

  if (state === "private") {
    return {
      ...call,
      isVisible: false,
      isFeatured: false,
    };
  }

  if (state === "public") {
    return {
      ...call,
      isVisible: true,
      isFeatured: false,
      status: ["draft", "archived", "closed"].includes(currentStatus)
        ? "open"
        : currentStatus,
    };
  }

  if (state === "featured") {
    return {
      ...call,
      isVisible: true,
      isFeatured: true,
      status: ["draft", "archived", "closed"].includes(currentStatus)
        ? "open"
        : currentStatus,
    };
  }

  if (state === "archived") {
    return {
      ...call,
      isVisible: true,
      isFeatured: false,
      status: "closed",
    };
  }

  return call;
};

const formatDateTime = (value) => {
  if (!value) return "-";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "-";
  }
};

const createEmptyFaq = (order = 1) => ({
  question: "",
  answer: "",
  isVisible: true,
  order,
});

const normalizeFaqDrafts = (faqs) => {
  const list = Array.isArray(faqs) ? faqs : [];
  if (list.length === 0) {
    return [createEmptyFaq(1)];
  }

  return normalizeOpenCallFaqs(list).map((faq, index) => ({
    question: faq.question || "",
    answer: faq.answer || "",
    isVisible: faq.isVisible !== false,
    order: faq.order ?? index + 1,
  }));
};

const normalizeFaqPayload = (faqs) =>
  normalizeOpenCallFaqs(Array.isArray(faqs) ? faqs : [])
    .map((faq, index) => ({
      question: (faq.question || "").trim(),
      answer: (faq.answer || "").trim(),
      isVisible: faq.isVisible !== false,
      order: Number.isFinite(Number(faq.order)) ? Number(faq.order) : index + 1,
    }))
    .filter((faq) => faq.question || faq.answer);

const CUSTOM_FIELD_TYPE_LABELS = {
  text: "짧은 답변",
  textarea: "긴 답변",
  url: "URL",
  email: "이메일",
  phone: "전화번호",
  select: "선택 목록",
  checkbox: "체크박스",
};

const createCustomFieldId = () =>
  `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyCustomField = (order = 1) => ({
  id: createCustomFieldId(),
  label: "추가 질문",
  type: "text",
  placeholder: "답변을 입력해 주세요.",
  description: "",
  required: false,
  enabled: true,
  order,
  options: [],
  maxLength: 0,
});

const normalizeCustomFieldDrafts = (customFields) =>
  (Array.isArray(customFields) ? customFields : []).map((field, index) => ({
    id: field?.id || createCustomFieldId(),
    label: field?.label || "",
    type: OPEN_CALL_CUSTOM_FIELD_TYPES.includes(field?.type) ? field.type : "text",
    placeholder: field?.placeholder || "",
    description: field?.description || "",
    required: field?.required === true,
    enabled: field?.enabled !== false,
    order: Number.isFinite(Number(field?.order)) ? Number(field.order) : index + 1,
    options: Array.isArray(field?.options)
      ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
      : [],
    maxLength: Math.max(0, Number(field?.maxLength) || 0),
  }));

const parseCustomFieldOptions = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const getCustomFieldTypeLabel = (type) => CUSTOM_FIELD_TYPE_LABELS[type] || type || "text";

const getCustomFieldAnswerDisplayValue = (answer) => {
  if (!answer) return "-";
  if (answer.type === "checkbox") {
    return answer.value ? "예" : "아니오";
  }

  const text = String(answer.value ?? "").trim();
  return text || "-";
};

const getCustomFieldAnswersList = (answers) =>
  Object.entries(answers || {})
    .map(([fieldId, answer]) => ({
      fieldId,
      label: answer?.label || fieldId,
      type: answer?.type || "text",
      value: answer?.value,
    }));

const buildCustomFieldCsvColumns = (call, rows) => {
  const columns = [];
  const usedHeaders = new Set();
  const customFields = normalizeCustomFieldDrafts(call?.formSettings?.customFields);

  const addColumn = (fieldId, label) => {
    const baseLabel = String(label || fieldId || "추가 질문").trim() || "추가 질문";
    let header = `추가질문_${baseLabel}`;
    if (usedHeaders.has(header)) {
      header = `추가질문_${baseLabel}_${String(fieldId || "field").slice(-4)}`;
    }
    usedHeaders.add(header);
    columns.push({ fieldId, header });
  };

  customFields.forEach((field) => addColumn(field.id, field.label || field.id));

  (Array.isArray(rows) ? rows : []).forEach((app) => {
    Object.entries(app?.customFieldAnswers || {}).forEach(([fieldId, answer]) => {
      if (columns.some((column) => column.fieldId === fieldId)) return;
      addColumn(fieldId, answer?.label || fieldId);
    });
  });

  return columns;
};

const getCustomFieldCsvValue = (answer) => {
  if (!answer) return "";
  if (answer.type === "checkbox") {
    return answer.value === true ? "true" : "false";
  }

  return String(answer.value ?? "");
};

const getOpenCallApplyPath = (openCallId = "") => {
  const params = new URLSearchParams();
  if (openCallId) {
    params.set("openCallId", openCallId);
  }

  const query = params.toString();
  return query ? `/opencall/apply?${query}` : "/opencall/apply";
};

const OpenCallManager = ({ db, appId, applications }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOpenCallTab, setActiveOpenCallTab] = useState("landing");
  const [selectedOpenCallId, setSelectedOpenCallId] = useState("");
  const [previewOpenCallId, setPreviewOpenCallId] = useState("");
  const [formPreviewVersion, setFormPreviewVersion] = useState(0);
  const [editorStep, setEditorStep] = useState("basics");
  const [createDialog, setCreateDialog] = useState(null);
  const [previewPage, setPreviewPage] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState({});
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const [reviewSavingMap, setReviewSavingMap] = useState({});
  const [memoDrafts, setMemoDrafts] = useState({});
  const [memoSavingMap, setMemoSavingMap] = useState({});
  const [adminNotes, setAdminNotes] = useState({});
  const clearTimersRef = useRef({});

  useEffect(
    () =>
      onSnapshot(
        collection(db, "artifacts", appId, "admin", "data", "applicationNotes"),
        (snapshot) => {
          setAdminNotes(Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()])));
        },
        (error) => console.error(error)
      ),
    [appId, db]
  );

  // Falls back to the legacy field until scripts/migrate-admin-memos.mjs has run.
  const getAdminMemo = (app) => adminNotes[app.id]?.memo ?? app.openCallAdminMemo ?? "";

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

  const activeOpenCall = useMemo(() => pickActiveOpenCall(openCalls), [openCalls]);
  const activeOpenCallId = activeOpenCall?.id || "";

  useEffect(() => {
    if (sortedCalls.length === 0) {
      setPreviewOpenCallId("");
      return;
    }

    setPreviewOpenCallId((current) =>
      current && sortedCalls.some((call) => call.id === current)
        ? current
        : activeOpenCallId && sortedCalls.some((call) => call.id === activeOpenCallId)
        ? activeOpenCallId
        : sortedCalls[0].id
    );
  }, [activeOpenCallId, sortedCalls]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      sortedCalls.forEach((call) => {
        if (!next[call.id]) {
          next[call.id] = {
            title: call.title || "",
            subtitle: call.subtitle || "",
            themeKeyword: call.themeKeyword || "",
            eligibilityText: call.eligibilityText || "",
            benefitText: call.benefitText || "",
            magazineText: call.magazineText || "",
            status: call.status || "draft",
            // Older calls keep requirements as emoji blocks inside the intro; editing splits them into rows.
            introText: Array.isArray(call.requirementItems) ? call.introText || "" : splitIntroText(call.introText).lead,
            requirementItems: Array.isArray(call.requirementItems) ? call.requirementItems : splitIntroText(call.introText).details,
            posterUrl: call.posterUrl || "",
            accentColor: call.accentColor || "",
            termsText: call.termsText || "",
            salesConsentText: call.salesConsentText || "",
            badgeText: call.badgeText || "OPEN",
            heroTitle: call.heroTitle || "",
            heroAccent: call.heroAccent || "",
            statusNoticeText:
              call.statusNoticeText ||
              OPEN_CALL_FALLBACK.statusNoticeText ||
              "현재 지원서를 접수하고 있습니다.",
            isVisible: call.isVisible !== false,
            isFeatured: !!call.isFeatured,
            descriptionSections: buildDescriptionSectionDrafts(call),
            landingLabels: normalizeOpenCallLandingLabels(
              call.landingLabels || OPEN_CALL_FALLBACK.landingLabels
            ),
            formSettings: normalizeOpenCallFormSettings(call.formSettings),
            completionSettings: normalizeOpenCallCompletionSettings(
              call.completionSettings
            ),
            notificationSettings: normalizeOpenCallNotificationSettings(
              call.notificationSettings
            ),
            mediumText: call.mediumText || "",
            applyButtonText: call.applyButtonText || "",
            faqs: normalizeFaqDrafts(call.faqs),
            applicationStartAt: toDatetimeLocalValue(call.applicationStartAt),
            applicationEndAt: toDatetimeLocalValue(call.applicationEndAt),
            announcementAt: toDatetimeLocalValue(call.announcementAt),
          };
        }
      });
      return next;
    });
  }, [sortedCalls]);

  // The first version of a draft is its saved baseline, which is what "unsaved" compares against.
  useEffect(() => {
    setSavedSnapshots((prev) => {
      const missing = Object.keys(drafts).filter((id) => prev[id] === undefined);
      if (missing.length === 0) return prev;
      return { ...prev, ...Object.fromEntries(missing.map((id) => [id, JSON.stringify(drafts[id])])) };
    });
  }, [drafts]);

  const hasUnsavedDrafts = Object.keys(savedSnapshots).some(
    (id) => drafts[id] && savedSnapshots[id] !== JSON.stringify(drafts[id])
  );

  useEffect(() => {
    if (!hasUnsavedDrafts) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedDrafts]);

  useEffect(() => {
    if (!managerNotice) return undefined;
    const timer = setTimeout(() => setManagerNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [managerNotice]);

  const closePreviewPage = useCallback(() => setPreviewPage(false), []);
  const closeCreateDialog = useCallback(() => setCreateDialog(null), []);

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

  const updatePublicationDraft = (callId, mutate) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const nextDraft = mutate(current);

      return {
        ...prev,
        [callId]: normalizeOpenCallPublicationState(nextDraft),
      };
    });
  };

  const handleSetPublicationState = (call, state) => {
    if (!call?.id) return;

    if (state === "private" && (drafts[call.id]?.isFeatured ?? call.isFeatured)) {
      const ok = window.confirm(
        "대표 공고를 비공개로 전환하면 /opencall에 노출되지 않습니다.\n비공개로 전환하면서 대표 공고를 해제할까요?"
      );
      if (!ok) return;
    }

    updatePublicationDraft(call.id, (current) =>
      buildPublicationStatePatch(current, state)
    );
  };

  const updateFormSettings = (callId, mutate) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const normalized = getOpenCallDraftFormSettings(current, current);
      const nextFormSettings = mutate(normalized);

      return {
        ...prev,
        [callId]: {
          ...current,
          formSettings: normalizeOpenCallFormSettings(nextFormSettings),
        },
      };
    });
  };

  const updateCustomFields = (callId, mutate) => {
    updateFormSettings(callId, (current) => ({
      ...current,
      customFields: mutate(normalizeCustomFieldDrafts(current.customFields)),
    }));
  };

  const updateCustomField = (callId, index, key, value) => {
    updateCustomFields(callId, (list) =>
      list.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    );
  };

  const addCustomField = (callId) => {
    updateCustomFields(callId, (list) => [...list, createEmptyCustomField(list.length + 1)]);
  };

  const removeCustomField = (callId, index) => {
    const ok = window.confirm("이 추가 입력 항목을 삭제할까요?");
    if (!ok) return;

    updateCustomFields(callId, (list) =>
      list.filter((_, fieldIndex) => fieldIndex !== index)
    );
  };

  const moveCustomField = (callId, index, direction) => {
    updateCustomFields(callId, (list) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return list;

      const next = [...list];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((field, fieldIndex) => ({ ...field, order: fieldIndex + 1 }));
    });
  };

  const updateDescriptionSection = (callId, index, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const sections = normalizeDescriptionSectionDrafts(current.descriptionSections);

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
      const sections = normalizeDescriptionSectionDrafts(current.descriptionSections);
      return {
        ...prev,
        [callId]: {
          ...current,
          descriptionSections: [
            ...sections,
            createEmptyDescriptionSection(getNextDescriptionSectionOrder(sections)),
          ],
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
      const sections = normalizeDescriptionSectionDrafts(current.descriptionSections).filter(
        (_, sectionIndex) => sectionIndex !== index
      );

      return {
        ...prev,
        [callId]: {
          ...current,
          descriptionSections: sections,
        },
      };
    });
  };

  const moveDescriptionSection = (callId, index, direction) => {
    updateDraft(
      callId,
      "descriptionSections",
      moveListItem(normalizeDescriptionSectionDrafts(drafts[callId]?.descriptionSections), index, direction)
    );
  };

  const moveFaqItem = (callId, index, direction) => {
    updateDraft(callId, "faqs", moveListItem(normalizeFaqDrafts(drafts[callId]?.faqs), index, direction));
  };

  const updateLandingLabel = (callId, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const landingLabels = normalizeOpenCallLandingLabels(
        current.landingLabels || OPEN_CALL_FALLBACK.landingLabels
      );

      return {
        ...prev,
        [callId]: {
          ...current,
          landingLabels: {
            ...landingLabels,
            [key]: value,
          },
        },
      };
    });
  };

  const updateFaqItem = (callId, index, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const faqs = normalizeFaqDrafts(current.faqs);
      return {
        ...prev,
        [callId]: {
          ...current,
          faqs: faqs.map((faq, faqIndex) =>
            faqIndex === index ? { ...faq, [key]: value } : faq
          ),
        },
      };
    });
  };

  const addFaqItem = (callId) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const faqs = normalizeFaqDrafts(current.faqs);
      return {
        ...prev,
        [callId]: {
          ...current,
          faqs: [...faqs, createEmptyFaq(faqs.length + 1)],
        },
      };
    });
  };

  const removeFaqItem = (callId, index) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const faqs = normalizeFaqDrafts(current.faqs).filter((_, faqIndex) => faqIndex !== index);
      return {
        ...prev,
        [callId]: {
          ...current,
          faqs: faqs.length > 0 ? faqs : [createEmptyFaq(1)],
        },
      };
    });
  };

  const handlePosterUpload = async (callId, file) => {
    setPosterError("");
    setPosterUploading(true);
    try {
      const result = await uploadImageToR2({ file, folder: "open-call/posters", isAdminUpload: true });
      updateDraft(callId, "posterUrl", result.url);

      // Read from the local file: a colour problem must not undo a poster that already uploaded.
      const preview = URL.createObjectURL(file);
      const [mainColor] = await readPosterPalette(preview).catch(() => []);
      URL.revokeObjectURL(preview);
      if (mainColor) updateDraft(callId, "accentColor", mainColor);
    } catch (error) {
      setPosterError(error.message || "포스터를 올리지 못했습니다.");
    } finally {
      setPosterUploading(false);
    }
  };

  const openCallDoc = (id) => doc(db, "artifacts", appId, "public", "data", "openCalls", id);

  const handleCreateOpenCall = async ({ title, sourceId }) => {
    const id = createOpenCallId();
    const source = sourceId ? sortedCalls.find((call) => call.id === sourceId) : null;
    const data = source
      ? buildDuplicateOpenCall({ ...source, ...(drafts[source.id] || {}), notificationSettings: source.notificationSettings }, { id, title })
      : buildBlankOpenCall({ id, title });

    try {
      await setDoc(openCallDoc(id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (error) {
      console.error(error);
      throw new Error(formatFirestorePermissionMessage(error));
    }

    setPreviewOpenCallId(id);
    setActiveOpenCallTab("landing");
    setEditorStep("basics");
    setCreateDialog(null);
    setManagerNotice(`'${title}' 공고를 비공개로 만들었습니다. 내용을 채운 뒤 공개 설정에서 공개하세요.`);
  };

  const handleDeleteOpenCall = async (call, applicantCount) => {
    if (applicantCount > 0) return;
    if (!window.confirm(`'${drafts[call.id]?.title || call.title}' 공고를 삭제할까요? 되돌릴 수 없습니다.`)) return;

    try {
      await deleteDoc(openCallDoc(call.id));
      setEditorStep("basics");
      setManagerNotice("공고를 삭제했습니다.");
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
    const payload = normalizeOpenCallPublicationState({
      ...call,
      ...draft,
      statusNoticeText:
        draft.statusNoticeText || call.statusNoticeText || OPEN_CALL_FALLBACK.statusNoticeText,
      descriptionSections: normalizeDescriptionSectionPayload(
        draft.descriptionSections || call.descriptionSections
      ),
      landingLabels: normalizeOpenCallLandingLabels(
        draft.landingLabels || call.landingLabels || OPEN_CALL_FALLBACK.landingLabels
      ),
      faqs: normalizeFaqPayload(draft.faqs),
      formSettings: normalizeOpenCallFormSettings(
        draft.formSettings || call.formSettings || OPEN_CALL_FALLBACK.formSettings
      ),
      completionSettings: normalizeOpenCallCompletionSettings(
        draft.completionSettings ||
          call.completionSettings ||
          OPEN_CALL_FALLBACK.completionSettings
      ),
      notificationSettings: normalizeOpenCallNotificationSettings(
        draft.notificationSettings ||
          call.notificationSettings ||
          OPEN_CALL_FALLBACK.notificationSettings
      ),
      id: call.id,
      trackType: "open-call",
      updatedAt: serverTimestamp(),
      createdAt: call.createdAt || serverTimestamp(),
      applicationStartAt: toStoredOpenCallDate(draft.applicationStartAt),
      applicationEndAt: toStoredOpenCallDate(draft.applicationEndAt),
      announcementAt: toStoredOpenCallDate(draft.announcementAt),
    });
    payload.requirementItems = (draft.requirementItems || []).filter(
      (item) => String(item.title || "").trim() || String(item.body || "").trim()
    );
    payload.descriptionSections = payload.descriptionSections.filter(
      (section) => section.title.trim() || section.body.trim()
    );
    const activeCandidate = pickActiveOpenCall(
      sortedCalls.map((item) => (item.id === call.id ? { ...item, ...payload } : item))
    );

    setTimedSaveFeedback(call.id, {
      state: "saving",
      message: "저장 중...",
    });

    try {
      // Message settings have a dedicated editor; do not overwrite its newer draft here.
      delete payload.notificationSettings;
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", call.id),
        payload,
        { merge: true }
      );
      const otherFeatured = payload.isFeatured
        ? sortedCalls.filter((item) => item.id !== call.id && item.isFeatured)
        : [];
      await Promise.all(
        otherFeatured.map((item) => updateDoc(openCallDoc(item.id), { isFeatured: false, updatedAt: serverTimestamp() }))
      );

      const flags = { isVisible: payload.isVisible, isFeatured: payload.isFeatured, status: payload.status };
      setDrafts((prev) => ({
        ...prev,
        [call.id]: { ...(prev[call.id] || {}), ...flags },
        ...Object.fromEntries(
          otherFeatured.map((item) => [item.id, { ...(prev[item.id] || {}), isFeatured: false }])
        ),
      }));
      setSavedSnapshots((prev) => ({
        ...prev,
        [call.id]: JSON.stringify({ ...draft, ...flags }),
        ...Object.fromEntries(
          otherFeatured.map((item) => [item.id, JSON.stringify({ ...(drafts[item.id] || {}), isFeatured: false })])
        ),
      }));
      setTimedSaveFeedback(call.id, {
        state: "saved",
        message:
          payload.isVisible === false
            ? "저장했습니다. 비공개라 외부에는 보이지 않습니다."
            : activeCandidate?.id === call.id
            ? "저장했습니다. /opencall에 반영됩니다."
            : "저장했습니다. /opencall에는 다른 공고가 표시됩니다.",
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
    const memo = memoDrafts[app.id] ?? getAdminMemo(app);
    setMemoSavingMap((prev) => ({ ...prev, [app.id]: true }));

    try {
      const batch = writeBatch(db);
      batch.set(
        doc(db, "artifacts", appId, "admin", "data", "applicationNotes", app.id),
        { memo, updatedAt: serverTimestamp() },
        { merge: true }
      );
      batch.update(
        doc(db, "artifacts", appId, "public", "data", "applications", app.id),
        {
          openCallAdminMemo: deleteField(),
          memoUpdatedAt: deleteField(),
          updatedAt: serverTimestamp(),
        }
      );
      await batch.commit();
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
    const hasAny = (key) => rows.some((app) => app[key]);
    const workCount = rows.reduce((max, app) => Math.max(max, Array.isArray(app.works) ? app.works.length : 0), 0);
    const hasWorkSize = rows.some((app) => (app.works || []).some((work) => work?.size));
    const workColumns = Array.from({ length: workCount }, (_, index) => [
      [`작품${index + 1}_작품명`, "title"],
      [`작품${index + 1}_재료`, "material"],
      ...(hasWorkSize ? [[`작품${index + 1}_크기(세로x가로)`, "size"]] : []),
      [`작품${index + 1}_제작연도`, "year"],
      [`작품${index + 1}_작품가격`, "price"],
      [`작품${index + 1}_이미지URL`, "imageUrl"],
    ].map(([header, key]) => [header, (app) => getWorkValue(app.works?.[index], key)])).flat();

    const columns = [
      ["공고ID", () => call.id],
      ["공고명", () => call.title || OPEN_CALL_FALLBACK.title],
      ["심사상태", (app) => getOpenCallReviewMeta(app.openCallReviewStatus).label],
      ["출생연도", (app) => app.birthYear || ""],
      ["이름", (app) => app.name || ""],
      ["영어이름", (app) => app.englishName || ""],
      ["활동명", (app) => app.stageName || ""],
      ["휴대폰번호", (app) => app.phone || ""],
      ["이메일", (app) => app.email || app.applicantEmail || ""],
      ["홈페이지/SNS", (app) => app.snsLink || ""],
      ["기타사이트", (app) => app.otherLink || ""],
      ["포트폴리오URL", (app) => app.portfolioUrl || ""],
      ["작가소개", (app) => app.artistStatement || ""],
      // Earlier calls collected these; they only appear when a row has them.
      ...(hasAny("addressMain") ? [
        ["주소", (app) => app.addressMain || ""],
        ["우편번호", (app) => app.postalCode || ""],
        ["상세주소", (app) => app.addressDetail || ""],
      ] : []),
      ...(hasAny("medium") ? [["매체", (app) => app.medium || ""]] : []),
      ...workColumns,
      ["약관동의", (app) => (app.termsAgreed ? "동의" : "")],
      ["판매가능동의", (app) => (app.salesAgreed ? "동의" : "")],
      ["관리자메모", (app) => getAdminMemo(app)],
      ["제출일", (app) => formatDate(app.submittedAt)],
      ...buildCustomFieldCsvColumns(call, rows).map((column) => [
        column.header,
        (app) => getCustomFieldCsvValue((app.customFieldAnswers || {})[column.fieldId]),
      ]),
    ];

    return "\uFEFF" + [
      columns.map(([header]) => escapeCsv(header)).join(","),
      ...rows.map((app) => columns.map(([, read]) => escapeCsv(read(app))).join(",")),
    ].join("\n");
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
  const previewedOpenCall = useMemo(
    () =>
      sortedCalls.find((call) => call.id === previewOpenCallId) ||
      (activeOpenCallId
        ? sortedCalls.find((call) => call.id === activeOpenCallId) || null
        : sortedCalls[0] || null),
    [activeOpenCallId, previewOpenCallId, sortedCalls]
  );
  const previewedDraft = previewedOpenCall ? drafts[previewedOpenCall.id] || {} : null;
  const previewedRawOpenCall = useMemo(
    () => openCalls.find((call) => call.id === previewOpenCallId) || null,
    [openCalls, previewOpenCallId]
  );
  const previewedOpenCallForStatus = useMemo(
    () =>
      previewedRawOpenCall || previewedOpenCall
        ? { ...(previewedRawOpenCall || previewedOpenCall || {}), ...(previewedDraft || {}) }
        : null,
    [previewedDraft, previewedOpenCall, previewedRawOpenCall]
  );
  const editingOpenCall = previewedOpenCallForStatus || previewedOpenCall || null;
  const previewedOpenCallView = useMemo(
    () => (editingOpenCall ? createFallbackOpenCall(editingOpenCall) : null),
    [editingOpenCall]
  );
  useEffect(() => {
    if (activeOpenCallTab === "applications" && previewOpenCallId) {
      setSelectedOpenCallId(previewOpenCallId);
    }
  }, [activeOpenCallTab, previewOpenCallId]);

  const handleOpenFormWindow = (openCallId) => {
    if (typeof window === "undefined") return;
    window.open(getOpenCallApplyPath(openCallId), "_blank", "noopener,noreferrer");
  };

  const handleCopyFormLink = async (openCallId) => {
    if (typeof window === "undefined") return;

    const absoluteUrl = `${window.location.origin}${getOpenCallApplyPath(openCallId)}`;

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setManagerNotice("입력폼 딥링크를 복사했습니다.");
    } catch (error) {
      console.error(error);
      window.prompt("아래 입력폼 링크를 복사해 주세요.", absoluteUrl);
    }
  };

  const handleRefreshFormPreview = () => {
    setFormPreviewVersion((prev) => prev + 1);
  };

  return (
    <section className="mb-10 min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-zinc-950">오픈콜</h3>
          <p className="mt-1 text-sm text-zinc-600 break-keep">
            {activeOpenCall ? <>지금 /opencall에 표시 중: <span className="font-semibold text-zinc-900">{activeOpenCall.title || "제목 없음"}</span></> : "지금 /opencall에 표시되는 공고가 없습니다."}
          </p>
        </div>
        <button type="button" onClick={() => setCreateDialog({ sourceId: "" })} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
          <Plus size={16} />새 오픈콜 만들기
        </button>
      </div>

      {managerNotice ? (
        <p role="status" className="mb-5 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 break-keep">{managerNotice}</p>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 px-6 py-14 text-center">
          <Loader2 className="mx-auto animate-spin text-zinc-500" size={24} />
          <p className="mt-3 text-sm text-zinc-600">공고를 불러오는 중입니다.</p>
        </div>
      ) : sortedCalls.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 px-6 py-14 text-center">
          <p className="text-base font-bold text-zinc-950">아직 오픈콜 공고가 없습니다</p>
          <p className="mt-1 text-sm text-zinc-600">위의 새 오픈콜 만들기로 첫 공고를 시작하세요.</p>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="공고 목록" className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
            {sortedCalls.map((call) => {
              const listed = { ...call, ...(drafts[call.id] || {}) };
              const end = formatDateTime(listed.applicationEndAt);
              return (
                <button
                  key={call.id}
                  type="button"
                  aria-current={call.id === previewOpenCallId ? "true" : undefined}
                  onClick={() => setPreviewOpenCallId(call.id)}
                  className={`block w-full rounded-md px-3 py-2.5 text-left ${call.id === previewOpenCallId ? "bg-zinc-200" : "hover:bg-zinc-100"}`}
                >
                  <span className="block truncate text-sm font-semibold text-zinc-950">{listed.title || "제목 없음"}</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    {PUBLICATION_STATE_META[getPublicationState(listed)].label} · 지원 {getApplicantItems(applications, call.id).length}{end === "-" ? "" : ` · ~${end}`}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
          {sortedCalls.filter(call => call.id === previewOpenCallId).map((call) => {
            const draft = drafts[call.id] || {};
            const applicantCount = getApplicantItems(applications, call.id).length;
            const formSettings = getOpenCallDraftFormSettings(draft, call);
            const customFields = normalizeCustomFieldDrafts(formSettings.customFields);
            const publicationState = getPublicationState({ ...call, ...draft });
            const feedback = saveFeedbacks[call.id];
            const isDirty = savedSnapshots[call.id] !== undefined && savedSnapshots[call.id] !== JSON.stringify(draft);
            const completionEditId = `open-call-${call.id}-completion`;

            return (
              <div key={call.id} className="min-w-0">
                <div className="z-30 -mx-1 mb-4 border-b md:sticky md:top-20 border-zinc-200 bg-white px-1 pb-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-lg font-bold text-zinc-950">{draft.title || "제목 없음"}</h4>
                      <p className={`text-sm ${feedback?.state === "error" ? "font-medium text-red-700" : "text-zinc-600"}`} role="status">
                        {feedback?.message || (isDirty ? "저장하지 않은 변경 사항이 있습니다" : PUBLICATION_STATE_META[publicationState].label)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPreviewPage(true)} className={QUIET_BUTTON}><Eye size={16} />미리보기</button>
                      <button type="button" onClick={() => handleSave(call)} disabled={feedback?.state === "saving" || !isDirty} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500">
                        <Save size={16} />{feedback?.state === "saving" ? "저장 중…" : "저장"}
                      </button>
                    </div>
                  </div>
                  <div role="tablist" aria-label="공고 편집 영역" className="mt-3 flex gap-1 overflow-x-auto">
                    {OPEN_CALL_MANAGER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeOpenCallTab === tab.id}
                        onClick={() => setActiveOpenCallTab(tab.id)}
                        className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-semibold ${activeOpenCallTab === tab.id ? "border-zinc-950 text-zinc-950" : "border-transparent text-zinc-600 hover:text-zinc-950"}`}
                      >
                        {tab.label}{tab.id === "applications" ? ` ${applicantCount}` : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {activeOpenCallTab === "landing" ? (
                  <OpenCallContentEditor
                    draft={draft}
                    step={editorStep}
                    onStepChange={setEditorStep}
                    onChange={(key, value) => updateDraft(call.id, key, value)}
                    onLabel={(key, value) => updateLandingLabel(call.id, key, value)}
                    sections={{
                      list: normalizeDescriptionSectionDrafts(draft.descriptionSections),
                      onChange: (index, key, value) => updateDescriptionSection(call.id, index, key, value),
                      onAdd: () => addDescriptionSection(call.id),
                      onRemove: (index) => removeDescriptionSection(call.id, index),
                      onMove: (index, direction) => moveDescriptionSection(call.id, index, direction),
                    }}
                    faqs={{
                      list: normalizeFaqDrafts(draft.faqs),
                      onChange: (index, key, value) => updateFaqItem(call.id, index, key, value),
                      onAdd: () => addFaqItem(call.id),
                      onRemove: (index) => removeFaqItem(call.id, index),
                      onMove: (index, direction) => moveFaqItem(call.id, index, direction),
                    }}
                    publicationState={publicationState}
                    onPublicationChange={(state) => handleSetPublicationState({ ...call, ...draft }, state)}
                    applicantCount={applicantCount}
                    onDuplicate={() => setCreateDialog({ sourceId: call.id })}
                    onDelete={() => handleDeleteOpenCall(call, applicantCount)}
                    onGoToForm={() => setActiveOpenCallTab("form")}
                    onPosterUpload={(file) => handlePosterUpload(call.id, file)}
                    posterUploading={posterUploading}
                    posterError={posterError}
                  />
                ) : null}

                {activeOpenCallTab === "form" ? (
                <div className="flex flex-col gap-5">
                    <div
                      id={completionEditId}
                      className="order-2 mt-4 rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-base font-bold text-zinc-950">
                            추가 질문
                          </p>
                          <p className="mt-1 text-sm text-zinc-600 break-keep">
                            이번 공고에서만 따로 물어볼 내용을 추가합니다.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addCustomField(call.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-white px-4 py-3 text-base font-bold text-zinc-950"
                        >
                          <Plus size={14} />
                          질문 추가
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {customFields.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-5 py-8 text-center">
                            <p className="text-sm font-bold text-zinc-400">
                              아직 추가 질문이 없습니다.
                            </p>
                            <p className="mt-1 text-xs font-medium text-zinc-400">
                              필요할 때만 질문을 추가해 주세요.
                            </p>
                          </div>
                        ) : (
                          customFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="rounded-lg border border-zinc-200 bg-white p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-zinc-700">질문 {index + 1}</p>
                                    <div className="flex flex-wrap gap-2">
                                      <button type="button" aria-label="위로 이동" disabled={index === 0} onClick={() => moveCustomField(call.id, index, -1)} className="inline-flex items-center gap-1 min-h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 disabled:opacity-30">
                                        <ArrowUp size={13} /> 위로
                                      </button>
                                      <button type="button" aria-label="아래로 이동" disabled={index === customFields.length - 1} onClick={() => moveCustomField(call.id, index, 1)} className="inline-flex items-center gap-1 min-h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 disabled:opacity-30">
                                        <ArrowDown size={13} /> 아래로
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateCustomField(call.id, index, "enabled", !field.enabled)
                                        }
                                        className={`inline-flex items-center gap-2 min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${
                                          field.enabled
                                            ? "bg-[#004AAD] text-white"
                                            : "border border-zinc-200 bg-white text-zinc-500"
                                        }`}
                                      >
                                        {field.enabled ? "사용" : "미사용"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateCustomField(call.id, index, "required", !field.required)
                                        }
                                        className={`inline-flex items-center gap-2 min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${
                                          field.required
                                            ? "bg-zinc-900 text-white"
                                            : "border border-zinc-200 bg-white text-zinc-500"
                                        }`}
                                      >
                                        {field.required ? "필수" : "선택"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeCustomField(call.id, index)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-600"
                                      >
                                        <Trash2 size={14} />
                                        삭제
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <label className="block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                      <span className="block text-sm font-semibold text-zinc-700">
                                        질문
                                      </span>
                                      <input
                                        value={field.label || ""}
                                        onChange={(e) =>
                                          updateCustomField(call.id, index, "label", e.target.value)
                                        }
                                        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      />
                                    </label>

                                    <label className="block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                      <span className="block text-sm font-semibold text-zinc-700">
                                        답변 형식
                                      </span>
                                      <select
                                        value={field.type || "text"}
                                        onChange={(e) =>
                                          updateCustomField(call.id, index, "type", e.target.value)
                                        }
                                        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      >
                                        {OPEN_CALL_CUSTOM_FIELD_TYPES.map((type) => (
                                          <option key={type} value={type}>
                                            {getCustomFieldTypeLabel(type)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                      <span className="block text-sm font-semibold text-zinc-700">
                                        입력칸 안내 문구
                                      </span>
                                      <input
                                        value={field.placeholder || ""}
                                        onChange={(e) =>
                                          updateCustomField(
                                            call.id,
                                            index,
                                            "placeholder",
                                            e.target.value
                                          )
                                        }
                                        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      />
                                    </label>

                                  </div>

                                  <label className="mt-3 block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                    <span className="block text-sm font-semibold text-zinc-700">
                                      질문 설명
                                    </span>
                                    <textarea
                                      rows={3}
                                      value={field.description || ""}
                                      onChange={(e) =>
                                        updateCustomField(
                                          call.id,
                                          index,
                                          "description",
                                          e.target.value
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                    />
                                  </label>

                                  {field.type === "select" ? (
                                    <label className="mt-3 block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                      <span className="block text-sm font-semibold text-zinc-700">
                                        선택 옵션 (한 줄에 하나)
                                      </span>
                                      <textarea
                                        rows={4}
                                        value={(field.options || []).join("\n")}
                                        onChange={(e) =>
                                          updateCustomField(
                                            call.id,
                                            index,
                                            "options",
                                            parseCustomFieldOptions(e.target.value)
                                          )
                                        }
                                        placeholder={"회화\n사진\n설치\n영상"}
                                        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                      />
                                    </label>
                                  ) : null}

                                  {["text", "textarea", "url", "email", "phone"].includes(field.type) ? (
                                    <label className="mt-3 block rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3">
                                      <span className="block text-sm font-semibold text-zinc-700">
                                        최대 글자 수 (0은 제한 없음)
                                      </span>
                                      <input type="number" min="0" value={field.maxLength || 0} onChange={(e) => updateCustomField(call.id, index, "maxLength", Math.max(0, Number(e.target.value) || 0))} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#004aad]/20" />
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="order-1 rounded-lg border border-zinc-200 bg-white p-4">
                      <p className="text-base font-bold text-zinc-950">오픈콜 약관</p>
                      <p className="mt-1 text-sm text-zinc-600 break-keep">지원자가 동의하는 내용입니다. 개인정보 수집·이용 안내도 여기에 함께 둡니다. 제출 시점의 약관이 지원서에 함께 남습니다.</p>
                      <label className="mt-3 block text-sm font-semibold text-zinc-900">
                        약관 전문
                        <textarea rows={10} value={draft.termsText || ""} onChange={(event) => updateDraft(call.id, "termsText", event.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-normal leading-relaxed text-zinc-950 outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]" />
                      </label>
                      <label className="mt-4 block text-sm font-semibold text-zinc-900">
                        판매 가능 동의 문구
                        <input value={draft.salesConsentText || ""} onChange={(event) => updateDraft(call.id, "salesConsentText", event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-950 outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]" />
                      </label>
                      <p className="mt-4 text-sm text-zinc-600 break-keep">기본 항목은 고정입니다: 출생연도, 이름, 영어 이름, 활동명(선택), 휴대폰번호, 이메일, 홈페이지 또는 SNS, 기타 사이트(선택), 포트폴리오 파일, 작가소개(선택), 출품작 2~6점(이미지, 작품명, 재료, 세로·가로 cm, 제작연도, 작품가격). 동의 2개를 모두 해야 제출 버튼이 나타납니다.</p>
                    </div>

<p className="order-3 text-sm text-zinc-600 break-keep">접수 완료 화면과 메일·알림톡 문구는 시스템 탭의 메시지 설정에서 관리합니다.</p>
                  <details className="order-4 rounded-lg border border-zinc-200 bg-white px-4">
                    <summary className="cursor-pointer py-3 text-sm font-semibold text-zinc-800">실제 신청서 미리보기</summary>
                    <div className="flex flex-wrap gap-2 pb-3">
                      <button type="button" onClick={() => handleOpenFormWindow(call.id)} className={QUIET_BUTTON}>새 창에서 열기</button>
                      <button type="button" onClick={() => handleCopyFormLink(call.id)} className={QUIET_BUTTON}>링크 복사</button>
                      <button type="button" onClick={handleRefreshFormPreview} className={QUIET_BUTTON}>새로고침</button>
                    </div>
                    <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#f6f4ee]">
                      <OpenCallApplicationForm key={`${call.id}-${formPreviewVersion}`} openCall={previewedOpenCallView} previewMode />
                    </div>
                  </details>
                </div>
                ) : null}

                {activeOpenCallTab === "promotion" ? (
                  <OpenCallStoryMaker
                    call={{ ...call, ...draft }}
                    onGoToBasics={() => {
                      setEditorStep("basics");
                      setActiveOpenCallTab("landing");
                    }}
                  />
                ) : null}

                {activeOpenCallTab === "applications" && selectedOpenCallId === call.id ? (
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
                                  {[app.birthYear && `${app.birthYear}년생`, app.englishName, app.stageName, app.medium].filter(Boolean).join(" · ")} · {formatDate(app.submittedAt)}
                                </p>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      작가 소개
                                    </p>
                                    <p className="max-h-[4.5rem] overflow-hidden whitespace-pre-wrap break-keep text-sm font-bold leading-relaxed text-zinc-600">
                                      {app.artistStatement || "-"}
                                    </p>
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      포트폴리오 · 사이트
                                    </p>
                                    {app.portfolioUrl ? (
                                      <a
                                        href={app.portfolioUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-[#004aad] break-all"
                                      >
                                        포트폴리오 열기
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-zinc-500">-</p>
                                    )}
                                    {[app.snsLink, app.otherLink].filter(Boolean).map((link) => (
                                      <p key={link} className="mt-1 text-sm font-medium text-zinc-700 break-all">{link}</p>
                                    ))}
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4 md:col-span-2">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      출품작 {(app.works || []).filter((work) => work?.imageUrl).length}점
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      {(app.works || []).filter((work) => work?.imageUrl).map((work, index) => (
                                        <a key={work.imageUrl + index} href={work.imageUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3">
                                          <img src={work.imageUrl} alt={work.title || `작품 ${index + 1}`} loading="lazy" className="h-20 w-20 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain" />
                                          <span className="min-w-0 text-sm text-zinc-800 break-keep">
                                            <span className="block font-bold">{work.title || "-"}</span>
                                            <span className="block text-xs">{[work.material, work.size, work.year].filter(Boolean).join(" · ")}</span>
                                            {work.price ? <span className="block text-xs font-semibold">{work.price}</span> : null}
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {getCustomFieldAnswersList(app.customFieldAnswers).length > 0 ? (
                                  <div className="mt-4 rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      추가 입력 답변
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {getCustomFieldAnswersList(app.customFieldAnswers).map((answer) => (
                                        <div
                                          key={`${app.id}-${answer.fieldId}`}
                                          className="rounded-[18px] border border-zinc-100 bg-zinc-50 px-4 py-4"
                                        >
                                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                            {answer.label}
                                          </p>
                                          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                                            {getCustomFieldAnswerDisplayValue(answer)}
                                          </p>
                                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                            {getCustomFieldTypeLabel(answer.type)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
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
                                    value={memoDrafts[app.id] ?? getAdminMemo(app)}
                                    onChange={(e) => handleMemoChange(app.id, e.target.value)}
                                    className="w-full resize-none rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                    placeholder="운영자에게만 보이는 내부 메모를 남겨 주세요."
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

                {previewPage ? <OpenCallPagePreview call={{ ...call, ...draft }} onClose={closePreviewPage} /> : null}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {createDialog ? (
        <OpenCallCreateDialog calls={sortedCalls} initialSourceId={createDialog.sourceId} onCreate={handleCreateOpenCall} onClose={closeCreateDialog} />
      ) : null}
    </section>
  );
};

export default OpenCallManager;

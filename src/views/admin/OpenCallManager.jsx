import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  OPEN_CALL_FALLBACK,
  OPEN_CALL_CUSTOM_FIELD_TYPES,
  OPEN_CALL_TEMPLATE_VARIABLES,
  OPEN_CALL_TITLE,
  createFallbackOpenCall,
  buildFallbackDescriptionSections,
  getOpenCallDisplayStatus,
  parseOpenCallDate,
  normalizeOpenCallCompletionSettings,
  normalizeOpenCallDescriptionSections,
  normalizeOpenCallFormSettings,
  normalizeOpenCallFaqs,
  normalizeOpenCallLandingLabels,
  normalizeOpenCallNotificationSettings,
  renderOpenCallTemplate,
} from "../../constants/openCall";

const STATUS_OPTIONS = ["draft", "open", "closed", "archived"];
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

const STATUS_META = {
  draft: {
    label: "draft",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  open: {
    label: "open",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  closed: {
    label: "closed",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  archived: {
    label: "archived",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

const createDescriptionSectionId = () =>
  `section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyDescriptionSection = (order = 1) => ({
  id: createDescriptionSectionId(),
  title: "새 섹션",
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
  const source =
    Array.isArray(call?.descriptionSections) && call.descriptionSections.length > 0
      ? call.descriptionSections
      : buildFallbackDescriptionSections(call);

  const normalized = normalizeDescriptionSectionDrafts(source);
  return normalized.length > 0 ? normalized : [createEmptyDescriptionSection(1)];
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

const getOpenCallSortTimestamp = (call) => {
  const applicationStartAt = parseOpenCallDate(call?.applicationStartAt);
  if (applicationStartAt) return applicationStartAt.getTime();

  const createdAt = parseOpenCallDate(call?.createdAt);
  if (createdAt) return createdAt.getTime();

  const updatedAt = parseOpenCallDate(call?.updatedAt);
  if (updatedAt) return updatedAt.getTime();

  return 0;
};

const sortByLatestOpenCall = (calls) =>
  [...calls].sort((a, b) => getOpenCallSortTimestamp(b) - getOpenCallSortTimestamp(a));

const pickActiveOpenCall = (calls) => {
  const normalized = (calls || [])
    .map(normalizeCall)
    .filter((call) => call.isVisible !== false && call.status !== "archived");

  if (normalized.length === 0) {
    return createFallbackOpenCall();
  }

  const featuredVisible = normalized.filter((call) => call.isFeatured);
  const featuredActive = featuredVisible.filter((call) => {
    const displayStatus = getOpenCallDisplayStatus(call);
    return displayStatus.key === "open" || displayStatus.key === "upcoming";
  });
  const activeVisible = normalized.filter((call) => {
    const displayStatus = getOpenCallDisplayStatus(call);
    return displayStatus.key === "open" || displayStatus.key === "upcoming";
  });

  const candidatePool =
    featuredActive.length > 0
      ? featuredActive
      : activeVisible.length > 0
      ? activeVisible
      : featuredVisible.length > 0
      ? featuredVisible
      : normalized;

  return sortByLatestOpenCall(candidatePool)[0] || createFallbackOpenCall();
};

const scrollToOpenCallSection = (id) => {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
};

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

const getMultilinePreview = (value) => String(value ?? "").trim() || "비어 있음";

const getWorkValue = (work, key) => getPlainText(work?.[key] || "");

const getOpenCallFileSlug = (call) => {
  const raw = call?.id || call?.slug || OPEN_CALL_FALLBACK.slug;
  return String(raw).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
};

const getOpenCallDraftFormSettings = (draft, call) =>
  normalizeOpenCallFormSettings(
    draft?.formSettings || call?.formSettings || OPEN_CALL_FALLBACK.formSettings
  );

const getOpenCallDraftCompletionSettings = (draft, call) =>
  normalizeOpenCallCompletionSettings(
    draft?.completionSettings ||
      call?.completionSettings ||
      OPEN_CALL_FALLBACK.completionSettings
  );

const getOpenCallDraftNotificationSettings = (draft, call) =>
  normalizeOpenCallNotificationSettings(
    draft?.notificationSettings ||
      call?.notificationSettings ||
      OPEN_CALL_FALLBACK.notificationSettings
  );

const buildOpenCallPreviewContext = (call, draft) => ({
  name: "김언프레임",
  email: "artist@example.com",
  phone: "010-0000-0000",
  openCallTitle: draft?.title || call?.title || OPEN_CALL_TITLE,
  openCallId: call?.id || "open-call-preview",
  applicationId: "preview-application-id",
  submittedAt: "2026-06-17 15:00",
});

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
  text: "text",
  textarea: "textarea",
  url: "url",
  email: "email",
  phone: "phone",
  select: "select",
  checkbox: "checkbox",
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

const OpenCallManager = ({ db, appId, applications }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpenCallId, setSelectedOpenCallId] = useState("");
  const [previewOpenCallId, setPreviewOpenCallId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saveFeedbacks, setSaveFeedbacks] = useState({});
  const [managerNotice, setManagerNotice] = useState("");
  const [reviewSavingMap, setReviewSavingMap] = useState({});
  const [memoDrafts, setMemoDrafts] = useState({});
  const [memoSavingMap, setMemoSavingMap] = useState({});
  const clearTimersRef = useRef({});

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

  useEffect(() => {
    if (sortedCalls.length === 0) {
      setPreviewOpenCallId("");
      return;
    }

    setPreviewOpenCallId((current) =>
      current && sortedCalls.some((call) => call.id === current)
        ? current
        : sortedCalls[0].id
    );
  }, [sortedCalls]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      sortedCalls.forEach((call) => {
        if (!next[call.id]) {
          next[call.id] = {
            title: call.title || "",
            subtitle: call.subtitle || "",
            status: call.status || "draft",
            introText: call.introText || "",
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

  useEffect(() => {
    setMemoDrafts((prev) => {
      const next = { ...prev };
      sortedCalls.forEach((call) => {
        const callApplications = getApplicantItems(applications, call.id);
        callApplications.forEach((app) => {
          if (next[app.id] === undefined) {
            next[app.id] = app.openCallAdminMemo || "";
          }
        });
      });
      return next;
    });
  }, [applications, sortedCalls]);

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

  const updateFormSettingsSection = (callId, sectionKey, key, value) => {
    updateFormSettings(callId, (current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: {
          ...current.sections[sectionKey],
          [key]: value,
        },
      },
    }));
  };

  const updateFormSettingsField = (callId, fieldKey, key, value) => {
    updateFormSettings(callId, (current) => ({
      ...current,
      fields: {
        ...current.fields,
        [fieldKey]: {
          ...current.fields[fieldKey],
          [key]: value,
        },
      },
    }));
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

  const updateCompletionSettings = (callId, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const nextCompletionSettings = normalizeOpenCallCompletionSettings(
        current.completionSettings || OPEN_CALL_FALLBACK.completionSettings
      );

      return {
        ...prev,
        [callId]: {
          ...current,
          completionSettings: {
            ...nextCompletionSettings,
            [key]: value,
          },
        },
      };
    });
  };

  const updateNotificationSettings = (callId, key, value) => {
    setSaveFeedbacks((prev) => ({
      ...prev,
      [callId]: null,
    }));
    setDrafts((prev) => {
      const current = prev[callId] || {};
      const nextNotificationSettings = normalizeOpenCallNotificationSettings(
        current.notificationSettings || OPEN_CALL_FALLBACK.notificationSettings
      );

      return {
        ...prev,
        [callId]: {
          ...current,
          notificationSettings: {
            ...nextNotificationSettings,
            [key]: value,
          },
        },
      };
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
          descriptionSections:
            sections.length > 0 ? sections : [createEmptyDescriptionSection(1)],
        },
      };
    });
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

  const handleSeedDefault = async () => {
    const fallback = createFallbackOpenCall();
    const existing = sortedCalls.find((call) => call.id === fallback.id);
    if (existing) {
      const ok = window.confirm(
        "기본 잔상 공고가 이미 있습니다. 현재 값으로 덮어쓰시겠습니까?"
      );
      if (!ok) return;
    }

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", fallback.id),
        {
          ...fallback,
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSelectedOpenCallId(fallback.id);
      setManagerNotice("기본 잔상 공고가 생성되었습니다.");
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
    const payload = {
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
    };
    const activeCandidate = pickActiveOpenCall(
      sortedCalls.map((item) => (item.id === call.id ? { ...item, ...payload } : item))
    );

    setTimedSaveFeedback(call.id, {
      state: "saving",
      message: "저장 중...",
    });

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", call.id),
        payload,
        { merge: true }
      );
      setTimedSaveFeedback(call.id, {
        state: "saved",
        message:
          activeCandidate?.id === call.id
            ? "저장되었습니다. 현재 대표 공고라면 /opencall에 바로 반영됩니다."
            : "저장되었습니다. 단, 현재 /opencall 대표 공고가 아니므로 사용자 페이지에는 바로 보이지 않을 수 있습니다.",
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

  const getSaveFeedbackClassName = (state) => {
    if (state === "error") return "text-red-600";
    if (state === "saved") return "text-emerald-600";
    return "text-zinc-500";
  };

  const SaveSettingsButton = ({ call, className = "" }) => {
    const feedback = saveFeedbacks[call.id];

    return (
      <button
        type="button"
        onClick={() => handleSave(call)}
        disabled={feedback?.state === "saving"}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <Save size={14} />
        {feedback?.state === "saving" ? "저장 중..." : "설정 저장"}
      </button>
    );
  };

  const SaveStatusRow = ({ call, sticky = false, className = "" }) => {
    const feedback = saveFeedbacks[call.id];
    return (
      <div
        className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
          sticky
            ? "sticky bottom-4 z-20 mt-8 rounded-[24px] border border-zinc-950/10 bg-white/90 p-3 shadow-xl backdrop-blur"
            : "mt-6 border-t border-zinc-950/10 pt-4"
        } ${className}`}
      >
        <p
          className={`text-xs font-bold break-keep whitespace-pre-wrap ${getSaveFeedbackClassName(
            feedback?.state
          )}`}
        >
          {feedback?.message || "오픈콜 설정을 수정한 뒤에는 반드시 저장해 주세요."}
        </p>
        <SaveSettingsButton call={call} className="w-full md:w-auto" />
      </div>
    );
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
    const memo = memoDrafts[app.id] ?? app.openCallAdminMemo ?? "";
    setMemoSavingMap((prev) => ({ ...prev, [app.id]: true }));

    try {
      await updateApplicationDoc(app.id, {
        openCallAdminMemo: memo,
        memoUpdatedAt: serverTimestamp(),
      });
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
    const headers = [
      "공고ID",
      "공고명",
      "심사상태",
      "이름",
      "이메일",
      "연락처",
      "출생연도",
      "주소",
      "상세주소",
      "매체",
      "SNS",
      "작업소개",
      "작품1_제목",
      "작품1_재료",
      "작품1_크기",
      "작품1_제작연도",
      "작품1_이미지URL",
      "작품2_제목",
      "작품2_재료",
      "작품2_크기",
      "작품2_제작연도",
      "작품2_이미지URL",
      "작품3_제목",
      "작품3_재료",
      "작품3_크기",
      "작품3_제작연도",
      "작품3_이미지URL",
      "포트폴리오URL",
      "관리자메모",
      "제출일",
    ];
    const customFieldColumns = buildCustomFieldCsvColumns(call, rows);

    const csvRows = [
      [...headers, ...customFieldColumns.map((column) => column.header)]
        .map(escapeCsv)
        .join(","),
      ...rows.map((app) => {
        const works = Array.isArray(app.works) ? app.works : [];
        const customFieldAnswers = app.customFieldAnswers || {};
        return [
          call.id,
          call.title || OPEN_CALL_FALLBACK.title,
          getOpenCallReviewMeta(app.openCallReviewStatus).label,
          app.name || "",
          app.email || app.applicantEmail || "",
          app.phone || "",
          app.birthYear || "",
          app.addressMain || "",
          app.addressDetail || "",
          app.medium || "",
          app.snsLink || "",
          app.artistStatement || "",
          getWorkValue(works[0], "title"),
          getWorkValue(works[0], "material"),
          getWorkValue(works[0], "size"),
          getWorkValue(works[0], "year"),
          getWorkValue(works[0], "imageUrl"),
          getWorkValue(works[1], "title"),
          getWorkValue(works[1], "material"),
          getWorkValue(works[1], "size"),
          getWorkValue(works[1], "year"),
          getWorkValue(works[1], "imageUrl"),
          getWorkValue(works[2], "title"),
          getWorkValue(works[2], "material"),
          getWorkValue(works[2], "size"),
          getWorkValue(works[2], "year"),
          getWorkValue(works[2], "imageUrl"),
          app.portfolioUrl || "",
          app.openCallAdminMemo || "",
          formatDate(app.submittedAt),
          ...customFieldColumns.map((column) =>
            getCustomFieldCsvValue(customFieldAnswers[column.fieldId])
          ),
        ]
          .map(escapeCsv)
          .join(",");
      }),
    ];

    return "\uFEFF" + csvRows.join("\n");
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

  const handleSetFeaturedOpenCall = async (call) => {
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", call.id),
        {
          isVisible: true,
          isFeatured: true,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
      return;
    }

    try {
      await Promise.all(
        sortedCalls
          .filter((item) => item.id !== call.id && item.isFeatured)
          .map((item) =>
            updateDoc(
              doc(db, "artifacts", appId, "public", "data", "openCalls", item.id),
              {
                isFeatured: false,
                updatedAt: serverTimestamp(),
              }
            )
        )
      );
      setManagerNotice("이 공고가 /opencall 대표 공고로 설정되었습니다.");
    } catch (error) {
      console.error(error);
      setManagerNotice(formatFirestorePermissionMessage(error));
    }
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
  const activeOpenCall = useMemo(() => pickActiveOpenCall(sortedCalls), [sortedCalls]);
  const previewedOpenCall = useMemo(
    () => sortedCalls.find((call) => call.id === previewOpenCallId) || sortedCalls[0] || null,
    [previewOpenCallId, sortedCalls]
  );
  const previewMatchesLanding =
    previewedOpenCall && activeOpenCall ? previewedOpenCall.id === activeOpenCall.id : false;

  return (
    <section className="mb-14 rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
            <Megaphone size={12} />
            Open Call Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">
            오픈콜 관리
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            공고를 생성하고, 공개 상태와 대표 공고 여부를 관리합니다. 지원서는
            대관 예약과 분리된 `applications`에서 필터링합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeedDefault}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#004aad] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#004aad]/15 transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          기본 잔상 공고 생성
        </button>
      </div>

      <div className="mb-5 grid gap-3 rounded-[28px] border border-zinc-100 bg-zinc-50/80 p-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-white bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            현재 편집 중인 openCallId
          </p>
          <p className="mt-2 font-mono text-[12px] font-bold text-zinc-800 break-all">
            {previewedOpenCall?.id || "-"}
          </p>
        </div>

        <div className="rounded-[22px] border border-white bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            현재 /opencall 노출 공고
          </p>
          <p className="mt-2 font-mono text-[12px] font-bold text-zinc-800 break-all">
            {activeOpenCall?.id || "-"}
          </p>
        </div>

        <div className="rounded-[22px] border border-white bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            일치 여부
          </p>
          <p
            className={`mt-2 text-sm font-black ${
              previewMatchesLanding ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {previewMatchesLanding ? "YES" : "NO"}
          </p>
        </div>
      </div>

      {!previewMatchesLanding ? (
        <div className="mb-5 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 break-keep">
          지금 편집 중인 공고와 /opencall에 노출 중인 공고가 다릅니다.
        </div>
      ) : null}

      {managerNotice ? (
        <div className="mb-5 rounded-2xl border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-sm font-bold text-[#004aad] break-keep">
          {managerNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <Loader2 className="mx-auto animate-spin text-[#004aad]" size={24} />
          <p className="mt-3 text-sm font-bold text-zinc-400">
            오픈콜 공고를 불러오는 중입니다...
          </p>
        </div>
      ) : sortedCalls.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-lg font-black text-zinc-900">등록된 오픈콜 공고가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-zinc-400">
            기본 잔상 공고 생성 버튼으로 첫 공고를 만들어 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCalls.map((call) => {
            const draft = drafts[call.id] || {};
            const applicantCount = getApplicantItems(applications, call.id).length;
            const isSelected = selectedOpenCallId === call.id;
            const isPreviewed = previewOpenCallId === call.id;
            const statusMeta = STATUS_META[draft.status || call.status || "draft"];
            const formSettings = getOpenCallDraftFormSettings(draft, call);
            const completionSettings = getOpenCallDraftCompletionSettings(draft, call);
            const notificationSettings = getOpenCallDraftNotificationSettings(draft, call);
            const customFields = normalizeCustomFieldDrafts(formSettings.customFields);
            const faqItems = normalizeFaqDrafts(draft.faqs);
            const previewContext = buildOpenCallPreviewContext(call, draft);
            const previewHeroAccent = String(draft.heroAccent || call.heroAccent || "").trim();
            const previewHeroTitle = draft.heroTitle || call.heroTitle || OPEN_CALL_FALLBACK.heroTitle;
            const previewBadgeText = draft.badgeText || call.badgeText || OPEN_CALL_FALLBACK.badgeText;
            const previewSubtitle = draft.subtitle || call.subtitle || OPEN_CALL_FALLBACK.subtitle;
            const previewIntroText = draft.introText || call.introText || OPEN_CALL_FALLBACK.introText;
            const previewMediumText = draft.mediumText || call.mediumText || OPEN_CALL_FALLBACK.mediumText;
            const previewApplyButtonText =
              draft.applyButtonText || call.applyButtonText || OPEN_CALL_FALLBACK.applyButtonText;
            const previewStatusNoticeText =
              draft.statusNoticeText || call.statusNoticeText || OPEN_CALL_FALLBACK.statusNoticeText;
            const previewLandingLabels = normalizeOpenCallLandingLabels(
              draft.landingLabels || call.landingLabels || OPEN_CALL_FALLBACK.landingLabels
            );
            const previewDescriptionSections = normalizeDescriptionSectionDrafts(
              draft.descriptionSections && draft.descriptionSections.length > 0
                ? draft.descriptionSections
                : call.descriptionSections && call.descriptionSections.length > 0
                ? call.descriptionSections
                : buildFallbackDescriptionSections(call)
            ).filter((section) => section.isVisible !== false && (section.title.trim() || section.body.trim()));
            const heroEditId = `open-call-${call.id}-hero`;
            const descriptionEditId = `open-call-${call.id}-description`;
            const ctaEditId = `open-call-${call.id}-cta`;
            const faqEditId = `open-call-${call.id}-faq`;
            const formEditId = `open-call-${call.id}-form`;
            const completionEditId = `open-call-${call.id}-completion`;
            const notificationEditId = `open-call-${call.id}-notification`;

            return (
              <div
                key={call.id}
                className={`overflow-hidden rounded-[32px] border bg-zinc-50/70 ${
                  isPreviewed ? "border-[#004aad]/25 ring-1 ring-[#004aad]/10" : "border-zinc-100"
                }`}
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            statusMeta?.className || "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {statusMeta?.label || call.status || "draft"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                          {draft.isVisible ?? call.isVisible ? "visible" : "hidden"}
                        </span>
                        {draft.isFeatured ?? call.isFeatured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6e8d00]">
                            대표 공고
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-2xl font-black tracking-tight text-zinc-900 break-keep">
                        {draft.title || call.title || OPEN_CALL_FALLBACK.title}
                      </h4>
                      <p className="mt-2 text-sm font-bold text-zinc-500 break-keep">
                        {draft.subtitle || call.subtitle || OPEN_CALL_FALLBACK.subtitle}
                      </p>
                      <p className="mt-3 font-mono text-[11px] text-zinc-400 break-all">
                        openCallId: {call.id}
                      </p>
                    </div>

                      <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewOpenCallId(call.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                      >
                        <Megaphone size={14} />
                        프리뷰 보기
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOpenCallId(isSelected ? "" : call.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                      >
                        <Users size={14} />
                        지원서 보기 ({applicantCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetFeaturedOpenCall(call)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                      >
                        {(draft.isFeatured ?? call.isFeatured) ? (
                          <Star size={14} className="text-[#AAD004]" />
                        ) : (
                          <StarOff size={14} />
                        )}
                        이 공고를 /opencall 대표 공고로 설정
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-[#004aad]/10 bg-white p-4 md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                          오픈콜 페이지 프리뷰 편집
                        </p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-400 break-keep">
                          실제 /opencall에 보이는 흐름을 기준으로 바로 수정할 수 있습니다.
                          각 버튼은 아래 편집 섹션으로 이동합니다.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(heroEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          상단 제목 [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(descriptionEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          상세 설명 카드 [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(ctaEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          CTA 문구 [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(faqEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          Q&amp;A [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(formEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          신청 입력양식 [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(completionEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          완료 화면 [수정]
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToOpenCallSection(notificationEditId)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                        >
                          알림 설정 [수정]
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[32px] border border-zinc-100 bg-[#fbfaf6] p-5 md:p-6">
                      <div className="flex items-center gap-3 text-[#004AAD]">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6">
                          <Megaphone size={18} />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">
                          OPEN CALL
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004AAD]">
                          {previewBadgeText}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          {statusMeta?.label || call.status || "draft"}
                        </span>
                        {draft.isFeatured ?? call.isFeatured ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e8d00]">
                            대표 공고
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                        <div>
                          <div className="flex flex-wrap items-start gap-3">
                            <h5 className="max-w-3xl text-[2.1rem] font-black tracking-tighter leading-[0.95] text-zinc-900 break-keep md:text-5xl">
                              {previewHeroTitle}
                            </h5>
                            <button
                              type="button"
                              onClick={() => scrollToOpenCallSection(heroEditId)}
                              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                            >
                              공모 제목 [수정]
                            </button>
                          </div>

                          <p className="mt-4 whitespace-pre-line text-lg font-black text-[#004AAD] break-keep">
                            {previewSubtitle}
                          </p>
                          <p className="mt-4 max-w-3xl whitespace-pre-line text-base font-medium leading-relaxed text-zinc-600 break-keep">
                            {previewIntroText}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004AAD]">
                              <span
                                aria-hidden="true"
                                className="inline-block h-2 w-2 rounded-full bg-current"
                              />
                              {previewMediumText}
                            </span>
                            {previewHeroAccent ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e8d00]">
                                <span aria-hidden="true" className="text-[11px] leading-none">
                                  ✦
                                </span>
                                {previewHeroAccent}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => updateDraft(call.id, "heroAccent", "")}
                              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                            >
                              보조 배지 숨기기
                            </button>
                          </div>

                          <div className="mt-5 rounded-[24px] border border-white bg-white/85 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                              상태 안내 문구
                            </p>
                            <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-600 break-keep">
                              {previewStatusNoticeText}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <div className="rounded-[24px] border border-white bg-white/85 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                                READY TO APPLY
                              </p>
                              <button
                                type="button"
                                onClick={() => scrollToOpenCallSection(ctaEditId)}
                                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                              >
                                CTA [수정]
                              </button>
                            </div>
                            <p className="mt-2 text-lg font-black tracking-tight text-zinc-900 break-keep">
                              {previewLandingLabels.readyToApplyLabel}
                            </p>
                            <button
                              type="button"
                              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#004AAD] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
                            >
                              {previewApplyButtonText}
                            </button>
                          </div>

                          <div className="rounded-[24px] border border-white bg-white/85 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                                  {previewLandingLabels.faqEyebrow}
                                </p>
                                <p className="mt-1 text-lg font-black tracking-tight text-zinc-900">
                                  {previewLandingLabels.faqTitle}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => scrollToOpenCallSection(faqEditId)}
                                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                              >
                                Q&amp;A [수정]
                              </button>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                              {previewLandingLabels.faqDescription}
                            </p>
                            <div className="mt-4 space-y-2">
                              {faqItems.slice(0, 2).map((faq, index) => (
                                <div
                                  key={`${call.id}-preview-faq-${index}`}
                                  className="rounded-[18px] border border-zinc-100 bg-zinc-50 px-4 py-3"
                                >
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                                    FAQ {String(index + 1).padStart(2, "0")}
                                  </p>
                                  <p className="mt-2 text-sm font-black text-zinc-900 break-keep">
                                    {faq.question || "질문 없음"}
                                  </p>
                                  <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                                    {faq.answer || "답변 없음"}
                                  </p>
                                </div>
                              ))}
                              {faqItems.length > 2 ? (
                                <p className="text-[11px] font-semibold text-zinc-400">
                                  외 {faqItems.length - 2}개 문항
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {previewDescriptionSections.map((section, index) => (
                          <div
                            key={`${call.id}-preview-section-${section.id || index}`}
                            className="rounded-[24px] border border-white bg-white/90 p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                                상세 설명 카드 {String(index + 1).padStart(2, "0")}
                              </p>
                              {index === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => scrollToOpenCallSection(descriptionEditId)}
                                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                                >
                                  수정
                                </button>
                              ) : null}
                            </div>
                            <h6 className="mt-3 text-base font-black tracking-tight text-zinc-900 break-keep">
                              {section.title}
                            </h6>
                            <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
                              {section.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    id={heroEditId}
                    className="mt-5 rounded-[28px] border border-zinc-100 bg-white p-4 md:p-5"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                          상단 공모 소개
                        </p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-400 break-keep">
                          Hero, 상태 안내, CTA 문구, FAQ 라벨을 한 곳에서 수정합니다. 상세 설명은 아래
                          설명 카드에서만 관리합니다.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div
                      id={ctaEditId}
                      className="rounded-[24px] border border-zinc-100 bg-white p-4"
                    >
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        공모 제목
                      </label>
                      <input
                        value={draft.title || ""}
                        onChange={(e) => updateDraft(call.id, "title", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        공모 부제 / 파란색 제목
                      </label>
                      <input
                        value={draft.subtitle || ""}
                        onChange={(e) => updateDraft(call.id, "subtitle", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        상단 배지 문구
                      </label>
                      <input
                        value={draft.badgeText || ""}
                        onChange={(e) => updateDraft(call.id, "badgeText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        공모 대표 제목
                      </label>
                      <input
                        value={draft.heroTitle || ""}
                        onChange={(e) => updateDraft(call.id, "heroTitle", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        초록색 보조 배지 문구
                      </label>
                      <input
                        value={draft.heroAccent || ""}
                        onChange={(e) => updateDraft(call.id, "heroAccent", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        공모 소개문
                      </label>
                      <textarea
                        rows={4}
                        value={draft.introText || ""}
                        onChange={(e) => updateDraft(call.id, "introText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        매체/대상 안내 pill
                      </label>
                      <textarea
                        rows={4}
                        value={draft.mediumText || ""}
                        onChange={(e) => updateDraft(call.id, "mediumText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        상태 안내 문구
                      </label>
                      <textarea
                        rows={4}
                        value={draft.statusNoticeText || ""}
                        onChange={(e) => updateDraft(call.id, "statusNoticeText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 mb-2">
                        지원 버튼 문구
                      </label>
                      <input
                        value={draft.applyButtonText || ""}
                        onChange={(e) => updateDraft(call.id, "applyButtonText", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4 xl:col-span-2">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                        랜딩 문구 설정
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                            READY TO APPLY 라벨
                          </span>
                          <input
                            value={draft.landingLabels?.readyToApplyLabel || ""}
                            onChange={(e) =>
                              updateLandingLabel(call.id, "readyToApplyLabel", e.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                          />
                        </label>

                        <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                            Q&A 소제목
                          </span>
                          <input
                            value={draft.landingLabels?.faqEyebrow || ""}
                            onChange={(e) =>
                              updateLandingLabel(call.id, "faqEyebrow", e.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                          />
                        </label>

                        <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                            FAQ 제목
                          </span>
                          <input
                            value={draft.landingLabels?.faqTitle || ""}
                            onChange={(e) => updateLandingLabel(call.id, "faqTitle", e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                          />
                        </label>

                        <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                            FAQ 설명
                          </span>
                          <textarea
                            rows={3}
                            value={draft.landingLabels?.faqDescription || ""}
                            onChange={(e) =>
                              updateLandingLabel(call.id, "faqDescription", e.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                          공고 상태
                        </label>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          draft / open / closed / archived
                        </span>
                      </div>
                      <select
                        value={draft.status || "draft"}
                        onChange={(e) => updateDraft(call.id, "status", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-[24px] border border-zinc-100 bg-white p-4 xl:col-span-2">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                              노출 일정
                            </label>
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              datetime-local
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                applicationStartAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.applicationStartAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "applicationStartAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                applicationEndAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.applicationEndAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "applicationEndAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                announcementAt
                              </label>
                              <input
                                type="datetime-local"
                                value={draft.announcementAt || ""}
                                onChange={(e) =>
                                  updateDraft(call.id, "announcementAt", e.target.value)
                                }
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(call.id, "isVisible", !(draft.isVisible ?? call.isVisible))
                              }
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                              draft.isVisible ?? call.isVisible
                                ? "bg-[#004aad] text-white"
                                : "border border-zinc-200 bg-white text-zinc-500"
                            }`}
                          >
                            {draft.isVisible ?? call.isVisible ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                            {draft.isVisible ?? call.isVisible ? "공개 중" : "비공개"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(call.id, "isFeatured", !(draft.isFeatured ?? call.isFeatured))
                            }
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                              draft.isFeatured ?? call.isFeatured
                                ? "bg-[#AAD004] text-white"
                                : "border border-zinc-200 bg-white text-zinc-500"
                            }`}
                          >
                            {(draft.isFeatured ?? call.isFeatured) ? (
                              <BadgeCheck size={14} />
                            ) : (
                              <StarOff size={14} />
                            )}
                            {(draft.isFeatured ?? call.isFeatured) ? "대표 공고" : "일반 공고"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSave(call)}
                            disabled={saveFeedbacks[call.id]?.state === "saving"}
                            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:opacity-60"
                          >
                            <Save size={14} />
                            {saveFeedbacks[call.id]?.state === "saving" ? "저장 중..." : "설정 저장"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        {saveFeedbacks[call.id]?.message ? (
                          <p
                            className={`text-xs font-bold break-keep ${
                              saveFeedbacks[call.id]?.state === "saved"
                                ? "text-emerald-600"
                                : saveFeedbacks[call.id]?.state === "error"
                                ? "text-red-500"
                                : "text-zinc-400"
                            }`}
                          >
                            {saveFeedbacks[call.id].message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      id={completionEditId}
                      className="rounded-[28px] border border-[#004aad]/10 bg-[#004aad]/5 p-4 xl:col-span-2"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                            추가 입력 항목
                          </p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
                            기본 필드는 유지하고, 커스텀 질문은 이곳에서 추가하거나 삭제합니다.
                            저장된 값은 applications 문서의 customFieldAnswers로 함께 보관됩니다.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addCustomField(call.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]"
                        >
                          <Plus size={14} />
                          입력 항목 추가
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {customFields.length === 0 ? (
                          <div className="rounded-[24px] border border-dashed border-zinc-200 bg-white px-5 py-8 text-center">
                            <p className="text-sm font-bold text-zinc-400">
                              아직 추가 입력 항목이 없습니다.
                            </p>
                          </div>
                        ) : (
                          customFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="rounded-[24px] border border-white bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                                      field {index + 1}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateCustomField(call.id, index, "enabled", !field.enabled)
                                        }
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
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
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                          field.required
                                            ? "bg-[#AAD004] text-white"
                                            : "border border-zinc-200 bg-white text-zinc-500"
                                        }`}
                                      >
                                        {field.required ? "필수" : "선택"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeCustomField(call.id, index)}
                                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-600"
                                      >
                                        <Trash2 size={14} />
                                        삭제
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                        label
                                      </span>
                                      <input
                                        value={field.label || ""}
                                        onChange={(e) =>
                                          updateCustomField(call.id, index, "label", e.target.value)
                                        }
                                        className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      />
                                    </label>

                                    <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                        type
                                      </span>
                                      <select
                                        value={field.type || "text"}
                                        onChange={(e) =>
                                          updateCustomField(call.id, index, "type", e.target.value)
                                        }
                                        className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      >
                                        {OPEN_CALL_CUSTOM_FIELD_TYPES.map((type) => (
                                          <option key={type} value={type}>
                                            {getCustomFieldTypeLabel(type)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                        placeholder
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
                                        className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      />
                                    </label>

                                    <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                        order
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={field.order || index + 1}
                                        onChange={(e) =>
                                          updateCustomField(call.id, index, "order", e.target.value)
                                        }
                                        className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                      />
                                    </label>
                                  </div>

                                  <label className="mt-3 block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                      description
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
                                      className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                    />
                                  </label>

                                  {field.type === "select" ? (
                                    <label className="mt-3 block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                        options
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
                                        className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                      />
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <SaveStatusRow call={call} />

                    <div
                      id={formEditId}
                      className="rounded-[28px] border border-[#004aad]/10 bg-[#004aad]/5 p-4 xl:col-span-2"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                            신청 입력양식 설정
                          </p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
                            JoinHome 오픈콜 폼에서 보이는 항목을 조정합니다. 저장 구조는
                            유지되지만, 비활성 항목은 화면과 검증에서 제외됩니다.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                                지원자 정보
                              </p>
                              <p className="mt-1 text-sm font-bold text-zinc-700 break-keep">
                                이름, 연락처, 이메일은 기본값으로 유지됩니다.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                              ["birthYear", "출생연도"],
                              ["address", "주소"],
                              ["medium", "매체"],
                              ["snsLink", "SNS / 웹사이트"],
                            ].map(([fieldKey, label]) => {
                              const field = formSettings.fields[fieldKey];
                              return (
                                <label
                                  key={fieldKey}
                                  className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3"
                                >
                                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                                    {label}
                                  </span>
                                  <div className="mt-2 flex items-center justify-between gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateFormSettingsField(
                                          call.id,
                                          fieldKey,
                                          "enabled",
                                          !field.enabled
                                        )
                                      }
                                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
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
                                        updateFormSettingsField(
                                          call.id,
                                          fieldKey,
                                          "required",
                                          !field.required
                                        )
                                      }
                                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                        field.required
                                          ? "bg-[#AAD004] text-white"
                                          : "border border-zinc-200 bg-white text-zinc-500"
                                      }`}
                                    >
                                      {field.required ? "필수" : "선택"}
                                    </button>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            작품 / 소개 / 포트폴리오
                          </p>

                          <div className="mt-4 grid gap-3">
                            <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-zinc-800">대표 작품</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500 break-keep">
                                      최대 3개까지 노출하고, 필요한 개수만 필수로 설정합니다.
                                    </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFormSettingsSection(
                                      call.id,
                                      "works",
                                      "enabled",
                                      !formSettings.sections.works.enabled
                                    )
                                  }
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                    formSettings.sections.works.enabled
                                      ? "bg-[#004AAD] text-white"
                                      : "border border-zinc-200 bg-white text-zinc-500"
                                  }`}
                                >
                                  {formSettings.sections.works.enabled ? "사용" : "미사용"}
                                </button>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="rounded-[18px] border border-white bg-white px-3 py-3">
                                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                    필수 개수
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={formSettings.sections.works.requiredCount}
                                    onChange={(e) =>
                                      updateFormSettingsSection(
                                        call.id,
                                        "works",
                                        "requiredCount",
                                        e.target.value
                                      )
                                    }
                                    className="mt-2 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                  />
                                </label>

                                <label className="rounded-[18px] border border-white bg-white px-3 py-3">
                                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                    최대 개수
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="3"
                                    value={formSettings.sections.works.maxCount}
                                    onChange={(e) =>
                                      updateFormSettingsSection(
                                        call.id,
                                        "works",
                                        "maxCount",
                                        e.target.value
                                      )
                                    }
                                    className="mt-2 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-zinc-800">작업 소개</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500 break-keep">
                                      최대 글자 수를 조정할 수 있습니다.
                                    </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFormSettingsSection(
                                      call.id,
                                      "statement",
                                      "enabled",
                                      !formSettings.sections.statement.enabled
                                    )
                                  }
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                    formSettings.sections.statement.enabled
                                      ? "bg-[#004AAD] text-white"
                                      : "border border-zinc-200 bg-white text-zinc-500"
                                  }`}
                                >
                                  {formSettings.sections.statement.enabled ? "사용" : "미사용"}
                                </button>
                              </div>

                              <label className="mt-4 block rounded-[18px] border border-white bg-white px-3 py-3">
                                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                  최대 글자 수
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={formSettings.sections.statement.maxLength}
                                  onChange={(e) =>
                                    updateFormSettingsSection(
                                      call.id,
                                      "statement",
                                      "maxLength",
                                      e.target.value
                                    )
                                  }
                                  className="mt-2 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                />
                              </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-zinc-800">포트폴리오</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500 break-keep">
                                      업로드 노출 여부와 필수 여부를 분리합니다.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateFormSettingsSection(
                                        call.id,
                                        "portfolio",
                                        "enabled",
                                        !formSettings.sections.portfolio.enabled
                                      )
                                    }
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                      formSettings.sections.portfolio.enabled
                                        ? "bg-[#004AAD] text-white"
                                        : "border border-zinc-200 bg-white text-zinc-500"
                                    }`}
                                  >
                                    {formSettings.sections.portfolio.enabled ? "사용" : "미사용"}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFormSettingsSection(
                                      call.id,
                                      "portfolio",
                                      "required",
                                      !formSettings.sections.portfolio.required
                                    )
                                  }
                                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                    formSettings.sections.portfolio.required
                                      ? "bg-[#AAD004] text-white"
                                      : "border border-zinc-200 bg-white text-zinc-500"
                                  }`}
                                >
                                  {formSettings.sections.portfolio.required ? "필수" : "선택"}
                                </button>
                              </div>

                              <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-zinc-800">개인정보 동의</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500 break-keep">
                                      동의 섹션 노출 여부와 필수 여부를 조정합니다.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateFormSettingsSection(
                                        call.id,
                                        "privacy",
                                        "enabled",
                                        !formSettings.sections.privacy.enabled
                                      )
                                    }
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                      formSettings.sections.privacy.enabled
                                        ? "bg-[#004AAD] text-white"
                                        : "border border-zinc-200 bg-white text-zinc-500"
                                    }`}
                                  >
                                    {formSettings.sections.privacy.enabled ? "사용" : "미사용"}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFormSettingsSection(
                                      call.id,
                                      "privacy",
                                      "required",
                                      !formSettings.sections.privacy.required
                                    )
                                  }
                                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                    formSettings.sections.privacy.required
                                      ? "bg-[#AAD004] text-white"
                                      : "border border-zinc-200 bg-white text-zinc-500"
                                  }`}
                                >
                                  {formSettings.sections.privacy.required ? "필수" : "선택"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <SaveStatusRow call={call} />

                    <div className="rounded-[28px] border border-[#004aad]/10 bg-[#004aad]/5 p-4 xl:col-span-2">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                            지원 완료 화면 / 알림 설정
                          </p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
                            지원 접수 완료 후에 보이는 문구와, 접수 알림에 사용할 채널 정보를
                            함께 저장합니다. 이메일과 알림톡은 기존 발송 함수를 재사용하고,
                            SMS는 현재 저장만 지원합니다.
                          </p>
                          <p className="mt-3 rounded-[18px] border border-dashed border-[#004aad]/15 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-[#004aad] select-all break-all">
                            사용 가능한 변수: {OPEN_CALL_TEMPLATE_VARIABLES.join(", ")}
                          </p>
                        </div>

                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            지원 완료 화면 설정
                          </p>

                          <div className="mt-4 grid gap-3">
                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                완료 화면 제목
                              </span>
                              <input
                                value={completionSettings.title || ""}
                                onChange={(e) =>
                                  updateCompletionSettings(call.id, "title", e.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </label>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                완료 화면 안내문
                              </span>
                              <textarea
                                rows={3}
                                value={completionSettings.message || ""}
                                onChange={(e) =>
                                  updateCompletionSettings(call.id, "message", e.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                              />
                            </label>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                보조 안내문
                              </span>
                              <textarea
                                rows={3}
                                value={completionSettings.subMessage || ""}
                                onChange={(e) =>
                                  updateCompletionSettings(call.id, "subMessage", e.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                  메인 버튼 문구
                                </span>
                                <input
                                  value={completionSettings.buttonLabel || ""}
                                  onChange={(e) =>
                                    updateCompletionSettings(
                                      call.id,
                                      "buttonLabel",
                                      e.target.value
                                    )
                                  }
                                  className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                />
                              </label>

                              <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                  보조 버튼 문구
                                </span>
                                <input
                                  value={completionSettings.secondaryButtonLabel || ""}
                                  onChange={(e) =>
                                    updateCompletionSettings(
                                      call.id,
                                      "secondaryButtonLabel",
                                      e.target.value
                                    )
                                  }
                                  className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                />
                              </label>
                            </div>

                            <div className="rounded-[24px] border border-[#004aad]/10 bg-[#004aad]/5 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                                완료 화면 미리보기
                              </p>
                              <div className="mt-3 space-y-3 rounded-[20px] border border-white bg-white p-4">
                                <div>
                                  <p className="text-lg font-black text-zinc-900 break-keep">
                                    {getMultilinePreview(
                                      renderOpenCallTemplate(
                                        completionSettings.title,
                                        previewContext
                                      )
                                    )}
                                  </p>
                                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                                    {getMultilinePreview(
                                      renderOpenCallTemplate(
                                        completionSettings.message,
                                        previewContext
                                      )
                                    )}
                                  </p>
                                  <p className="mt-2 whitespace-pre-line text-xs font-semibold leading-relaxed text-zinc-400 break-keep">
                                    {getMultilinePreview(
                                      renderOpenCallTemplate(
                                        completionSettings.subMessage,
                                        previewContext
                                      )
                                    )}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                    {getMultilinePreview(
                                      renderOpenCallTemplate(
                                        completionSettings.buttonLabel,
                                        previewContext
                                      )
                                    )}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]">
                                    {getMultilinePreview(
                                      renderOpenCallTemplate(
                                        completionSettings.secondaryButtonLabel,
                                        previewContext
                                      )
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          id={notificationEditId}
                          className="rounded-[24px] border border-white bg-white p-4 shadow-sm"
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            접수 알림 설정
                          </p>

                          <div className="mt-4 grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {[
                                ["applicantEmailEnabled", "지원자 메일"],
                                ["adminEmailEnabled", "운영자 메일"],
                                ["kakaoEnabled", "알림톡"],
                                ["smsEnabled", "SMS"],
                              ].map(([key, label]) => {
                                const enabled = notificationSettings[key];
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() =>
                                      updateNotificationSettings(call.id, key, !enabled)
                                    }
                                    className={`inline-flex items-center justify-center gap-2 rounded-[20px] border px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                                      enabled
                                        ? "bg-[#004aad] text-white border-[#004aad]"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-500"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            <p className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
                              이메일은 기존 발송 함수가 지원자/운영자 메일을 함께 보냅니다.
                              SMS는 현재 별도 발송 체계가 없어 설정만 저장됩니다.
                            </p>
                            <p className="rounded-[18px] border border-dashed border-[#004aad]/15 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-[#004aad] select-all break-all">
                              사용 가능한 변수: {OPEN_CALL_TEMPLATE_VARIABLES.join(", ")}
                            </p>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                지원자 메일 제목
                              </span>
                              <input
                                value={notificationSettings.applicantEmailSubject || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "applicantEmailSubject",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </label>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                지원자 메일 본문
                              </span>
                              <textarea
                                rows={3}
                                value={notificationSettings.applicantEmailBody || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "applicantEmailBody",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                />
                              </label>

                            <div className="rounded-[24px] border border-[#004aad]/10 bg-[#004aad]/5 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                                지원자 이메일 미리보기
                              </p>
                              <div className="mt-3 rounded-[20px] border border-white bg-white p-4">
                                <p className="text-sm font-black text-zinc-900 break-keep">
                                  {getMultilinePreview(
                                    renderOpenCallTemplate(
                                      notificationSettings.applicantEmailSubject,
                                      previewContext
                                    )
                                  )}
                                </p>
                                <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                                  {getMultilinePreview(
                                    renderOpenCallTemplate(
                                      notificationSettings.applicantEmailBody,
                                      previewContext
                                    )
                                  )}
                                </p>
                              </div>
                            </div>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                운영자 메일 제목
                              </span>
                              <input
                                value={notificationSettings.adminEmailSubject || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "adminEmailSubject",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                              />
                            </label>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                운영자 메일 본문
                              </span>
                              <textarea
                                rows={3}
                                value={notificationSettings.adminEmailBody || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "adminEmailBody",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                />
                              </label>

                            <div className="rounded-[24px] border border-[#004aad]/10 bg-[#004aad]/5 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                                관리자 이메일 미리보기
                              </p>
                              <div className="mt-3 rounded-[20px] border border-white bg-white p-4">
                                <p className="text-sm font-black text-zinc-900 break-keep">
                                  {getMultilinePreview(
                                    renderOpenCallTemplate(
                                      notificationSettings.adminEmailSubject,
                                      previewContext
                                    )
                                  )}
                                </p>
                                <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                                  {getMultilinePreview(
                                    renderOpenCallTemplate(
                                      notificationSettings.adminEmailBody,
                                      previewContext
                                    )
                                  )}
                                </p>
                              </div>
                            </div>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                알림톡 문구
                              </span>
                              <textarea
                                rows={3}
                                value={notificationSettings.kakaoMessage || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "kakaoMessage",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                />
                              </label>

                            <div className="rounded-[24px] border border-[#004aad]/10 bg-[#004aad]/5 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                                알림톡 미리보기
                              </p>
                              <div className="mt-3 rounded-[20px] border border-white bg-white p-4">
                                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                                  {getMultilinePreview(
                                    renderOpenCallTemplate(
                                      notificationSettings.kakaoMessage,
                                      previewContext
                                    )
                                  )}
                                </p>
                              </div>
                            </div>

                            <label className="block rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                SMS 문구
                              </span>
                              <textarea
                                rows={3}
                                value={notificationSettings.smsMessage || ""}
                                onChange={(e) =>
                                  updateNotificationSettings(
                                    call.id,
                                    "smsMessage",
                                    e.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                />
                              </label>

                            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                                SMS 미리보기
                              </p>
                              <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                                {getMultilinePreview(
                                  renderOpenCallTemplate(
                                    notificationSettings.smsMessage,
                                    previewContext
                                  )
                                )}
                              </p>
                              <p className="mt-2 text-[11px] font-semibold leading-relaxed text-zinc-400 break-keep">
                                현재는 저장만 되고 실제 발송은 하지 않습니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <SaveStatusRow call={call} />

                    <div
                      id={faqEditId}
                      className="rounded-[28px] border border-[#AAD004]/15 bg-[#AAD004]/5 p-4 xl:col-span-2"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6e8d00]">
                            Q&amp;A 설정
                          </p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
                            오픈콜별로 자주 묻는 질문과 답변을 편집합니다. 질문과 답변이 모두
                            비어 있는 항목은 저장되지 않습니다.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addFaqItem(call.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e8d00]"
                        >
                          <Plus size={14} />
                          Q&amp;A 추가
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {faqItems.map((faq, index) => (
                          <div
                            key={`${call.id}-faq-${index}`}
                            className="rounded-[24px] border border-white bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                  <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    질문
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateFaqItem(call.id, index, "isVisible", !faq.isVisible)
                                    }
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                      faq.isVisible
                                        ? "bg-[#004AAD] text-white"
                                        : "border border-zinc-200 bg-white text-zinc-500"
                                    }`}
                                  >
                                    {faq.isVisible ? "노출" : "숨김"}
                                  </button>
                                </div>
                                <input
                                  value={faq.question || ""}
                                  onChange={(e) =>
                                    updateFaqItem(call.id, index, "question", e.target.value)
                                  }
                                  className="mt-2 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                  placeholder="질문을 입력해 주세요"
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-[120px_auto] lg:min-w-[18rem] lg:max-w-[18rem]">
                                <label className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    순서
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={faq.order ?? index + 1}
                                    onChange={(e) =>
                                      updateFaqItem(call.id, index, "order", e.target.value)
                                    }
                                    className="mt-2 w-full rounded-2xl border border-zinc-100 bg-white px-3 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => removeFaqItem(call.id, index)}
                                  className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-600"
                                >
                                  <Trash2 size={14} />
                                  삭제
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                답변
                              </label>
                              <textarea
                                rows={4}
                                value={faq.answer || ""}
                                onChange={(e) =>
                                  updateFaqItem(call.id, index, "answer", e.target.value)
                                }
                                placeholder="답변을 입력해 주세요"
                                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <SaveStatusRow call={call} />

                    <div
                      id={descriptionEditId}
                      className="rounded-[28px] border border-zinc-100 bg-white p-4 xl:col-span-2"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            상세 설명 카드
                          </p>
                          <p className="mt-1 text-xs font-bold text-zinc-400">
                            섹션 추가와 삭제로 공고 설명을 구성합니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addDescriptionSection(call.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]"
                        >
                          <Plus size={14} />
                          섹션 추가
                        </button>
                      </div>

                      <div className="space-y-3">
                        {normalizeDescriptionSectionDrafts(draft.descriptionSections).map(
                          (section, index) => {
                            return (
                              <div
                                key={section.id || `${call.id}-section-${index}`}
                                className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-4"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="flex-1">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                          섹션 제목
                                        </label>
                                        <input
                                          value={section.title || ""}
                                          onChange={(e) =>
                                            updateDescriptionSection(
                                              call.id,
                                              index,
                                              "title",
                                              e.target.value
                                            )
                                          }
                                          className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                        />
                                      </div>

                                      <div className="sm:w-28">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                          순서
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={section.order || index + 1}
                                          onChange={(e) =>
                                            updateDescriptionSection(
                                              call.id,
                                              index,
                                              "order",
                                              e.target.value
                                            )
                                          }
                                          className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateDescriptionSection(
                                            call.id,
                                            index,
                                            "isVisible",
                                            section.isVisible === false
                                          )
                                        }
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                                          section.isVisible === false
                                            ? "border border-zinc-200 bg-white text-zinc-500"
                                            : "bg-[#004aad] text-white"
                                        }`}
                                      >
                                        {section.isVisible === false
                                          ? "숨김"
                                          : "사용자 화면에 노출"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removeDescriptionSection(call.id, index)}
                                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"
                                      >
                                        <Plus size={14} className="rotate-45" />
                                        섹션 삭제
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    섹션 본문
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={section.body || ""}
                                    onChange={(e) =>
                                      updateDescriptionSection(
                                        call.id,
                                        index,
                                        "body",
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white resize-none"
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                <SaveStatusRow call={call} sticky />

                {isSelected ? (
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
                                  {app.medium || "-"} · {formatDate(app.submittedAt)}
                                </p>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      작업 소개
                                    </p>
                                    <p className="max-h-[4.5rem] overflow-hidden whitespace-pre-wrap break-keep text-sm font-bold leading-relaxed text-zinc-600">
                                      {app.artistStatement || "-"}
                                    </p>
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      포트폴리오 링크
                                    </p>
                                    {app.portfolioUrl ? (
                                      <a
                                        href={app.portfolioUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-[#004aad] break-all"
                                      >
                                        {app.portfolioUrl}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-zinc-500">-</p>
                                    )}
                                  </div>

                                  <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-4 md:col-span-2">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                                      대표 작품 1
                                    </p>
                                    {app.works?.[0]?.imageUrl ? (
                                      <a
                                        href={app.works[0].imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3"
                                      >
                                        <img
                                          src={app.works[0].imageUrl}
                                          alt="대표 작품 1 썸네일"
                                          className="h-16 w-16 rounded-2xl border border-zinc-100 bg-zinc-50 object-cover"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold text-zinc-700 break-keep">
                                            {app.works[0].title || "이미지 보기"}
                                          </p>
                                          <p className="text-xs font-bold text-zinc-400 break-all">
                                            {app.works[0].imageUrl}
                                          </p>
                                        </div>
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-zinc-500">-</p>
                                    )}
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
                                    value={memoDrafts[app.id] ?? app.openCallAdminMemo ?? ""}
                                    onChange={(e) => handleMemoChange(app.id, e.target.value)}
                                    className="w-full resize-none rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
                                    placeholder="지원자에게만 보이는 내부 메모를 남겨 주세요."
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
              </div></div></div></div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OpenCallManager;

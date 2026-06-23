import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  MessageSquareText,
  Save,
  Sparkles,
} from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  OPEN_CALL_FALLBACK,
  OPEN_CALL_TEMPLATE_VARIABLES,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  normalizeOpenCallCompletionSettings,
  normalizeOpenCallNotificationSettings,
  pickActiveOpenCall,
  renderOpenCallTemplate,
} from "../../constants/openCall";

const DEFAULT_PREVIEW_CONTEXT = {
  name: "홍길동",
  email: "artist@example.com",
  phone: "010-1234-5678",
  openCallTitle: OPEN_CALL_FALLBACK.title,
  openCallId: OPEN_CALL_FALLBACK.id,
  applicationId: "application_test_001",
  submittedAt: "2026-06-23 12:00",
};

const formatDateTime = (value) => {
  if (!value) return "-";

  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
};

const isFirestorePermissionError = (error) => {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  );
};

const getCurrentLoginEmail = (currentUser) => currentUser?.email?.trim() || "-";

const getErrorMessage = (error, currentUser) => {
  if (isFirestorePermissionError(error)) {
    return [
      "Firestore 권한 오류입니다. openCalls rules가 추가되었는지 확인해 주세요.",
      `현재 로그인 이메일: ${getCurrentLoginEmail(currentUser)}`,
      "Firebase Console > Firestore Rules에 openCalls 권한이 필요합니다.",
    ].join("\n");
  }

  return "오픈콜 메시지 설정을 저장하는 중 오류가 발생했습니다.";
};

const normalizeCall = (call) =>
  createFallbackOpenCall({
    ...call,
    id: call?.id || OPEN_CALL_FALLBACK.id,
  });

const getTemplatePreview = (template, context) =>
  renderOpenCallTemplate(template || "", context).trim() || "비어 있음";

const SectionCard = ({ eyebrow, title, description, children, className = "" }) => (
  <section
    className={`rounded-[30px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6 ${className}`}
  >
    {eyebrow ? (
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004aad]">
        {eyebrow}
      </p>
    ) : null}
    {title ? (
      <h4 className="mt-2 text-xl font-black tracking-tight text-zinc-900">{title}</h4>
    ) : null}
    {description ? (
      <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
        {description}
      </p>
    ) : null}
    <div className="mt-4">{children}</div>
  </section>
);

const FieldBlock = ({
  label,
  value,
  onChange,
  placeholder = "",
  textarea = false,
  rows = 3,
  hint = "",
}) => (
  <label className="block rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3">
    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
      {label}
    </span>
    {hint ? (
      <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
        {hint}
      </p>
    ) : null}
    {textarea ? (
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full resize-none rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
      />
    )}
  </label>
);

const ToggleButton = ({ label, checked, onChange, hint = "" }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex min-h-[72px] items-start justify-between gap-4 rounded-[22px] border px-4 py-3 text-left transition-all ${
      checked
        ? "border-[#004aad] bg-[#004aad] text-white shadow-sm"
        : "border-zinc-200 bg-white text-zinc-600 hover:border-[#004aad]/25 hover:text-[#004aad]"
    }`}
  >
    <span>
      <span className="block text-[10px] font-black uppercase tracking-[0.18em]">
        {label}
      </span>
      {hint ? (
        <span
          className={`mt-1 block text-xs font-bold leading-relaxed break-keep ${
            checked ? "text-white/80" : "text-zinc-500"
          }`}
        >
          {hint}
        </span>
      ) : null}
    </span>
    {checked ? <Eye size={16} className="shrink-0" /> : <EyeOff size={16} className="shrink-0" />}
  </button>
);

const PreviewBlock = ({ title, body, muted = false }) => (
  <div
    className={`rounded-[24px] border p-4 ${
      muted ? "border-zinc-200 bg-zinc-50" : "border-white bg-white"
    }`}
  >
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
      {title}
    </p>
    <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
      {body}
    </p>
  </div>
);

const OpenCallMessageSettingsManager = ({ db, appId, currentUser }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpenCallId, setSelectedOpenCallId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [managerNotice, setManagerNotice] = useState("");
  const clearTimerRef = useRef(null);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", "openCalls");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setOpenCalls(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
        setManagerNotice(getErrorMessage(error, currentUser));
      }
    );

    return () => unsubscribe();
  }, [appId, currentUser, db]);

  useEffect(
    () => () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    },
    []
  );

  const sortedCalls = useMemo(
    () =>
      [...openCalls]
        .sort(
          (a, b) =>
            (b.updatedAt?.seconds || b.createdAt?.seconds || 0) -
            (a.updatedAt?.seconds || a.createdAt?.seconds || 0)
        )
        .map(normalizeCall),
    [openCalls]
  );

  const activeOpenCall = useMemo(() => pickActiveOpenCall(openCalls), [openCalls]);
  const activeOpenCallId = activeOpenCall?.id || "";

  useEffect(() => {
    if (sortedCalls.length === 0) {
      setSelectedOpenCallId("");
      return;
    }

    setSelectedOpenCallId((current) =>
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
            completionSettings: normalizeOpenCallCompletionSettings(call.completionSettings),
            notificationSettings: normalizeOpenCallNotificationSettings(
              call.notificationSettings
            ),
          };
        }
      });

      return next;
    });
  }, [sortedCalls]);

  const selectedOpenCall = useMemo(
    () => sortedCalls.find((call) => call.id === selectedOpenCallId) || null,
    [selectedOpenCallId, sortedCalls]
  );
  const selectedDraft = selectedOpenCall ? drafts[selectedOpenCall.id] || {} : {};
  const completionSettings = useMemo(
    () =>
      normalizeOpenCallCompletionSettings(
        selectedDraft.completionSettings || selectedOpenCall?.completionSettings
      ),
    [selectedDraft.completionSettings, selectedOpenCall?.completionSettings]
  );
  const notificationSettings = useMemo(
    () =>
      normalizeOpenCallNotificationSettings(
        selectedDraft.notificationSettings || selectedOpenCall?.notificationSettings
      ),
    [selectedDraft.notificationSettings, selectedOpenCall?.notificationSettings]
  );

  const previewContext = useMemo(
    () => ({
      ...DEFAULT_PREVIEW_CONTEXT,
      openCallTitle: selectedOpenCall?.title || OPEN_CALL_FALLBACK.title,
      openCallId: selectedOpenCall?.id || OPEN_CALL_FALLBACK.id,
      submittedAt: formatDateTime(new Date()),
    }),
    [selectedOpenCall?.id, selectedOpenCall?.title]
  );

  const setTimedNotice = (message) => {
    setManagerNotice(message);

    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }

    clearTimerRef.current = setTimeout(() => {
      setManagerNotice("");
      clearTimerRef.current = null;
    }, 2500);
  };

  const updateCompletionSetting = (key, value) => {
    if (!selectedOpenCall) return;

    setDrafts((prev) => ({
      ...prev,
      [selectedOpenCall.id]: {
        ...(prev[selectedOpenCall.id] || {}),
        completionSettings: {
          ...completionSettings,
          [key]: value,
        },
      },
    }));
  };

  const updateNotificationSetting = (key, value) => {
    if (!selectedOpenCall) return;

    setDrafts((prev) => ({
      ...prev,
      [selectedOpenCall.id]: {
        ...(prev[selectedOpenCall.id] || {}),
        notificationSettings: {
          ...notificationSettings,
          [key]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedOpenCall) return;

    const payload = {
      id: selectedOpenCall.id,
      trackType: "open-call",
      completionSettings: normalizeOpenCallCompletionSettings(completionSettings),
      notificationSettings: normalizeOpenCallNotificationSettings(notificationSettings),
      createdAt: selectedOpenCall.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    setSaving(true);

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "openCalls", selectedOpenCall.id),
        payload,
        { merge: true }
      );

      setDrafts((prev) => ({
        ...prev,
        [selectedOpenCall.id]: {
          completionSettings: payload.completionSettings,
          notificationSettings: payload.notificationSettings,
        },
      }));
      setTimedNotice("오픈콜 메시지 설정이 저장되었습니다.");
    } catch (error) {
      console.error(error);
      setManagerNotice(getErrorMessage(error, currentUser));
    } finally {
      setSaving(false);
    }
  };

  const displayStatus = selectedOpenCall
    ? getOpenCallDisplayStatus(selectedOpenCall)
    : { key: "none", label: "-", canApply: false };

  const selectedCallOptions = sortedCalls.map((call) => {
    const pieces = [
      call.title || call.id,
      call.id,
      call.isFeatured ? "대표" : "",
      call.isVisible === false ? "비공개" : "공개",
      getOpenCallDisplayStatus(call).label,
    ].filter(Boolean);

    return { id: call.id, label: pieces.join(" · ") };
  });

  if (loading) {
    return (
      <section className="rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
        <div className="flex items-center gap-3 text-zinc-500">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-sm font-bold">오픈콜 메시지 설정을 불러오는 중입니다...</p>
        </div>
      </section>
    );
  }

  if (sortedCalls.length === 0) {
    return (
      <section className="rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
        <div className="rounded-[32px] border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            Open Call Messages
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-zinc-900">
            아직 등록된 오픈콜 공고가 없습니다
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
            오픈콜 공고가 생성되면 여기에서 완료 화면과 접수 알림 메시지를 공고별로 관리할 수
            있습니다.
          </p>
        </div>
      </section>
    );
  }

  const isActiveOpenCall = selectedOpenCall?.id === activeOpenCallId;
  const completionPreview = (
    <div className="space-y-3">
      <PreviewBlock
        title="완료 화면 미리보기"
        body={[
          getTemplatePreview(completionSettings.title, previewContext),
          getTemplatePreview(completionSettings.message, previewContext),
          getTemplatePreview(completionSettings.subMessage, previewContext),
        ].join("\n\n")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewBlock
          title="메인 버튼"
          body={getTemplatePreview(completionSettings.buttonLabel, previewContext)}
        />
        <PreviewBlock
          title="보조 버튼"
          body={getTemplatePreview(
            completionSettings.secondaryButtonLabel,
            previewContext
          )}
        />
      </div>
    </div>
  );

  const notificationPreview = (
    <div className="space-y-3">
      <PreviewBlock
        title="지원자 메일 미리보기"
        body={[
          getTemplatePreview(notificationSettings.applicantEmailSubject, previewContext),
          getTemplatePreview(notificationSettings.applicantEmailBody, previewContext),
        ].join("\n\n")}
      />
      <PreviewBlock
        title="운영자 메일 미리보기"
        body={[
          getTemplatePreview(notificationSettings.adminEmailSubject, previewContext),
          getTemplatePreview(notificationSettings.adminEmailBody, previewContext),
        ].join("\n\n")}
      />
      <PreviewBlock
        title="알림톡 미리보기"
        body={getTemplatePreview(notificationSettings.kakaoMessage, previewContext)}
      />
      <PreviewBlock
        title="SMS 미리보기"
        body={getTemplatePreview(notificationSettings.smsMessage, previewContext)}
        muted={!notificationSettings.smsEnabled}
      />
    </div>
  );

  return (
    <section className="rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004aad]">
            Open Call System
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            오픈콜 접수 완료 / 알림 메시지
          </h3>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-zinc-500 break-keep">
            오픈콜 지원 완료 후 보여줄 완료 화면과 접수 메일, 운영자 알림, 알림톡 문구를
            관리합니다. 테스트 발송 전에 실제 문구를 먼저 확인해 주세요.
          </p>
        </div>

        <div className="rounded-full border border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          {selectedOpenCall?.id || "-"}
        </div>
      </div>

      {managerNotice ? (
        <div className="mt-5 rounded-[24px] border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-sm font-bold leading-relaxed text-[#004aad] whitespace-pre-wrap break-keep">
          {managerNotice}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="현재 메시지 설정 대상 공고"
          title={selectedOpenCall?.title || "-"}
          description="공고별로 완료 화면과 알림 메시지를 따로 저장합니다. 전역 설정으로 옮기지 않고, 선택한 공고 문서에 그대로 기록합니다."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3 xl:col-span-3">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                메시지를 편집할 공고
              </span>
              <select
                value={selectedOpenCall?.id || ""}
                onChange={(e) => setSelectedOpenCallId(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
              >
                {selectedCallOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                공고명
              </p>
              <p className="mt-2 text-sm font-black text-zinc-900 break-keep">
                {selectedOpenCall?.title || "-"}
              </p>
            </div>
            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                openCallId
              </p>
              <p className="mt-2 break-all text-sm font-black text-zinc-900">
                {selectedOpenCall?.id || "-"}
              </p>
            </div>
            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                대표 공고 여부
              </p>
              <p className="mt-2 text-sm font-black text-zinc-900">
                {selectedOpenCall?.isFeatured ? "YES" : "NO"}
              </p>
            </div>
            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                공개 여부
              </p>
              <p className="mt-2 text-sm font-black text-zinc-900">
                {selectedOpenCall?.isVisible === false ? "비공개" : "공개"}
              </p>
            </div>
            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                접수 상태
              </p>
              <p className="mt-2 text-sm font-black text-zinc-900">{displayStatus.label}</p>
            </div>
            <div className="rounded-[22px] border border-zinc-100 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                마지막 수정
              </p>
              <p className="mt-2 text-sm font-black text-zinc-900">
                {formatDateTime(selectedOpenCall?.updatedAt || selectedOpenCall?.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-dashed border-[#004aad]/15 bg-[#004aad]/5 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
              사용 가능한 변수
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#004aad] select-all break-all">
              {OPEN_CALL_TEMPLATE_VARIABLES.join(", ")}
            </p>
          </div>

          <div className="mt-4 rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            {isActiveOpenCall
              ? "현재 선택한 공고는 /opencall 대표 공고와 일치합니다. 이 설정이 실제 외부 페이지 흐름에 반영됩니다."
              : "현재 선택한 공고는 /opencall 대표 공고와 다를 수 있습니다. 메시지 수정은 가능하지만, 외부 페이지 반영 여부는 별도로 확인해 주세요."}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="저장"
          title="선택한 공고에 메시지 저장"
          description="문구를 수정한 뒤 저장 버튼을 눌러 Firestore의 기존 openCalls/{openCallId} 문서에 반영합니다."
        >
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
              <Sparkles size={12} />
              Completion Settings
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]">
              <MessageSquareText size={12} />
              Notification Settings
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedOpenCall}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "저장 중..." : "저장하기"}
          </button>

          <div className="mt-4 rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
            이메일과 알림톡 템플릿은 기존 발송 함수와 동일한 변수 치환 방식을 사용합니다.
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="지원 완료 화면 설정"
          title="완료 화면"
          description="지원자가 제출을 끝낸 뒤 바로 보는 메시지입니다."
        >
          <div className="grid gap-3">
            <FieldBlock
              label="완료 화면 제목"
              value={completionSettings.title || ""}
              onChange={(value) => updateCompletionSetting("title", value)}
              placeholder="지원이 완료되었습니다."
            />
            <FieldBlock
              label="완료 화면 안내문"
              value={completionSettings.message || ""}
              onChange={(value) => updateCompletionSetting("message", value)}
              textarea
              rows={3}
              placeholder="{{name}} 작가님, {{openCallTitle}} 지원이 접수되었습니다."
            />
            <FieldBlock
              label="보조 안내문"
              value={completionSettings.subMessage || ""}
              onChange={(value) => updateCompletionSetting("subMessage", value)}
              textarea
              rows={4}
              placeholder="접수 일시: {{submittedAt}}"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock
                label="메인 버튼 문구"
                value={completionSettings.buttonLabel || ""}
                onChange={(value) => updateCompletionSetting("buttonLabel", value)}
                placeholder="메인으로 돌아가기"
              />
              <FieldBlock
                label="보조 버튼 문구"
                value={completionSettings.secondaryButtonLabel || ""}
                onChange={(value) =>
                  updateCompletionSetting("secondaryButtonLabel", value)
                }
                placeholder="오픈콜 다시 보기"
              />
            </div>
            {completionPreview}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="접수 알림 설정"
          title="메일 / 알림톡 / SMS"
          description="지원자 메일, 운영자 메일, 알림톡, SMS 문구를 공고별로 관리합니다."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleButton
              label="지원자 메일"
              checked={notificationSettings.applicantEmailEnabled}
              onChange={(value) => updateNotificationSetting("applicantEmailEnabled", value)}
              hint="접수 완료 메일"
            />
            <ToggleButton
              label="운영자 메일"
              checked={notificationSettings.adminEmailEnabled}
              onChange={(value) => updateNotificationSetting("adminEmailEnabled", value)}
              hint="관리자 수신 메일"
            />
            <ToggleButton
              label="알림톡"
              checked={notificationSettings.kakaoEnabled}
              onChange={(value) => updateNotificationSetting("kakaoEnabled", value)}
              hint="카카오 정보성 메시지"
            />
            <ToggleButton
              label="SMS"
              checked={notificationSettings.smsEnabled}
              onChange={(value) => updateNotificationSetting("smsEnabled", value)}
              hint="현재 저장만 지원"
            />
          </div>

          <div className="mt-4 rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
            지원자 메일과 운영자 메일은 기존 발송 함수가 공유하는 payload 구조를 그대로 사용합니다.
          </div>

          <div className="mt-4 grid gap-3">
            <FieldBlock
              label="지원자 메일 제목"
              value={notificationSettings.applicantEmailSubject || ""}
              onChange={(value) => updateNotificationSetting("applicantEmailSubject", value)}
              placeholder="[UNFRAME] {{openCallTitle}} 지원이 접수되었습니다."
            />
            <FieldBlock
              label="지원자 메일 본문"
              value={notificationSettings.applicantEmailBody || ""}
              onChange={(value) => updateNotificationSetting("applicantEmailBody", value)}
              textarea
              rows={4}
              placeholder="{{name}} 작가님, 안녕하세요."
            />
            <FieldBlock
              label="운영자 메일 제목"
              value={notificationSettings.adminEmailSubject || ""}
              onChange={(value) => updateNotificationSetting("adminEmailSubject", value)}
              placeholder="[UNFRAME JOIN] 새 오픈콜 지원서가 접수되었습니다."
            />
            <FieldBlock
              label="운영자 메일 본문"
              value={notificationSettings.adminEmailBody || ""}
              onChange={(value) => updateNotificationSetting("adminEmailBody", value)}
              textarea
              rows={4}
              placeholder="{{openCallTitle}}에 새 지원서가 접수되었습니다."
            />
            <FieldBlock
              label="알림톡 문구"
              value={notificationSettings.kakaoMessage || ""}
              onChange={(value) => updateNotificationSetting("kakaoMessage", value)}
              textarea
              rows={3}
              placeholder="{{name}} 작가님, {{openCallTitle}} 지원이 정상적으로 접수되었습니다."
            />
            <FieldBlock
              label="SMS 문구"
              value={notificationSettings.smsMessage || ""}
              onChange={(value) => updateNotificationSetting("smsMessage", value)}
              textarea
              rows={3}
              placeholder="{{name}} 작가님, {{openCallTitle}} 지원이 접수되었습니다."
            />
          </div>

          <div className="mt-4 space-y-3">{notificationPreview}</div>
        </SectionCard>
      </div>

      <div className="mt-6 rounded-[24px] border border-dashed border-[#004aad]/20 bg-[#004aad]/5 px-4 py-4 text-sm font-bold leading-relaxed text-[#004aad] break-keep">
        테스트 발송은 상단의 시스템 도구와 함께 확인하면 좋습니다. 실제 접수 흐름은 기존
        <code className="px-1 font-mono text-[11px] text-[#004aad]">openCalls/{selectedOpenCall?.id || "openCallId"}</code>{" "}
        저장 구조와 발송 함수를 그대로 사용합니다.
      </div>
    </section>
  );
};

export default OpenCallMessageSettingsManager;

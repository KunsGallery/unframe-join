import React, { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  DEFAULT_JOIN_HOME_CONTENT,
  mergeJoinHomeContent,
} from "../../constants/joinHome";

const getCurrentLoginEmail = (currentUser) => currentUser?.email?.trim() || "-";

const isFirestorePermissionError = (error) => {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  );
};

const getJoinHomeErrorMessage = (error, currentUser) => {
  if (isFirestorePermissionError(error)) {
    return [
      "Firestore 권한 오류입니다. joinHome rules가 추가되었는지 확인해 주세요.",
      `현재 로그인 이메일: ${getCurrentLoginEmail(currentUser)}`,
      "Firebase Console > Firestore Rules에 joinHome / joinTracks / joinPopups 권한이 추가되어야 합니다.",
    ].join("\n");
  }

  return "메인 문구를 저장하는 중 오류가 발생했습니다.";
};

const FieldBlock = ({
  label,
  value,
  onChange,
  placeholder = "",
  textarea = false,
  rows = 3,
  hint = "",
  className = "",
}) => (
  <label className={`block rounded-[22px] border border-zinc-100 bg-white px-4 py-3 ${className}`}>
    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
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
        className="mt-3 w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#004aad]/20 focus:bg-white"
      />
    )}
  </label>
);

const JoinHomePreview = ({ content }) => (
  <div className="rounded-[32px] border border-[#004aad]/12 bg-[#004aad]/5 p-5 md:p-6">
    <div className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
      <Sparkles size={11} />
      JoinHome Preview
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[28px] border border-white/80 bg-white p-5 md:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-zinc-400">
          {content.heroBadgeText ?? DEFAULT_JOIN_HOME_CONTENT.heroBadgeText}
        </p>
        <h3 className="mt-4 whitespace-pre-line text-[2rem] font-black leading-[0.94] tracking-tighter text-zinc-950 break-keep md:text-[2.8rem]">
          {content.heroTitle ?? DEFAULT_JOIN_HOME_CONTENT.heroTitle}
        </h3>
        <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-700 break-keep md:text-base">
          {content.heroDescription ?? DEFAULT_JOIN_HOME_CONTENT.heroDescription}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/85 px-3 py-1.5">
            {content.heroPrimaryChip ?? DEFAULT_JOIN_HOME_CONTENT.heroPrimaryChip}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
            {content.heroSecondaryChip ?? DEFAULT_JOIN_HOME_CONTENT.heroSecondaryChip}
          </span>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white p-5 md:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
          {content.brandNoteLabel ?? DEFAULT_JOIN_HOME_CONTENT.brandNoteLabel}
        </p>
        <p className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-keep">
          {content.brandNoteTitle ?? DEFAULT_JOIN_HOME_CONTENT.brandNoteTitle}
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#6f8f00]">
          {content.brandNoteLiveLabel ?? DEFAULT_JOIN_HOME_CONTENT.brandNoteLiveLabel}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              {content.entryCardLabel ?? DEFAULT_JOIN_HOME_CONTENT.entryCardLabel}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
              {content.entryCardText ?? DEFAULT_JOIN_HOME_CONTENT.entryCardText}
            </p>
          </div>

          <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              {content.noticeCardLabel ?? DEFAULT_JOIN_HOME_CONTENT.noticeCardLabel}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
              {content.noticeCardText ?? DEFAULT_JOIN_HOME_CONTENT.noticeCardText}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const JoinHomeContentManager = ({ db, appId, currentUser }) => {
  const [contentDraft, setContentDraft] = useState(DEFAULT_JOIN_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [managerNotice, setManagerNotice] = useState("");

  useEffect(() => {
    const ref = doc(db, "artifacts", appId, "public", "data", "joinHome", "settings");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setContentDraft(DEFAULT_JOIN_HOME_CONTENT);
        } else {
          setContentDraft(mergeJoinHomeContent(snapshot.data()));
        }
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setContentDraft(DEFAULT_JOIN_HOME_CONTENT);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  const updateField = (key, value) => {
    setManagerNotice("");
    setContentDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setManagerNotice("");

    const payload = {
      ...DEFAULT_JOIN_HOME_CONTENT,
      ...contentDraft,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "joinHome", "settings"),
        payload,
        { merge: true }
      );

      setManagerNotice("메인 문구가 저장되었습니다.");
    } catch (error) {
      console.error(error);
      setManagerNotice(getJoinHomeErrorMessage(error, currentUser));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-14 rounded-[40px] border border-zinc-100 bg-white p-6 shadow-xl md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#004aad]/15 bg-[#004aad]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
            <Sparkles size={12} />
            JoinHome Content Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-900">
            메인 문구 관리
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500 break-keep">
            JoinHome 상단 히어로와 브랜드 노트를 관리합니다. 줄바꿈은 실제 화면에 그대로
            반영됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "저장 중..." : "문구 저장"}
        </button>
      </div>

      {managerNotice ? (
        <div className="mt-5 rounded-2xl border border-[#004aad]/15 bg-[#004aad]/5 px-4 py-3 text-sm font-bold leading-relaxed text-[#004aad] whitespace-pre-wrap break-keep">
          {managerNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <Loader2 className="mx-auto animate-spin text-[#004aad]" size={24} />
          <p className="mt-3 text-sm font-bold text-zinc-400">
            joinHome/settings를 불러오는 중입니다...
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <FieldBlock
              label="heroBadgeText"
              value={contentDraft.heroBadgeText || ""}
              onChange={(value) => updateField("heroBadgeText", value)}
              placeholder="UNFRAME JOIN"
            />
            <FieldBlock
              label="heroTitle"
              value={contentDraft.heroTitle || ""}
              onChange={(value) => updateField("heroTitle", value)}
              placeholder={"하나의 방식으로만\n연결되지 않습니다."}
              textarea
              rows={3}
            />
            <FieldBlock
              label="heroDescription"
              value={contentDraft.heroDescription || ""}
              onChange={(value) => updateField("heroDescription", value)}
              placeholder={"공간을 제안할 수도...\n각 트랙은..."}
              textarea
              rows={4}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                label="heroPrimaryChip"
                value={contentDraft.heroPrimaryChip || ""}
                onChange={(value) => updateField("heroPrimaryChip", value)}
                placeholder="입구 선택"
              />
              <FieldBlock
                label="heroSecondaryChip"
                value={contentDraft.heroSecondaryChip || ""}
                onChange={(value) => updateField("heroSecondaryChip", value)}
                placeholder="LIVE TRACKS"
              />
            </div>
            <FieldBlock
              label="brandNoteLabel"
              value={contentDraft.brandNoteLabel || ""}
              onChange={(value) => updateField("brandNoteLabel", value)}
              placeholder="BRAND NOTE"
            />
            <FieldBlock
              label="brandNoteTitle"
              value={contentDraft.brandNoteTitle || ""}
              onChange={(value) => updateField("brandNoteTitle", value)}
              placeholder="UNFRAME의 입구는 하나가 아닙니다."
              textarea
              rows={2}
            />
            <FieldBlock
              label="brandNoteLiveLabel"
              value={contentDraft.brandNoteLiveLabel || ""}
              onChange={(value) => updateField("brandNoteLiveLabel", value)}
              placeholder="LIVE"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                label="entryCardLabel"
                value={contentDraft.entryCardLabel || ""}
                onChange={(value) => updateField("entryCardLabel", value)}
                placeholder="ENTRY"
              />
              <FieldBlock
                label="noticeCardLabel"
                value={contentDraft.noticeCardLabel || ""}
                onChange={(value) => updateField("noticeCardLabel", value)}
                placeholder="NOTICE"
              />
            </div>
            <FieldBlock
              label="entryCardText"
              value={contentDraft.entryCardText || ""}
              onChange={(value) => updateField("entryCardText", value)}
              placeholder={"신청 트랙은 살아 있고,\n필요한 입구만 선택하면 됩니다."}
              textarea
              rows={3}
            />
            <FieldBlock
              label="noticeCardText"
              value={contentDraft.noticeCardText || ""}
              onChange={(value) => updateField("noticeCardText", value)}
              placeholder={"현재 노출 중인 공지와 대표 프로젝트는\n아래 영역에서 이어집니다."}
              textarea
              rows={3}
            />
          </div>

          <JoinHomePreview content={contentDraft} />
        </div>
      )}
    </section>
  );
};

export default JoinHomeContentManager;

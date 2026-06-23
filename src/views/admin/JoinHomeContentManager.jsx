import React, { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  DEFAULT_JOIN_HOME_CONTENT,
  normalizeJoinHomeContent,
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

const isVisibleText = (value) => typeof value === "string" && value.trim().length > 0;

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

const ToggleBlock = ({ label, checked, onChange, hint = "", className = "" }) => (
  <label
    className={`flex items-start justify-between gap-4 rounded-[22px] border border-zinc-100 bg-white px-4 py-3 ${className}`}
  >
    <div>
      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
        {label}
      </span>
      {hint ? (
        <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 break-keep">
          {hint}
        </p>
      ) : null}
    </div>

    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 rounded border-zinc-300 text-[#004aad] focus:ring-[#004aad]"
    />
  </label>
);

const JoinHomePreview = ({ content }) => {
  const previewCountLabel = isVisibleText(content.activeTrackCountLabelTemplate)
    ? content.activeTrackCountLabelTemplate.replace(/\{\{\s*count\s*\}\}/g, "4")
    : "";

  return (
    <div className="rounded-[32px] border border-[#004aad]/12 bg-[#004aad]/5 p-5 md:p-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
        <Sparkles size={11} />
        JoinHome Preview
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-[28px] border border-white/80 bg-white p-5 md:p-6">
          {isVisibleText(content.heroBadgeText) ? (
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-zinc-400">
              {content.heroBadgeText}
            </p>
          ) : null}

          {isVisibleText(content.heroTitle) ? (
            <h3 className="mt-4 whitespace-pre-line text-[2rem] font-black leading-[0.94] tracking-tighter text-zinc-950 break-keep md:text-[2.8rem]">
              {content.heroTitle}
            </h3>
          ) : null}

          {isVisibleText(content.heroDescription) ? (
            <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-700 break-keep md:text-base">
              {content.heroDescription}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            {isVisibleText(content.heroPrimaryChip) ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/85 px-3 py-1.5">
                {content.heroPrimaryChip}
              </span>
            ) : null}
            {isVisibleText(content.heroSecondaryChip) ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
                {content.heroSecondaryChip}
              </span>
            ) : null}
          </div>
        </div>

        {content.brandNoteEnabled ? (
          <div className="rounded-[28px] border border-white/80 bg-white p-5 md:p-6">
            {isVisibleText(content.brandNoteLabel) ? (
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                {content.brandNoteLabel}
              </p>
            ) : null}

            {isVisibleText(content.brandNoteTitle) ? (
              <p className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-keep">
                {content.brandNoteTitle}
              </p>
            ) : null}

            {isVisibleText(content.brandNoteLiveLabel) ? (
              <div className="mt-4 inline-flex rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#6f8f00]">
                {content.brandNoteLiveLabel}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {isVisibleText(content.brandNoteLeftLabel) ||
              isVisibleText(content.brandNoteLeftText) ? (
                <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
                  {isVisibleText(content.brandNoteLeftLabel) ? (
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      {content.brandNoteLeftLabel}
                    </p>
                  ) : null}
                  {isVisibleText(content.brandNoteLeftText) ? (
                    <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                      {content.brandNoteLeftText}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isVisibleText(content.brandNoteRightLabel) ||
              isVisibleText(content.brandNoteRightText) ? (
                <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
                  {isVisibleText(content.brandNoteRightLabel) ? (
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      {content.brandNoteRightLabel}
                    </p>
                  ) : null}
                  {isVisibleText(content.brandNoteRightText) ? (
                    <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                      {content.brandNoteRightText}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white p-5 text-sm font-bold text-zinc-400">
            Brand Note 블록이 숨김 상태입니다.
          </div>
        )}

        {content.waysToJoinEnabled ? (
          <div className="rounded-[28px] border border-white/80 bg-white p-5 md:p-6">
            {isVisibleText(content.waysToJoinEyebrow) ? (
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                {content.waysToJoinEyebrow}
              </p>
            ) : null}
            {isVisibleText(content.waysToJoinTitle) ? (
              <h4 className="mt-2 text-lg font-black tracking-tight text-zinc-950 break-keep">
                {content.waysToJoinTitle}
              </h4>
            ) : null}
            {isVisibleText(content.waysToJoinDescription) ? (
              <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
                {content.waysToJoinDescription}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-zinc-950/10 bg-white/80 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          {content.activeTrackCountEnabled && previewCountLabel ? (
            <span>{previewCountLabel}</span>
          ) : null}
          {isVisibleText(content.trackMetaNote) ? (
            <span className="text-zinc-400">{content.trackMetaNote}</span>
          ) : null}
          {content.footerNoteEnabled && isVisibleText(content.footerNoteText) ? (
            <span className="text-zinc-400">{content.footerNoteText}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

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
      ...normalizeJoinHomeContent(contentDraft),
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
            JoinHome의 외부 노출 문구를 관리합니다. 섹션 노출 여부와 라벨, 버튼 문구, 보조
            안내는 여기서 바로 바꿀 수 있습니다. 줄바꿈은 실제 화면에 그대로 반영됩니다.
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
            <ToggleBlock
              label="brandNoteEnabled"
              checked={contentDraft.brandNoteEnabled !== false}
              onChange={(value) => updateField("brandNoteEnabled", value)}
              hint="끄면 JoinHome에서 Brand Note 블록 전체가 숨겨집니다."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                label="brandNoteLeftLabel"
                value={contentDraft.brandNoteLeftLabel || ""}
                onChange={(value) => updateField("brandNoteLeftLabel", value)}
                placeholder="NOW OPEN"
              />
              <FieldBlock
                label="brandNoteRightLabel"
                value={contentDraft.brandNoteRightLabel || ""}
                onChange={(value) => updateField("brandNoteRightLabel", value)}
                placeholder="FEATURED"
              />
            </div>
            <FieldBlock
              label="brandNoteLeftText"
              value={contentDraft.brandNoteLeftText || ""}
              onChange={(value) => updateField("brandNoteLeftText", value)}
              placeholder={"현재 신청 가능한 항목을\n한눈에 볼 수 있습니다."}
              textarea
              rows={3}
            />
            <FieldBlock
              label="brandNoteRightText"
              value={contentDraft.brandNoteRightText || ""}
              onChange={(value) => updateField("brandNoteRightText", value)}
              placeholder={"대표 공고의 주요 내용을\n아래에서 먼저 확인하세요."}
              textarea
              rows={3}
            />

            <ToggleBlock
              label="waysToJoinEnabled"
              checked={contentDraft.waysToJoinEnabled !== false}
              onChange={(value) => updateField("waysToJoinEnabled", value)}
              hint="끄면 Ways to Join 섹션을 숨기고, 더 간결한 첫 화면으로 보여줄 수 있습니다."
            />
            <FieldBlock
              label="waysToJoinEyebrow"
              value={contentDraft.waysToJoinEyebrow || ""}
              onChange={(value) => updateField("waysToJoinEyebrow", value)}
              placeholder="WAYS TO JOIN"
            />
            <FieldBlock
              label="waysToJoinTitle"
              value={contentDraft.waysToJoinTitle || ""}
              onChange={(value) => updateField("waysToJoinTitle", value)}
              placeholder="필요한 방식에 맞는 입구를 선택해 주세요."
              textarea
              rows={2}
            />
            <FieldBlock
              label="waysToJoinDescription"
              value={contentDraft.waysToJoinDescription || ""}
              onChange={(value) => updateField("waysToJoinDescription", value)}
              placeholder="선택 기준이나 추가 안내가 있으면 여기에 적습니다."
              textarea
              rows={3}
            />

            <ToggleBlock
              label="activeTrackCountEnabled"
              checked={contentDraft.activeTrackCountEnabled !== false}
              onChange={(value) => updateField("activeTrackCountEnabled", value)}
              hint="끄면 하단의 활성 트랙 수 문구를 숨깁니다."
            />
            <FieldBlock
              label="activeTrackCountLabelTemplate"
              value={contentDraft.activeTrackCountLabelTemplate || ""}
              onChange={(value) => updateField("activeTrackCountLabelTemplate", value)}
              placeholder="활성 트랙 {{count}}개"
            />
            <FieldBlock
              label="trackMetaNote"
              value={contentDraft.trackMetaNote || ""}
              onChange={(value) => updateField("trackMetaNote", value)}
              placeholder="관리자 설정에 따라 입구가 달라집니다"
              textarea
              rows={2}
            />

            <FieldBlock
              label="currentProgramLabel"
              value={contentDraft.currentProgramLabel || ""}
              onChange={(value) => updateField("currentProgramLabel", value)}
              placeholder="CURRENT PROGRAM"
            />
            <FieldBlock
              label="preparedProgramLabel"
              value={contentDraft.preparedProgramLabel || ""}
              onChange={(value) => updateField("preparedProgramLabel", value)}
              placeholder="PREPARING"
            />
            <FieldBlock
              label="featuredProgramLabel"
              value={contentDraft.featuredProgramLabel || ""}
              onChange={(value) => updateField("featuredProgramLabel", value)}
              placeholder="FEATURED"
            />
            <FieldBlock
              label="featuredProjectsLabel"
              value={contentDraft.featuredProjectsLabel || ""}
              onChange={(value) => updateField("featuredProjectsLabel", value)}
              placeholder="FEATURED PROJECTS"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                label="auxiliaryEntryPointsLabel"
                value={contentDraft.auxiliaryEntryPointsLabel || ""}
                onChange={(value) => updateField("auxiliaryEntryPointsLabel", value)}
                placeholder="AUXILIARY ENTRY POINTS"
              />
              <FieldBlock
                label="auxiliaryEntryPointsSubLabel"
                value={contentDraft.auxiliaryEntryPointsSubLabel || ""}
                onChange={(value) => updateField("auxiliaryEntryPointsSubLabel", value)}
                placeholder="MORE THAN FOUR TRACKS"
              />
            </div>

            <ToggleBlock
              label="footerNoteEnabled"
              checked={contentDraft.footerNoteEnabled === true}
              onChange={(value) => updateField("footerNoteEnabled", value)}
              hint="하단 보조 문구가 필요할 때만 켭니다."
            />
            <FieldBlock
              label="footerNoteText"
              value={contentDraft.footerNoteText || ""}
              onChange={(value) => updateField("footerNoteText", value)}
              placeholder="원하면 여기에 추가 안내를 넣을 수 있습니다."
              textarea
              rows={2}
            />
          </div>

          <JoinHomePreview content={contentDraft} />
        </div>
      )}
    </section>
  );
};

export default JoinHomeContentManager;

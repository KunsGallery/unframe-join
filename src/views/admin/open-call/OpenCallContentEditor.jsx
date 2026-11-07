import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Check, Copy, Eye, EyeOff, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { getOpenCallTheme, parseThemeKeywords, suggestThemeKeywords } from "../../open-call/openCallView";
import { readPosterPalette } from "./posterColor";
import { getOpenCallChecklist, getOpenCallDateProblem, moveListItem } from "./openCallEditorModel";

const INPUT = "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";
const TEXTAREA = `${INPUT} py-2.5 leading-relaxed`;
const QUIET_BUTTON = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40";
const ICON_BUTTON = "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30";

const OPEN_CALL_EDITOR_STEPS = [
  { id: "basics", label: "기본 정보" },
  { id: "content", label: "소개·요강" },
  { id: "stages", label: "진행 단계" },
  { id: "faq", label: "자주 묻는 질문" },
  { id: "publish", label: "공개 설정" },
];

const PUBLICATION_CHOICES = {
  private: { label: "비공개", description: "외부에 보이지 않습니다. 작성 중에는 이 상태로 두세요." },
  featured: { label: "공개", description: "/opencall에 이 공고를 표시합니다. 다른 공고는 대표에서 내려갑니다." },
  public: { label: "공개 (대표 아님)", description: "공개 상태지만 /opencall에 표시되지 않을 수 있습니다." },
  archived: { label: "마감", description: "공고는 볼 수 있지만 더 이상 지원을 받지 않습니다." },
};

const Field = ({ label, hint, required, children }) => (
  <label className="block min-w-0">
    <span className="block text-sm font-semibold text-zinc-900">
      {label}
      {required ? <span className="ml-1 font-normal text-zinc-500">필수</span> : null}
    </span>
    {hint ? <span className="mt-0.5 block text-sm leading-relaxed text-zinc-600 break-keep">{hint}</span> : null}
    <span className="mt-1.5 block">{children}</span>
  </label>
);

const Group = ({ title, children }) => (
  <fieldset className="min-w-0 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
    {title ? <legend className="float-left mb-4 w-full text-base font-bold text-zinc-950">{title}</legend> : null}
    <div className="clear-both space-y-5">{children}</div>
  </fieldset>
);

const ACCENT_PRESETS = ["#004AAD", "#AAD004", "#C2410C", "#151413"];

const FaceGroup = ({ draft, onChange, onPosterUpload, posterUploading, posterError }) => {
  const theme = getOpenCallTheme(draft.accentColor);
  const [palette, setPalette] = useState({ url: "", colors: [] });
  const posterColors = palette.url === draft.posterUrl ? palette.colors : [];
  const suggested = suggestThemeKeywords(draft);
  const hasWrittenKeywords = parseThemeKeywords(draft.themeKeyword).length > 0;

  useEffect(() => {
    if (!draft.posterUrl) return undefined;
    let stale = false;
    readPosterPalette(draft.posterUrl)
      .then((colors) => {
        if (!stale) setPalette({ url: draft.posterUrl, colors });
      })
      .catch((error) => console.error(error));
    return () => {
      stale = true;
    };
  }, [draft.posterUrl]);

  return (
    <Group title="공고의 얼굴">
      <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <span className="block text-sm font-semibold text-zinc-900">포스터</span>
          <label className="mt-1.5 flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-400 bg-zinc-50 text-center text-sm font-semibold text-zinc-700 focus-within:ring-1 focus-within:ring-[#004aad]">
            {draft.posterUrl ? (
              <img src={draft.posterUrl} alt="포스터 미리보기" className="h-full w-full object-contain" />
            ) : posterUploading ? (
              <Loader2 size={20} className="animate-spin" aria-label="올리는 중" />
            ) : (
              <span className="inline-flex items-center gap-1.5"><Upload size={16} />이미지 올리기</span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onPosterUpload(file); }} />
          </label>
          {draft.posterUrl ? <button type="button" className="mt-2 min-h-10 text-sm font-semibold text-zinc-700 underline underline-offset-2" onClick={() => onChange("posterUrl", "")}>포스터 빼기</button> : null}
          {posterError ? <p role="alert" className="mt-1 text-sm font-medium text-red-700">{posterError}</p> : null}
        </div>
        <div className="space-y-5">
          <div>
            <span className="block text-sm font-semibold text-zinc-900">포인트 색</span>
            <span className="mt-0.5 block text-sm text-zinc-600 break-keep">포스터를 올리면 그림에서 색을 뽑아 자동으로 적용합니다. 다른 색으로 바꿀 수도 있고, 글자색과 연한 바탕색은 읽기 좋게 맞춰집니다.</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(posterColors.length > 0 ? posterColors : ACCENT_PRESETS).map((color) => (
                <button key={color} type="button" aria-label={`${color} 선택`} aria-pressed={theme.accent === color} onClick={() => onChange("accentColor", color)} style={{ background: color }} className={`h-11 w-11 rounded-lg border-2 ${theme.accent === color ? "border-zinc-950 ring-2 ring-white ring-inset" : "border-transparent"}`} />
              ))}
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700">
                <input type="color" className="h-6 w-6 cursor-pointer" value={theme.accent} onChange={(event) => onChange("accentColor", event.target.value.toUpperCase())} />
                직접 고르기
              </label>
            </div>
            {posterColors.length > 0 ? <p className="mt-2 text-sm text-zinc-600">위 색은 지금 포스터에서 뽑았습니다.</p> : null}
            <p className="mt-3 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-bold" style={{ background: theme.accent, color: theme.on }}>이렇게 보입니다 · {theme.accent}</p>
          </div>
          <div>
            <Field label="주제어" hint="공개 페이지에 크게 나오고, 쉼표로 나누면 한 단어씩 번갈아 나옵니다. 비워 두면 본문에서 뽑은 단어가 자동으로 나옵니다."><input className={INPUT} placeholder={suggested.join(", ") || "예: 연말, 선물, 파티"} value={draft.themeKeyword || ""} onChange={(event) => onChange("themeKeyword", event.target.value)} /></Field>
            {suggested.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-700">
                <span>{hasWrittenKeywords ? "본문 추천" : "지금 자동으로 나오는 단어"}: {suggested.join(", ")}</span>
                <button type="button" className="min-h-10 font-semibold text-[#004aad] underline underline-offset-2" onClick={() => onChange("themeKeyword", suggested.join(", "))}>이 단어를 넣고 고치기</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Group>
  );
};

const BasicsStep = ({ draft, onChange, onPosterUpload, posterUploading, posterError }) => {
  const text = (key) => ({ value: draft[key] || "", onChange: (event) => onChange(key, event.target.value) });
  const dateProblem = getOpenCallDateProblem(draft);

  return (
    <div className="space-y-7">
      <Group>
        <Field label="공고명" required hint="목록, 신청서, 알림 메일에 쓰입니다."><input className={INPUT} placeholder="예: 2027 UNFRAME OPEN CALL 02" {...text("title")} /></Field>
        <Field label="부제" hint="제목 아래 한 줄로 표시됩니다."><input className={INPUT} {...text("subtitle")} /></Field>
        <Field label="첫 화면 제목" hint="비우면 공고명을 그대로 씁니다."><input className={INPUT} {...text("heroTitle")} /></Field>
      </Group>

      <FaceGroup draft={draft} onChange={onChange} onPosterUpload={onPosterUpload} posterUploading={posterUploading} posterError={posterError} />

      <Group title="접수 일정">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="접수 시작"><input type="datetime-local" className={INPUT} {...text("applicationStartAt")} /></Field>
          <Field label="접수 마감" required><input type="datetime-local" className={INPUT} {...text("applicationEndAt")} /></Field>
          <Field label="결과 발표"><input type="datetime-local" className={INPUT} {...text("announcementAt")} /></Field>
        </div>
        {dateProblem ? (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{dateProblem}</p>
        ) : null}
      </Group>

      <Group title="지원 버튼">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="버튼 문구"><input className={INPUT} placeholder="지원하기" {...text("applyButtonText")} /></Field>
          <Field label="접수 중 안내 문구" hint="버튼 옆에 표시됩니다."><input className={INPUT} {...text("statusNoticeText")} /></Field>
        </div>
      </Group>
    </div>
  );
};

const ContentStep = ({ draft, onChange }) => {
  const text = (key) => ({ value: draft[key] || "", onChange: (event) => onChange(key, event.target.value) });
  const items = Array.isArray(draft.requirementItems) ? draft.requirementItems : [];
  const setItems = (next) => onChange("requirementItems", next);
  const setItem = (index, key, value) => setItems(items.map((item, position) => (position === index ? { ...item, [key]: value } : item)));

  return (
    <div className="space-y-7">
      <Group>
        <Field label="공고 소개" required hint="이번 공모를 소개하는 글입니다. 문단은 빈 줄로 나눕니다.">
          <textarea rows={8} className={TEXTAREA} {...text("introText")} />
        </Field>
      </Group>

      <Group title="모집 요강">
        <p className="text-sm text-zinc-600 break-keep">지원 대상, 제출 자료처럼 칸으로 보여 줄 내용을 추가하세요. 칸이 없으면 이 영역은 나타나지 않습니다.</p>
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-950">요강 {index + 1}</p>
              <div className="flex gap-2">
                <button type="button" className={ICON_BUTTON} aria-label="위로 이동" disabled={index === 0} onClick={() => setItems(moveListItem(items, index, -1))}><ArrowUp size={16} /></button>
                <button type="button" className={ICON_BUTTON} aria-label="아래로 이동" disabled={index === items.length - 1} onClick={() => setItems(moveListItem(items, index, 1))}><ArrowDown size={16} /></button>
                <button type="button" className={ICON_BUTTON} aria-label={`요강 ${index + 1} 삭제`} onClick={() => setItems(items.filter((_, position) => position !== index))}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="제목"><input className={INPUT} placeholder="예: 지원 대상" value={item.title || ""} onChange={(event) => setItem(index, "title", event.target.value)} /></Field>
              <Field label="내용"><textarea rows={3} className={TEXTAREA} value={item.body || ""} onChange={(event) => setItem(index, "body", event.target.value)} /></Field>
            </div>
          </div>
        ))}
        <button type="button" className={QUIET_BUTTON} onClick={() => setItems([...items, { title: "", body: "" }])}><Plus size={16} />요강 칸 추가</button>
      </Group>

      <Group title="모집 안내">
        <Field label="대상 매체" hint="지원에서 전시까지 항목 옆에 표시됩니다."><textarea rows={2} className={TEXTAREA} {...text("mediumText")} /></Field>
        <Field label="확인해 주세요" hint="모집 요강 끝에 강조해서 표시됩니다."><textarea rows={3} className={TEXTAREA} {...text("eligibilityText")} /></Field>
      </Group>

      <Group title="선정되면 함께하는 일">
        <Field label="선정 혜택"><textarea rows={3} className={TEXTAREA} {...text("benefitText")} /></Field>
        <Field label="추가 기회" hint="매거진 인터뷰처럼 선정과 별개로 안내할 내용을 적습니다."><textarea rows={3} className={TEXTAREA} {...text("magazineText")} /></Field>
      </Group>
    </div>
  );
};

const RowControls = ({ index, count, hidden, onMove, onToggle, onRemove, removeLabel }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button type="button" className={ICON_BUTTON} aria-label="위로 이동" disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp size={16} /></button>
    <button type="button" className={ICON_BUTTON} aria-label="아래로 이동" disabled={index === count - 1} onClick={() => onMove(index, 1)}><ArrowDown size={16} /></button>
    <button type="button" className={QUIET_BUTTON} aria-pressed={hidden} onClick={() => onToggle(index)}>
      {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
      {hidden ? "숨김" : "표시"}
    </button>
    <button type="button" className={ICON_BUTTON} aria-label={removeLabel} onClick={() => onRemove(index)}><Trash2 size={16} /></button>
  </div>
);

const StagesStep = ({ list, onChange, onAdd, onRemove, onMove }) => (
  <div className="space-y-4">
    <p className="text-sm leading-relaxed text-zinc-600 break-keep">공개 페이지의 "지원에서 전시까지"에 순서대로 표시됩니다. 표시할 단계가 없으면 이 영역은 나타나지 않습니다.</p>
    {list.map((section, index) => (
      <div key={section.id} className={`rounded-lg border border-zinc-200 p-4 ${section.isVisible === false ? "bg-zinc-50" : "bg-white"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-zinc-950">{index + 1}단계</p>
          <RowControls index={index} count={list.length} hidden={section.isVisible === false} onMove={onMove} onToggle={(i) => onChange(i, "isVisible", section.isVisible === false)} onRemove={onRemove} removeLabel={`${index + 1}단계 삭제`} />
        </div>
        <div className="space-y-4">
          <Field label="단계 이름"><input className={INPUT} placeholder="예: 1차 심사" value={section.title} onChange={(event) => onChange(index, "title", event.target.value)} /></Field>
          <Field label="설명"><textarea rows={3} className={TEXTAREA} value={section.body} onChange={(event) => onChange(index, "body", event.target.value)} /></Field>
        </div>
      </div>
    ))}
    <button type="button" className={QUIET_BUTTON} onClick={onAdd}><Plus size={16} />단계 추가</button>
  </div>
);

const FaqStep = ({ list, labels, onChange, onAdd, onRemove, onMove, onLabel }) => (
  <div className="space-y-4">
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="영역 제목"><input className={INPUT} value={labels?.faqTitle || ""} onChange={(event) => onLabel("faqTitle", event.target.value)} /></Field>
      <Field label="영역 설명"><input className={INPUT} value={labels?.faqDescription || ""} onChange={(event) => onLabel("faqDescription", event.target.value)} /></Field>
    </div>
    {list.map((faq, index) => (
      <div key={index} className={`rounded-lg border border-zinc-200 p-4 ${faq.isVisible === false ? "bg-zinc-50" : "bg-white"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-zinc-950">질문 {index + 1}</p>
          <RowControls index={index} count={list.length} hidden={faq.isVisible === false} onMove={onMove} onToggle={(i) => onChange(i, "isVisible", faq.isVisible === false)} onRemove={onRemove} removeLabel={`질문 ${index + 1} 삭제`} />
        </div>
        <div className="space-y-4">
          <Field label="질문"><input className={INPUT} value={faq.question} onChange={(event) => onChange(index, "question", event.target.value)} /></Field>
          <Field label="답변"><textarea rows={3} className={TEXTAREA} value={faq.answer} onChange={(event) => onChange(index, "answer", event.target.value)} /></Field>
        </div>
      </div>
    ))}
    <button type="button" className={QUIET_BUTTON} onClick={onAdd}><Plus size={16} />질문 추가</button>
  </div>
);

const PublishStep = ({ draft, publicationState, onPublicationChange, onGoToStep, onGoToForm, applicantCount, onDuplicate, onDelete }) => {
  const checklist = getOpenCallChecklist(draft);
  const dateProblem = getOpenCallDateProblem(draft);
  const choices = ["private", "featured", ...(publicationState === "public" ? ["public"] : []), "archived"];
  const canDelete = publicationState === "private" && applicantCount === 0;

  return (
    <div className="space-y-7">
      <Group title="공개 전 확인">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {item.ok ? <Check size={16} className="shrink-0 text-emerald-700" /> : <AlertTriangle size={16} className="shrink-0 text-amber-700" />}
              <span className={item.ok ? "text-zinc-700" : "font-semibold text-zinc-950"}>{item.label}{item.ok ? "" : " 입력 필요"}</span>
              {item.ok ? null : (
                <button type="button" className="font-semibold text-[#004aad] underline underline-offset-2" onClick={() => item.key === "termsText" ? onGoToForm() : onGoToStep(item.key === "introText" ? "content" : "basics")}>입력하러 가기</button>
              )}
            </li>
          ))}
          {dateProblem ? <li className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><AlertTriangle size={16} className="shrink-0 text-amber-700" />{dateProblem}</li> : null}
        </ul>
      </Group>

      <Group title="공개 상태">
        <div role="radiogroup" aria-label="공개 상태" className="space-y-2">
          {choices.map((state) => {
            const choice = PUBLICATION_CHOICES[state];
            const selected = publicationState === state;
            return (
              <label key={state} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 ${selected ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}>
                <input type="radio" name="open-call-publication" className="mt-1 accent-[#004aad]" checked={selected} onChange={() => onPublicationChange(state)} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-950">{choice.label}</span>
                  <span className="mt-0.5 block text-sm text-zinc-600 break-keep">{choice.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-sm text-zinc-600">상태를 고른 뒤 위쪽 저장 버튼을 눌러야 반영됩니다. 메인 화면의 오픈콜 입구는 메인 입구 관리에서 따로 엽니다.</p>
      </Group>

      <Group title="공고 관리">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={QUIET_BUTTON} onClick={onDuplicate}><Copy size={16} />이 공고 복사해서 새로 만들기</button>
          <button type="button" className={`${QUIET_BUTTON} text-red-700`} disabled={!canDelete} onClick={onDelete}><Trash2 size={16} />공고 삭제</button>
        </div>
        {canDelete ? null : <p className="text-sm text-zinc-600">비공개 상태이면서 지원서가 없는 공고만 삭제할 수 있습니다.</p>}
      </Group>
    </div>
  );
};

const OpenCallContentEditor = ({
  draft,
  step,
  onStepChange,
  onChange,
  onLabel,
  sections,
  faqs,
  publicationState,
  onPublicationChange,
  applicantCount,
  onDuplicate,
  onDelete,
  onGoToForm,
  onPosterUpload,
  posterUploading,
  posterError,
}) => {
  const stepIndex = Math.max(0, OPEN_CALL_EDITOR_STEPS.findIndex((item) => item.id === step));
  const current = OPEN_CALL_EDITOR_STEPS[stepIndex];
  const next = OPEN_CALL_EDITOR_STEPS[stepIndex + 1];
  const goTo = (id) => {
    onStepChange(id);
    if (typeof window !== "undefined") document.getElementById("open-call-editor")?.scrollIntoView({ block: "start" });
  };

  return (
    <div id="open-call-editor" className="scroll-mt-56">
      <nav aria-label="편집 단계" className="mb-6 flex gap-1 overflow-x-auto">
        {OPEN_CALL_EDITOR_STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === current.id ? "step" : undefined}
            onClick={() => goTo(item.id)}
            className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${item.id === current.id ? "bg-zinc-200 text-zinc-950" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <span className="mr-1.5 tabular-nums text-zinc-500">{index + 1}</span>{item.label}
          </button>
        ))}
      </nav>

      {current.id === "basics" ? <BasicsStep draft={draft} onChange={onChange} onPosterUpload={onPosterUpload} posterUploading={posterUploading} posterError={posterError} /> : null}
      {current.id === "content" ? <ContentStep draft={draft} onChange={onChange} /> : null}
      {current.id === "stages" ? <StagesStep {...sections} /> : null}
      {current.id === "faq" ? <FaqStep {...faqs} labels={draft.landingLabels} onLabel={onLabel} /> : null}
      {current.id === "publish" ? (
        <PublishStep draft={draft} publicationState={publicationState} onPublicationChange={onPublicationChange} onGoToStep={goTo} onGoToForm={onGoToForm} applicantCount={applicantCount} onDuplicate={onDuplicate} onDelete={onDelete} />
      ) : null}

      {next ? (
        <div className="mt-8 flex justify-end border-t border-zinc-200 pt-5">
          <button type="button" className={QUIET_BUTTON} onClick={() => goTo(next.id)}>다음: {next.label}<ArrowRight size={16} /></button>
        </div>
      ) : null}
    </div>
  );
};

export default OpenCallContentEditor;

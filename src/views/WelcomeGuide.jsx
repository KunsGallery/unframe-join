import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

const AUTOFILL_ITEMS = ["이름과 영어 이름", "활동명과 브랜드명", "출생연도", "휴대폰번호", "홈페이지 또는 SNS"];

const PRIMARY = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#004aad] px-5 text-sm font-bold text-white hover:bg-[#003c8d]";
const SECONDARY = "inline-flex min-h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50";

// Shown once after an account's first sign-in. Add a guide by adding a step to this list.
const buildSteps = (name) => [
  {
    id: "welcome",
    title: name ? `${name}님, 환영합니다` : "UNFRAME에 오신 것을 환영합니다",
    body: (
      <>
        <p>UNFRAME JOIN에 오신 것을 환영합니다.</p>
        <p className="mt-3">오픈콜 지원, 공간 대관 문의, 협업 제안, SALON 신청을 이 계정 하나로 할 수 있습니다.</p>
      </>
    ),
  },
  {
    id: "profile",
    title: "한 번만 입력해 두세요",
    body: (
      <>
        <p>마이페이지에 기본 정보를 저장해 두면, 앞으로 신청서를 쓸 때 자동으로 입력됩니다.</p>
        <ul className="mt-4 grid gap-1.5 rounded-lg bg-[#f6f4ee] p-4 text-sm text-zinc-800">
          {AUTOFILL_ITEMS.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-3 text-sm text-zinc-600">이메일은 로그인한 계정의 주소가 들어가고, 입력된 내용은 신청서에서 고칠 수 있습니다.</p>
      </>
    ),
  },
];

const WelcomeGuide = ({ name, canOpenMyPage = true, onClose, onOpenProfile }) => {
  const dialogRef = useRef(null);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = buildSteps(name);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  // The dialog would otherwise focus its close button first.
  useEffect(() => {
    dialogRef.current?.querySelector("[data-primary]")?.focus();
  }, [stepIndex]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-guide-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md break-keep rounded-xl bg-white p-0 text-zinc-950 shadow-xl backdrop:bg-zinc-950/50"
    >
      <div className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tabular-nums text-zinc-600">{stepIndex + 1} / {steps.length}</p>
          <button type="button" aria-label="안내 닫기" onClick={onClose} className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"><X size={20} /></button>
        </div>
        <h2 id="welcome-guide-title" className="mt-2 text-2xl font-bold leading-snug">{step.title}</h2>
        <div className="mt-4 text-base leading-relaxed text-zinc-800">{step.body}</div>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isLast ? (
            canOpenMyPage ? (
              <>
                <button type="button" className={SECONDARY} onClick={onClose}>나중에 할게요</button>
                <button type="button" data-primary className={PRIMARY} onClick={onOpenProfile}>마이페이지에서 입력하기<ArrowRight size={16} /></button>
              </>
            ) : (
              <button type="button" data-primary className={PRIMARY} onClick={onClose}>신청 이어서 하기</button>
            )
          ) : (
            <button type="button" data-primary className={PRIMARY} onClick={() => setStepIndex(stepIndex + 1)}>다음<ArrowRight size={16} /></button>
          )}
        </div>
        {isLast && !canOpenMyPage ? <p className="mt-3 text-sm text-zinc-600 sm:text-right">기본 정보는 나중에 마이페이지에서 저장할 수 있습니다.</p> : null}
      </div>
    </dialog>
  );
};

export default WelcomeGuide;

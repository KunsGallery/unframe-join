import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
  normalizeOpenCallCompletionSettings,
  renderOpenCallTemplate,
} from "../constants/openCall";
import { unframeDesign } from "../components/ui/unframeDesign";

const SuccessView = ({
  onReturn,
  onSecondaryAction,
  trackType,
  completionSettings,
  templateContext,
}) => {
  const isOpenCall = trackType === "open-call";
  const openCallCompletionSettings = normalizeOpenCallCompletionSettings(
    completionSettings
  );
  const renderedCompletion = isOpenCall
    ? {
        title: renderOpenCallTemplate(
          openCallCompletionSettings.title,
          templateContext
        ),
        message: renderOpenCallTemplate(
          openCallCompletionSettings.message,
          templateContext
        ),
        subMessage: renderOpenCallTemplate(
          openCallCompletionSettings.subMessage,
          templateContext
        ),
        buttonLabel:
          renderOpenCallTemplate(
            openCallCompletionSettings.buttonLabel,
            templateContext
          ) || "메인으로 돌아가기",
        secondaryButtonLabel:
          renderOpenCallTemplate(
            openCallCompletionSettings.secondaryButtonLabel,
            templateContext
          ) || "오픈콜 다시 보기",
      }
    : null;

  return (
    <section className={`${unframeDesign.surface} relative z-10 px-4 py-24 text-center md:py-32`}>
      <div className={`${unframeDesign.majorCard} mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#AAD004] text-zinc-950`}>
        <CheckCircle2 size={48} strokeWidth={3} />
      </div>

      <h2 className="mt-8 text-4xl font-black tracking-tighter text-zinc-950 text-center md:text-5xl">
        {isOpenCall ? renderedCompletion?.title || "" : "Proposal Received"}
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-center text-base font-medium leading-relaxed text-zinc-700 break-keep">
        {isOpenCall ? (
          <span className="block space-y-2">
            <span className="block whitespace-pre-line">
              {renderedCompletion?.message || ""}
            </span>
            <span className="block whitespace-pre-line text-zinc-400">
              {renderedCompletion?.subMessage || ""}
            </span>
          </span>
        ) : (
          <>
            작가님의 소중한 제안서가 성공적으로 전달되었습니다.
            <br />
            언프레임 큐레이터 팀이 검토 후 48시간 내에 연락드리겠습니다.
          </>
        )}
      </p>

      <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
        <button
          onClick={onReturn}
          className={unframeDesign.primaryButton + " w-full"}
        >
          {isOpenCall
            ? renderedCompletion?.buttonLabel
            : "Return to Home"}
        </button>

        {isOpenCall && onSecondaryAction ? (
          <button
            onClick={onSecondaryAction}
            className={unframeDesign.secondaryButton + " w-full"}
          >
            {renderedCompletion?.secondaryButtonLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default SuccessView;

import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
  OPEN_CALL_TITLE,
  normalizeOpenCallCompletionSettings,
} from "../constants/openCall";

const SuccessView = ({ onReturn, onSecondaryAction, trackType, completionSettings }) => {
  const isOpenCall = trackType === "open-call";
  const openCallCompletionSettings = normalizeOpenCallCompletionSettings(
    completionSettings
  );

  return (
    <section className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700 min-h-screen relative z-10 text-zinc-900 px-4">
      <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner shadow-[#004aad]/5">
        <CheckCircle2 size={48} strokeWidth={3} />
      </div>

      <h2 className="text-4xl font-black uppercase mb-6 text-[#004aad] text-center">
        {isOpenCall ? openCallCompletionSettings.title : "Proposal Received"}
      </h2>

      <p className="text-zinc-500 font-light leading-relaxed mb-12 break-keep text-base text-center">
        {isOpenCall ? (
          <span className="block space-y-2">
            <span className="block whitespace-pre-line">
              {openCallCompletionSettings.message || OPEN_CALL_TITLE}
            </span>
            <span className="block whitespace-pre-line text-zinc-400">
              {openCallCompletionSettings.subMessage ||
                "검토 결과는 마이페이지와 안내 메시지에서 순차적으로 확인하실 수 있습니다."}
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

      <div className="flex flex-col gap-3">
        <button
          onClick={onReturn}
          className="w-full border border-zinc-200 text-zinc-400 py-5 rounded-full font-black uppercase text-xs transition-all hover:bg-zinc-50 shadow-sm transition-all text-center"
        >
          {isOpenCall
            ? openCallCompletionSettings.buttonLabel || "Join Home으로 돌아가기"
            : "Return to Home"}
        </button>

        {isOpenCall && onSecondaryAction ? (
          <button
            onClick={onSecondaryAction}
            className="w-full rounded-full border border-[#004aad]/15 bg-white py-5 font-black uppercase text-xs text-[#004aad] transition-all hover:bg-[#004aad]/5 shadow-sm text-center"
          >
            {openCallCompletionSettings.secondaryButtonLabel || "오픈콜 다시 보기"}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default SuccessView;

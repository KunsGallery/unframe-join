import React from "react";
import { CheckCircle2 } from "lucide-react";

const SuccessView = ({ onReturn }) => (
  <section className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700 min-h-screen relative z-10 text-zinc-900 px-4">
    <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner shadow-[#004aad]/5">
      <CheckCircle2 size={48} strokeWidth={3} />
    </div>

    <h2 className="text-4xl font-black uppercase mb-6 text-[#004aad] text-center">
      Proposal Received
    </h2>

    <p className="text-zinc-500 font-light leading-relaxed mb-12 break-keep text-base text-center">
      작가님의 소중한 제안서가 성공적으로 전달되었습니다.
      <br />
      언프레임 큐레이터 팀이 검토 후 48시간 내에 연락드리겠습니다.
    </p>

    <button
      onClick={onReturn}
      className="w-full border border-zinc-200 text-zinc-400 py-5 rounded-full font-black uppercase text-xs transition-all hover:bg-zinc-50 shadow-sm transition-all text-center"
    >
      Return to Home
    </button>
  </section>
);

export default SuccessView;
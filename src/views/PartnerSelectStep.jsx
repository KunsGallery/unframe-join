import React from "react";
import { Palette, Building2 } from "lucide-react";

const PartnerSelectStep = ({ onSelect, onBack }) => (
  <section
    id="partner-type-section"
    className="animate-in fade-in slide-in-from-bottom-10 duration-700 py-20 md:py-32 max-w-4xl mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-center text-center px-4"
  >
    <div className="mb-10 md:mb-16 text-center">
      <h2 className="text-3xl sm:text-4xl md:text-7xl font-black tracking-tighter uppercase mb-4 md:mb-6 text-zinc-900 leading-[1.02] break-keep">
        Define Your
        <br className="sm:hidden" /> Creative Persona
      </h2>
      <p className="text-zinc-400 text-sm sm:text-base md:text-lg font-light uppercase tracking-[0.18em] md:tracking-widest break-keep">
        당신은 어떤 파트너인가요?
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 text-center">
      <button
        onClick={() => onSelect("artist")}
        className="group relative bg-white border border-zinc-100 px-6 py-8 sm:px-8 sm:py-10 md:p-16 rounded-[30px] md:rounded-[60px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:border-[#004aad] transition-all hover:-translate-y-1 md:hover:-translate-y-4 text-center"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-[#004aad]/10 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-10 group-hover:scale-110 transition-transform">
          <Palette size={28} className="text-[#004aad] md:w-10 md:h-10" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black uppercase text-zinc-900 mb-3 md:mb-4">
          Artist
        </h3>
        <p className="text-zinc-400 text-xs sm:text-sm font-light break-keep leading-relaxed">
          개인전 및 그룹전을 준비하는
          <br />
          예술가 파트너
        </p>
      </button>

      <button
        onClick={() => onSelect("brand")}
        className="group relative bg-zinc-900 border border-zinc-800 px-6 py-8 sm:px-8 sm:py-10 md:p-16 rounded-[30px] md:rounded-[60px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:bg-zinc-800 transition-all hover:-translate-y-1 md:hover:-translate-y-4 text-center"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-10 group-hover:scale-110 transition-transform">
          <Building2 size={28} className="text-white md:w-10 md:h-10" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black uppercase text-white mb-3 md:mb-4">
          Brand / Team
        </h3>
        <p className="text-zinc-500 text-xs sm:text-sm font-light break-keep leading-relaxed">
          기획 전시, 팝업 스토어 및 브랜딩
          <br />
          행사를 준비하는 파트너
        </p>
      </button>
    </div>

    <button
      onClick={onBack}
      className="mt-10 md:mt-16 block mx-auto text-zinc-400 font-black uppercase tracking-[0.18em] md:tracking-widest text-[10px] md:text-xs hover:text-zinc-900 transition-colors"
    >
      ← Back to Main
    </button>
  </section>
);

export default PartnerSelectStep;
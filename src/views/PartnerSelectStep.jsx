import React from "react";
import { Palette, Building2 } from "lucide-react";
import { unframeDesign } from "../components/ui/unframeDesign";

const PartnerSelectStep = ({ onSelect, onBack }) => (
  <section
    id="partner-type-section"
    className={`${unframeDesign.surface} animate-in fade-in slide-in-from-bottom-10 duration-700 py-20 md:py-32 max-w-4xl mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-center text-center px-4`}
  >
    <div className="mb-10 md:mb-16 text-center">
      <span className={unframeDesign.pill}>PARTNER TYPE</span>
      <h2 className="mt-4 text-3xl sm:text-4xl md:text-7xl font-black tracking-tighter uppercase mb-4 md:mb-6 text-zinc-900 leading-[1.02] break-keep">
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
        className="group relative rounded-[32px] border-2 border-zinc-900 bg-white px-6 py-8 text-center shadow-[6px_6px_0px_#000] transition-all hover:-translate-y-1 sm:px-8 sm:py-10 md:p-16 md:hover:-translate-y-4"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#AAD004] shadow-[3px_3px_0px_#000] transition-transform group-hover:scale-110 sm:h-20 sm:w-20 md:mb-10 md:h-24 md:w-24">
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
        className="group relative rounded-[32px] border-2 border-zinc-900 bg-zinc-950 px-6 py-8 text-center shadow-[6px_6px_0px_#000] transition-all hover:-translate-y-1 sm:px-8 sm:py-10 md:p-16 md:hover:-translate-y-4"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#000] transition-transform group-hover:scale-110 sm:h-20 sm:w-20 md:mb-10 md:h-24 md:w-24">
          <Building2 size={28} className="text-zinc-950 md:w-10 md:h-10" />
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
      className={`${unframeDesign.secondaryButton} mt-10 md:mt-16 mx-auto block`}
    >
      ← Back to Main
    </button>
  </section>
);

export default PartnerSelectStep;

import React from "react";
import { Palette, Building2 } from "lucide-react";

const PartnerSelectStep = ({ onSelect, onBack }) => (
  <section className="animate-in fade-in slide-in-from-bottom-10 duration-700 py-40 max-w-4xl mx-auto min-h-screen text-center px-4">
    <div className="mb-24 text-center">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-zinc-900 leading-tight break-keep">
        Define Your Creative Persona
      </h2>
      <p className="text-zinc-400 text-lg font-light uppercase tracking-widest">
        당신은 어떤 파트너인가요?
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-10 text-center">
      <button
        onClick={() => onSelect("artist")}
        className="group relative bg-white border border-zinc-100 p-16 rounded-[60px] shadow-2xl hover:border-[#004aad] transition-all hover:-translate-y-4 text-center"
      >
        <div className="w-24 h-24 bg-[#004aad]/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform text-center">
          <Palette size={40} className="text-[#004aad]" />
        </div>
        <h3 className="text-3xl font-black uppercase text-zinc-900 mb-4 text-center">
          Artist
        </h3>
        <p className="text-zinc-400 text-sm font-light break-keep text-center">
          개인전 및 그룹전을 준비하는
          <br />
          예술가 파트너
        </p>
      </button>

      <button
        onClick={() => onSelect("brand")}
        className="group relative bg-zinc-900 border border-zinc-800 p-16 rounded-[60px] shadow-2xl hover:bg-zinc-800 transition-all hover:-translate-y-4 text-center"
      >
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform text-center">
          <Building2 size={40} className="text-white" />
        </div>
        <h3 className="text-3xl font-black uppercase text-white mb-4 text-center">
          Brand / Team
        </h3>
        <p className="text-zinc-500 text-sm font-light break-keep text-center">
          기획 전시, 팝업 스토어 및 브랜딩
          <br />
          행사를 준비하는 파트너
        </p>
      </button>
    </div>

    <button
      onClick={onBack}
      className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-colors"
    >
      ← Back to Main
    </button>
  </section>
);

export default PartnerSelectStep;
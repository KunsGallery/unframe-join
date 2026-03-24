import React, { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Megaphone,
  Cpu,
  User,
  Coffee,
  Truck,
  FileText,
  ShieldCheck,
} from "lucide-react";
import SupportCard from "../components/ui/SupportCard";
import PreparationItem from "../components/ui/PreparationItem";
import { PROGRAMS } from "../constants/programs";

const DEFAULT_PROGRAM_ID = PROGRAMS[2]?.id || PROGRAMS[0].id;

const LandingPage = ({ onSelectProgram }) => {
  const [hoveredProgramId, setHoveredProgramId] = useState(DEFAULT_PROGRAM_ID);

  return (
    <div className="animate-in fade-in duration-1000 space-y-60 px-4">
      <header className="min-h-[80vh] flex flex-col items-center justify-center text-center">
        <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-black mb-8 block animate-bounce">
          Collaboration & Rental
        </span>
        <h1 className="text-6xl md:text-[11rem] font-black uppercase leading-[0.85] mb-12 tracking-tighter text-zinc-900">
          Start Your
          <br />
          Resonance
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-zinc-400 font-light italic font-serif leading-relaxed px-4 text-center">
          "작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간."
        </p>
      </header>

      <section className="py-20 border-t border-gray-100">
        <div className="mb-24 text-center md:text-left">
          <h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-zinc-900 text-center">
            🤝 UNFRAME 지원사항
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
          <SupportCard
            icon={<Megaphone size={48} />}
            title="홍보 및 큐레이션 지원"
            desc="SNS 공식 채널 포스팅 및 현수막/엽서 제작을 지원하며, 작품 세계관을 심도 있게 전달하는 Curatorial Note를 작성해 드립니다."
          />
          <SupportCard
            icon={<Cpu size={48} />}
            title="장비 대여 및 설치 지원"
            desc="최적의 관람 환경을 위한 레일 스포트라이트 조명, 미디어용 프로젝터 및 사운드 시스템 등 전시 장비를 무상 제공합니다."
          />
          <SupportCard
            icon={<User size={48} />}
            title="전시 운영 인력 상주"
            desc="전시 기간 중 전문 디렉터가 상주하여 관람객 응대, 작품 보호 및 콜렉터 구매 문의를 직접 책임지고 관리합니다."
          />
          <SupportCard
            icon={<Coffee size={48} />}
            title="행사 및 편의 지원"
            desc="오프닝 리셉션 다과 세팅을 지원하며, 작가님과 귀빈분들을 위한 무료 주차(1시간) 및 케이터링 편의를 제공합니다."
          />
        </div>
      </section>

      <section className="bg-zinc-900 text-white py-48 px-8 md:px-20 rounded-[80px] relative overflow-hidden shadow-2xl">
        <div className="mb-32 text-center">
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-white text-center">
            🧳 Preparation
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-20 max-w-6xl mx-auto text-zinc-300 text-left">
          <PreparationItem
            icon={<Truck size={40} className="text-[#004aad]" />}
            title="운송 및 철수"
            desc="작품의 포장, 운송 및 설치/철수 작업은 작가님 주관으로 진행됩니다. 전시 후에는 공간 원상복구를 부탁드립니다."
          />
          <PreparationItem
            icon={<FileText size={40} className="text-[#004aad]" />}
            title="전시 정보 전달"
            desc="홍보물 제작을 위해 고화질 작품 사진, 작가 노트 및 캡션 리스트를 사전에 전달해 주세요."
          />
          <PreparationItem
            icon={<ShieldCheck size={40} className="text-[#004aad]" />}
            title="작품 관리"
            desc="보험 가입은 선택 사항이며, 갤러리는 고의나 중과실이 없는 한 작품 파손이나 도난에 대해 책임을 지지 않습니다."
          />
        </div>
      </section>

      <section className="pb-28 text-zinc-900">
        <div className="mb-16 md:mb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-end">
          <div className="text-left">
            <span className="text-[#004aad] uppercase tracking-[0.4em] text-[10px] font-black mb-5 block">
              Program Selection
            </span>
            <h2 className="text-4xl md:text-6xl xl:text-[5.6rem] font-black tracking-tighter leading-[0.94] uppercase text-zinc-900">
              언프레임과
              <br />
              함께하기
            </h2>
          </div>

          <div className="text-left lg:pb-2">
            <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed break-keep">
              프로그램을 먼저 선택한 뒤, 파트너 유형과 일정, 신청서를 순서대로 작성하실 수 있습니다.
            </p>
          </div>
        </div>

        <div
          className="relative rounded-[44px] border border-zinc-200 bg-white overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.06)]"
          onMouseLeave={() => setHoveredProgramId(DEFAULT_PROGRAM_ID)}
        >
          <div className="grid grid-cols-4 border-b border-zinc-100 bg-zinc-50/70">
            {PROGRAMS.map((program, index) => {
              const active = hoveredProgramId === program.id;
              return (
                <div
                  key={program.id}
                  className={`px-5 py-4 text-center transition-all ${
                    index !== PROGRAMS.length - 1 ? "border-r border-zinc-100" : ""
                  } ${active ? "bg-white" : ""}`}
                >
                  <div className="text-[9px] font-black tracking-[0.34em] uppercase text-zinc-300 mb-2">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div
                    className={`text-[11px] md:text-xs font-black tracking-[0.18em] uppercase transition-colors ${
                      active ? "text-[#004aad]" : "text-zinc-500"
                    }`}
                  >
                    {program.name}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col xl:flex-row h-[640px] xl:h-[620px]">
            {PROGRAMS.map((program, index) => {
              const isActive = hoveredProgramId === program.id;
              const isCollapsed = !isActive;

              return (
                <div
                  key={program.id}
                  onMouseEnter={() => setHoveredProgramId(program.id)}
                  className={`relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] border-b xl:border-b-0 xl:border-r last:border-r-0 border-zinc-100 overflow-hidden ${
                    isActive ? "xl:flex-[2.4]" : "xl:flex-[0.53]"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-500 ${
                      isActive ? "bg-white" : "bg-[#f8f8f5]"
                    }`}
                  />

                  {isCollapsed && (
                    <div className="absolute inset-0 bg-zinc-950/6 transition-all duration-500" />
                  )}

                  <div className="relative z-10 h-full">
                    {isActive ? (
                      <div className="h-full p-6 md:p-8 xl:p-10 flex flex-col">
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004aad]/8 text-[#004aad] text-[9px] font-black uppercase tracking-[0.22em] mb-4">
                              <Sparkles size={11} />
                              {program.badge}
                            </div>

                            <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-none text-zinc-900">
                              {program.name}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-1.5">
                              Fee
                            </div>
                            <div className="flex items-end gap-1.5 justify-end">
                              <span className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900">
                                {program.price}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-400 mb-1">
                                만원
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid lg:grid-cols-[1fr_0.92fr] gap-8 flex-1 min-h-0">
                          <div className="flex flex-col min-h-0">
                            <p className="text-sm md:text-[15px] text-zinc-500 font-medium leading-relaxed break-keep max-w-xl mb-8">
                              {program.description}
                            </p>

                            <button
                              onClick={() => onSelectProgram(program)}
                              className="inline-flex items-center justify-center gap-3 bg-[#004aad] text-white px-6 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] transition-all shadow-lg shadow-[#004aad]/20 w-fit"
                            >
                              이 프로그램으로 선택하기 <ArrowRight size={15} />
                            </button>
                          </div>

                          <div className="space-y-3 overflow-hidden">
                            {program.details.map((item, detailIndex) => (
                              <div
                                key={item}
                                className="flex items-start gap-4 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3.5"
                              >
                                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-300 pt-1 shrink-0">
                                  {String(detailIndex + 1).padStart(2, "0")}
                                </span>
                                <span className="text-[13px] md:text-sm font-bold text-zinc-700 leading-relaxed break-keep">
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#004aad]/35 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-between py-7 px-3">
                        <div className="text-[9px] font-black tracking-[0.28em] uppercase text-zinc-300">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                          <div className="[writing-mode:vertical-rl] rotate-180 text-center">
                            <span className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.22em] text-zinc-700">
                              {program.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">
                          {program.price}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 md:mt-14 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-zinc-900 text-white px-6 md:px-8 py-4 rounded-full shadow-xl">
            <Sparkles size={18} />
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.22em]">
              프로그램 선택 후 신청이 시작됩니다
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import SupportCard from "../components/ui/SupportCard";
import PreparationItem from "../components/ui/PreparationItem";
import { PROGRAMS } from "../constants/programs";

const DEFAULT_PROGRAM_ID = PROGRAMS[2]?.id || PROGRAMS[0]?.id || "";

const FAQ_ITEMS = [
  {
    q: "개인전이 아닌 그룹전이나 팀 단위 신청도 가능한가요?",
    a: "네, 가능합니다. 팀 단위 프로젝트나 그룹 전시도 신청하실 수 있으며, 원활한 진행을 위해 대표자 한 분을 지정해 주시면 됩니다.",
  },
  {
    q: "학생이나 신진 작가도 지원할 수 있나요?",
    a: "물론입니다. 언프레임은 경력보다 작품의 철학, 공간과의 조화, 그리고 시도의 진정성을 더 중요하게 봅니다.",
  },
  {
    q: "전시 외에 공연이나 워크숍 같은 형태도 가능한가요?",
    a: "브랜드와 공간의 방향에 잘 맞는다면 퍼포먼스, 아티스트 토크, 원데이 클래스 등 다양한 형태의 협업도 가능합니다. 신청서에 상세 내용을 함께 적어 주세요.",
  },
  {
    q: "디렉터 상주 서비스는 구체적으로 어떤 도움을 주나요?",
    a: "전시장 오픈과 마감, 관람객 응대, 작품 설명, 구매 문의 대응, 현장 컨디션 관리까지 전반적인 운영을 디렉터가 함께 맡습니다.",
  },
  {
    q: "운영 수수료 외에 추가 비용이 있나요?",
    a: "기본 운영 범위 안에서는 별도의 추가 비용이 없습니다. 다만 개별 인쇄물 제작, 특수 장비 렌탈, 별도 외주 작업 등 선택 사항은 추가될 수 있습니다.",
  },
  {
    q: "작품 판매가는 작가가 직접 결정하나요?",
    a: "네, 판매가는 작가가 직접 정하는 것을 원칙으로 합니다. 필요하신 경우에는 시장 시세와 공간 특성을 바탕으로 디렉터가 가격 설정 가이드를 드릴 수 있습니다.",
  },
  {
    q: "전시 일정을 확정했다가 취소하게 되면 어떻게 되나요?",
    a: "일정 확정 이후 취소 시점에 따라 조정이 필요할 수 있습니다. 공간 운영 특성상 일정은 신중히 결정해 주시길 부탁드리며, 세부 기준은 진행 단계에서 별도로 안내드립니다.",
  },
];

const MobileSectionTitle = ({ eyebrow, title, description }) => (
  <div className="mb-8 text-left">
    {eyebrow ? (
      <span className="text-[#004aad] uppercase tracking-[0.35em] text-[10px] font-black mb-4 block">
        {eyebrow}
      </span>
    ) : null}
    <h2 className="text-3xl font-black tracking-tighter leading-[0.95] text-zinc-900 break-keep">
      {title}
    </h2>
    {description ? (
      <p className="mt-4 text-sm font-bold text-zinc-500 leading-relaxed break-keep">
        {description}
      </p>
    ) : null}
  </div>
);

const MobileSupportCard = ({ icon, title, desc }) => (
  <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)]">
    <div className="mb-4 text-[#004aad]">{icon}</div>
    <h3 className="text-lg font-black tracking-tight text-zinc-900 mb-3 break-keep">
      {title}
    </h3>
    <p className="text-sm font-bold text-zinc-500 leading-relaxed break-keep">
      {desc}
    </p>
  </div>
);

const MobilePreparationCard = ({ icon, title, desc }) => (
  <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-sm p-5">
    <div className="mb-4 text-[#004aad]">{icon}</div>
    <h3 className="text-lg font-black tracking-tight text-white mb-3 break-keep">
      {title}
    </h3>
    <p className="text-sm font-bold text-zinc-300 leading-relaxed break-keep">
      {desc}
    </p>
  </div>
);

const MobileProgramCard = ({
  program,
  index,
  isOpen,
  onToggle,
  onSelect,
}) => (
  <div
    className={`rounded-[30px] border overflow-hidden transition-all ${
      isOpen
        ? "border-[#004aad]/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
        : "border-zinc-200 bg-white"
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left px-5 py-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#004aad]/8 text-[#004aad] text-[9px] font-black uppercase tracking-[0.18em]">
              <Sparkles size={10} />
              {program.badge}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-300">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-zinc-900 leading-none">
            {program.name}
          </h3>

          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad]">
            {program.subtitle}
          </p>

          <p className="mt-4 text-sm font-medium text-zinc-500 leading-relaxed break-keep">
            {program.description}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-300 mb-1">
            Fee
          </div>
          <div className="flex items-end gap-1 justify-end">
            <span className="text-3xl font-black tracking-tighter text-zinc-900">
              {program.price}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 mb-1">
              만원
            </span>
          </div>

          <div className="mt-4 flex justify-end text-zinc-400">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>
    </button>

    {isOpen && (
      <div className="px-5 pb-5">
        <div className="border-t border-zinc-100 pt-5">
          <div className="space-y-3 mb-5">
            {program.details.map((item, detailIndex) => (
              <div
                key={item}
                className="flex items-start gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3"
              >
                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-300 pt-1 shrink-0">
                  {String(detailIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] font-bold text-zinc-700 leading-relaxed break-keep">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onSelect(program)}
            className="w-full inline-flex items-center justify-center gap-3 bg-[#004aad] text-white px-5 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#004aad]/20"
          >
            이 프로그램으로 선택하기 <ArrowRight size={15} />
          </button>
        </div>
      </div>
    )}
  </div>
);

const MobileFaqCard = ({ item, isOpen, onToggle }) => (
  <div className="rounded-[24px] border border-zinc-100 bg-white overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
    >
      <span className="text-sm font-black text-zinc-900 leading-relaxed break-keep">
        {item.q}
      </span>
      <span className="shrink-0 text-zinc-400">
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </span>
    </button>

    {isOpen && (
      <div className="px-5 pb-5">
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-sm font-bold text-zinc-500 leading-relaxed break-keep">
            {item.a}
          </p>
        </div>
      </div>
    )}
  </div>
);

const LandingPage = ({ onSelectProgram }) => {
  const [hoveredProgramId, setHoveredProgramId] = useState(DEFAULT_PROGRAM_ID);
  const [mobileOpenId, setMobileOpenId] = useState(DEFAULT_PROGRAM_ID);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const handleProgramSelect = (program) => {
    onSelectProgram(program);

    setTimeout(() => {
      const target = document.getElementById("application-form-section");
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
  };

  return (
    <div className="animate-in fade-in duration-1000">
      {/* Mobile */}
      <div className="md:hidden px-4 space-y-24">
        <section className="min-h-[72vh] flex flex-col items-center justify-center text-center pt-10">
          <span className="text-[#004aad] uppercase tracking-[0.45em] text-[10px] font-black mb-6 block">
            Collaboration & Rental
          </span>
          <h1 className="text-[3.2rem] font-black uppercase leading-[0.88] tracking-tighter text-zinc-900">
            Start Your
            <br />
            Resonance
          </h1>
          <p className="mt-8 max-w-sm mx-auto text-base text-zinc-400 font-medium leading-relaxed break-keep">
            작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간.
          </p>
        </section>

        <section className="pt-4 border-t border-zinc-100">
          <MobileSectionTitle
            eyebrow="UNFRAME Support"
            title="🤝 UNFRAME 지원사항"
            description="전시 운영부터 홍보, 설치, 현장 응대까지 언프레임이 함께 준비합니다."
          />

          <div className="space-y-4">
            <MobileSupportCard
              icon={<Megaphone size={34} />}
              title="홍보 및 큐레이션 지원"
              desc="SNS 공식 채널 포스팅 및 현수막/엽서 제작을 지원하며, 작품 세계관을 심도 있게 전달하는 Curatorial Note를 작성해 드립니다."
            />
            <MobileSupportCard
              icon={<Cpu size={34} />}
              title="장비 대여 및 설치 지원"
              desc="최적의 관람 환경을 위한 레일 스포트라이트 조명, 미디어용 프로젝터 및 사운드 시스템 등 전시 장비를 무상 제공합니다."
            />
            <MobileSupportCard
              icon={<User size={34} />}
              title="전시 운영 인력 상주"
              desc="전시 기간 중 전문 디렉터가 상주하여 관람객 응대, 작품 보호 및 구매 문의를 직접 책임지고 관리합니다."
            />
            <MobileSupportCard
              icon={<Coffee size={34} />}
              title="행사 및 편의 지원"
              desc="오프닝 리셉션 다과 세팅을 지원하며, 작가님과 귀빈분들을 위한 무료 주차 및 케이터링 편의를 제공합니다."
            />
          </div>
        </section>

        <section className="bg-zinc-900 text-white rounded-[40px] px-5 py-12 shadow-2xl">
          <MobileSectionTitle
            eyebrow="Preparation"
            title="🧳 Preparation"
            description="전시 전 미리 확인해 두시면 좋은 준비 사항입니다."
          />

          <div className="space-y-4">
            <MobilePreparationCard
              icon={<Truck size={30} className="text-[#004aad]" />}
              title="운송 및 철수"
              desc="작품의 포장, 운송 및 설치/철수 작업은 작가님 주관으로 진행됩니다. 전시 후에는 공간 원상복구를 부탁드립니다."
            />
            <MobilePreparationCard
              icon={<FileText size={30} className="text-[#004aad]" />}
              title="전시 정보 전달"
              desc="홍보물 제작을 위해 고화질 작품 사진, 작가 노트 및 캡션 리스트를 사전에 전달해 주세요."
            />
            <MobilePreparationCard
              icon={<ShieldCheck size={30} className="text-[#004aad]" />}
              title="작품 관리"
              desc="보험 가입은 선택 사항이며, 갤러리는 고의나 중과실이 없는 한 작품 파손이나 도난에 대해 책임을 지지 않습니다."
            />
          </div>
        </section>

        <section>
          <MobileSectionTitle
            eyebrow="Program Selection"
            title="언프레임과 함께하기"
            description="프로그램을 먼저 선택한 뒤, 파트너 유형과 일정, 신청서를 순서대로 작성하실 수 있습니다."
          />

          <div className="space-y-4">
            {PROGRAMS.map((program, index) => (
              <MobileProgramCard
                key={program.id}
                program={program}
                index={index}
                isOpen={mobileOpenId === program.id}
                onToggle={() =>
                  setMobileOpenId((prev) => (prev === program.id ? null : program.id))
                }
                onSelect={handleProgramSelect}
              />
            ))}
          </div>

          <div className="pt-6 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-zinc-900 text-white px-5 py-3 rounded-full shadow-xl">
              <Sparkles size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                프로그램 선택 후 신청이 시작됩니다
              </span>
            </div>
          </div>
        </section>

        <section className="pb-24 border-t border-zinc-100 pt-12">
          <MobileSectionTitle
            eyebrow="FAQ"
            title="자주 묻는 질문"
            description="신청 전 가장 많이 확인하시는 내용을 먼저 정리했습니다."
          />

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <MobileFaqCard
                key={item.q}
                item={item}
                isOpen={openFaqIndex === index}
                onToggle={() =>
                  setOpenFaqIndex((prev) => (prev === index ? -1 : index))
                }
              />
            ))}
          </div>
        </section>
      </div>

      {/* Desktop */}
      <div className="hidden md:block px-4 space-y-60">
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
            <h3 className="text-4xl sm:text-5xl md:text-8xl font-black tracking-tighter leading-none text-zinc-900 text-center break-keep">
              <span className="block md:inline">🤝 UNFRAME</span>{" "}
              <span className="block md:inline">지원사항</span>
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

            <div className="flex flex-col xl:flex-row h-[640px] xl:h-[620px] bg-zinc-950">
              {PROGRAMS.map((program, index) => {
                const isActive = hoveredProgramId === program.id;
                const isCollapsed = !isActive;

                return (
                  <div
                    key={program.id}
                    onMouseEnter={() => setHoveredProgramId(program.id)}
                    className={`relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] border-b xl:border-b-0 xl:border-r last:border-r-0 border-white/10 overflow-hidden ${
                      isActive ? "xl:flex-[2.45]" : "xl:flex-[0.52]"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 transition-all duration-500 ${
                        isActive ? "bg-white" : "bg-zinc-900"
                      }`}
                    />

                    {isCollapsed && (
                      <div className="absolute inset-0 bg-black/35 transition-all duration-500" />
                    )}

                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/20 pointer-events-none" />
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

                              <p className="mt-3 text-[11px] md:text-xs font-black uppercase tracking-[0.16em] text-[#004aad]">
                                {program.subtitle}
                              </p>
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
                                onClick={() => handleProgramSelect(program)}
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
                          <div className="text-[9px] font-black tracking-[0.28em] uppercase text-white/25">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="flex-1 flex items-center justify-center">
                            <div className="[writing-mode:vertical-rl] rotate-180 text-center">
                              <span className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.22em] text-white/78">
                                {program.name}
                              </span>
                            </div>
                          </div>

                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25">
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

          <div className="flex mt-12 md:mt-14 justify-center">
            <div className="inline-flex items-center gap-3 bg-zinc-900 text-white px-6 md:px-8 py-4 rounded-full shadow-xl">
              <Sparkles size={18} />
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.22em]">
                프로그램 선택 후 신청이 시작됩니다
              </span>
            </div>
          </div>
        </section>

        <section className="pb-28 border-t border-gray-100 pt-20">
          <div className="mb-14 text-center">
            <span className="text-[#004aad] uppercase tracking-[0.4em] text-[10px] font-black mb-5 block">
              FAQ
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.94] uppercase text-zinc-900">
              자주 묻는 질문
            </h2>
            <p className="mt-5 max-w-2xl mx-auto text-sm md:text-base text-zinc-500 font-medium leading-relaxed break-keep">
              신청 전 가장 많이 확인하시는 내용을 먼저 정리했습니다.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={item.q}
                  className="rounded-[28px] border border-zinc-100 bg-white overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.04)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaqIndex((prev) => (prev === index ? -1 : index))
                    }
                    className="w-full px-6 md:px-7 py-5 md:py-6 flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm md:text-lg font-black text-zinc-900 break-keep leading-relaxed">
                      {item.q}
                    </span>

                    <span className="shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 md:px-7 pb-6">
                      <div className="border-t border-zinc-100 pt-5">
                        <p className="text-sm md:text-[15px] font-bold text-zinc-500 leading-relaxed break-keep">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
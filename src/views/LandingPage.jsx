import React from "react";
import { ArrowRight, Sparkles, Megaphone, Cpu, User, Coffee, Truck, FileText, ShieldCheck } from "lucide-react";
import SupportCard from "../components/ui/SupportCard";
import PreparationItem from "../components/ui/PreparationItem";

const LandingPage = ({ onStart }) => (
  <div className="animate-in fade-in duration-1000 space-y-60 px-4">
    <header className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-black mb-8 block animate-bounce">
        Collaboration & Rental
      </span>
      <h1 className="text-6xl md:text-[11rem] font-black uppercase leading-[0.85] mb-12 tracking-tighter text-zinc-900 leading-none">
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

    <section className="min-h-[70vh] flex flex-col justify-center pb-40 text-zinc-900">
      <div className="grid lg:grid-cols-2 gap-32 items-center text-left">
        <div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-12 uppercase text-zinc-900">
            정직한 약속
          </h2>
          <p className="text-xl text-zinc-500 font-light leading-relaxed italic text-left">
            언프레임은 공간이 작가의 언어를 온전히 담아낼 때 그 가치가 완성된다고 믿습니다.
          </p>
        </div>

        <div className="bg-white border border-gray-100 p-10 md:p-16 shadow-2xl rounded-[64px]">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-10 block text-zinc-400 text-left">
            Rental Investment
          </span>
          <div className="flex flex-wrap items-baseline gap-4 mb-16">
            <span className="text-4xl md:text-7xl font-black tracking-tighter text-zinc-900">
              2,800,000
            </span>
            <span className="text-xl text-zinc-400 font-bold uppercase whitespace-nowrap">
              KRW / WEEK
            </span>
          </div>

          <button
            onClick={onStart}
            className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95 transition-all text-center"
          >
            <Sparkles size={24} /> UNFRAME 과 함께하기 <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </section>
  </div>
);

export default LandingPage;
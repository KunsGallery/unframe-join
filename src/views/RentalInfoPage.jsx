import React from "react";
import { ArrowLeft, ArrowRight, Camera, CalendarDays, CircleHelp, Ruler, Wrench } from "lucide-react";

const blocks = [
  { icon: Camera, title: "공간을 먼저 살펴보세요", text: "전시장과 설치 모습을 사진으로 확인하고, 사용 목적에 맞는지 문의 단계에서 함께 검토합니다." },
  { icon: Ruler, title: "필요 조건을 알려주세요", text: "희망 일정, 예상 인원, 반입 장비와 공간 활용 계획을 알려주시면 운영 가능 여부를 안내드립니다." },
  { icon: Wrench, title: "대관과 운영 지원을 구분합니다", text: "공간 이용 문의와 전시 기획·디렉팅 지원은 별도로 검토합니다. 필요한 범위는 문의서에서 선택해 주세요." },
  { icon: CalendarDays, title: "문의 후 일정과 조건을 확정합니다", text: "문의 접수는 예약 확정이 아닙니다. 일정, 이용 범위와 비용을 안내한 뒤 별도 협의로 확정합니다." },
];

export default function RentalInfoPage({ onBack, onContinue }) {
  return <main className="mx-auto max-w-6xl px-1 pb-16 text-zinc-950">
    <button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-zinc-600"><ArrowLeft size={16}/> 메인으로</button>
    <header className="grid gap-8 border-b border-zinc-200 pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">UNFRAME SPACE</p><h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">공간 대관 문의</h1><p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">전시, 팝업, 촬영과 모임을 위한 공간 이용을 문의해 주세요. 목적과 희망 일정을 확인한 뒤 가능한 이용 방식과 조건을 안내드립니다.</p></div>
      <div className="flex flex-wrap gap-3 md:justify-end"><button type="button" onClick={onContinue} className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[#004AAD] px-6 text-sm font-bold text-white">대관 문의 시작 <ArrowRight size={16}/></button></div>
    </header>
    <section className="grid gap-x-8 sm:grid-cols-2">{blocks.map((block)=>{const ItemIcon=block.icon; return <article key={block.title} className="flex gap-4 border-t border-zinc-200 py-5"><span className="mt-1 shrink-0 text-[#004AAD]"><ItemIcon size={18}/></span><div><h2 className="text-lg font-black">{block.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{block.text}</p></div></article>})}</section>
    <section className="grid gap-8 border-t border-zinc-200 py-8 md:grid-cols-[.75fr_1.25fr]"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#004AAD]">INQUIRY FLOW</p><h2 className="mt-2 text-2xl font-black">먼저 알려주실 내용</h2></div><div><p className="text-sm leading-7 text-zinc-600">행사 목적, 희망 날짜와 이용 시간, 예상 인원, 설치·장비 계획을 준비해 주세요. 아직 정해지지 않은 항목은 ‘미정’으로 남길 수 있습니다. 확인되지 않은 이용 가능 일정과 비용은 문의 후 안내드립니다.</p><div className="mt-5 flex items-start gap-3 rounded-lg bg-[#F4F8E5] px-4 py-3 text-sm leading-6 text-zinc-800"><CircleHelp size={17} className="mt-1 shrink-0 text-zinc-900"/>신청서 제출만으로 일정이 예약되거나 계약이 성립하지 않습니다.</div><button type="button" onClick={onContinue} className="mt-7 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-zinc-950 px-5 py-3 text-sm font-bold">문의서 작성 <ArrowRight size={15}/></button></div></section>
  </main>;
}

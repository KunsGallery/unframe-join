import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Lightbulb, Users, Handshake, Send } from "lucide-react";
import { callSalonFunction } from "../lib/salonApi";
import { auth } from "../lib/firebase";

const fields = [
  ["제안 제목", "title", "text"], ["팀 / 브랜드명", "organization", "text"],
  ["담당자 이름", "name", "text"], ["연락처", "phone", "tel"], ["이메일", "email", "email"],
  ["협업 분야", "category", "select"], ["아이디어와 목표", "idea", "textarea"],
  ["희망하는 UNFRAME의 역할", "desiredRole", "textarea"], ["일정 / 예산 메모", "timelineBudget", "textarea"],
];
const options = ["공동 기획", "브랜드·콘텐츠", "음악·미디어", "기술·인터랙티브", "기타 제안"];

export default function CollaborationInfoPage({ onBack, handleLogin }) {
  const [form, setForm] = useState({ category: options[0], privacyAgreed: false });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!auth.currentUser || auth.currentUser.isAnonymous) { setError("문의서를 보내기 전에 로그인해 주세요."); return; }
    setState("saving"); setError("");
    try {
      await callSalonFunction("submit-application", { ...form, trackType: "collaboration" });
      setState("done");
    } catch (e) { console.error(e); setError(e.message || "문의서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); setState("idle"); }
  };
  return <main className="mx-auto max-w-6xl px-1 pb-16 text-zinc-950">
    <button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-zinc-600"><ArrowLeft size={16}/> 메인으로</button>
    <header className="border-b border-zinc-200 pb-10 md:pb-14"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">UNFRAME COLLABORATION</p><h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight md:text-6xl">함께 만들고 싶은 일을<br className="hidden md:block"/> 들려주세요</h1><p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600">구체적인 기획이 완성되지 않은 아이디어도 환영합니다. 제안 내용을 검토한 뒤 미팅과 역할, 일정 및 조건을 함께 논의합니다.</p></header>
    <section className="grid gap-4 border-b border-zinc-200 py-8 md:grid-cols-3">{[[Lightbulb,"아이디어 접수","초기 구상 단계에서도 제안할 수 있습니다."],[Users,"함께 검토","협업 방식과 각자의 역할을 논의합니다."],[Handshake,"조건 협의","실행 여부와 일정은 별도 협의로 정합니다."]].map(([icon,title,desc])=>{const ItemIcon=icon; return <article key={title} className="border-t-2 border-zinc-950 py-4"><ItemIcon className="text-[#004AAD]" size={20}/><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{desc}</p></article>})}</section>
    {state === "done" ? <section className="py-12"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">RECEIVED</p><h2 className="mt-3 text-3xl font-black">협업 제안이 접수되었습니다.</h2><p className="mt-3 text-sm text-zinc-600">접수 검토 후 입력하신 연락처를 통해 안내드리겠습니다. 제안 접수는 협업 확정이 아닙니다.</p><button onClick={onBack} className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">메인으로</button></section> : <section className="grid gap-8 py-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#004AAD]">PROPOSAL</p><h2 className="mt-2 text-2xl font-black">협업 제안서</h2><p className="mt-3 text-sm leading-6 text-zinc-600">필수 항목은 제목, 담당자, 연락처, 제안 내용입니다. 일정과 예산은 미정이어도 괜찮습니다.</p></div><form onSubmit={submit} className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{fields.map(([label,key,type])=><label key={key} className={`grid gap-2 text-sm font-bold ${type === "textarea" ? "sm:col-span-2" : ""}`}>{label}{type === "select" ? <select required value={form[key] || ""} onChange={e=>set(key,e.target.value)} className="min-h-12 rounded-lg border border-zinc-300 bg-white px-3">{options.map(o=><option key={o}>{o}</option>)}</select> : type === "textarea" ? <textarea required={key === "idea"} rows={4} value={form[key] || ""} onChange={e=>set(key,e.target.value)} className="rounded-lg border border-zinc-300 p-3"/> : <input required={["title","name","phone","email"].includes(key)} type={type} value={form[key] || ""} onChange={e=>set(key,e.target.value)} className="min-h-12 rounded-lg border border-zinc-300 px-3"/>}</label>)}<label className="flex items-start gap-3 text-sm leading-6 text-zinc-700 sm:col-span-2"><input required type="checkbox" checked={form.privacyAgreed} onChange={e=>set("privacyAgreed",e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#004AAD]"/>문의 검토와 회신을 위한 개인정보 수집 및 이용에 동의합니다.</label>{error&&<p role="alert" className="sm:col-span-2 text-sm font-bold text-red-700">{error}</p>}<div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button disabled={state === "saving"} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#004AAD] px-6 text-sm font-bold text-white disabled:opacity-50"><Send size={16}/>{state === "saving" ? "접수 중..." : "협업 제안 보내기"}<ArrowRight size={16}/></button>{(!auth.currentUser || auth.currentUser.isAnonymous) && <button type="button" onClick={() => handleLogin?.()} className="min-h-12 rounded-full border border-zinc-300 px-5 text-sm font-bold">로그인</button>}</div></form></section>}
  </main>;
}

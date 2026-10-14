import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const PURPOSES = ["전시", "팝업·쇼룸", "촬영", "토크·워크숍", "기타"];
const INITIAL = { title: "", organization: "", name: "", phone: "", email: "", purpose: PURPOSES[0], date: "", hours: "", attendees: "", plan: "", equipment: "", budget: "", privacyAgreed: false };
const inputClass = "min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/15";

export default function RentalInquiryForm({ db, user, handleLogin, onBack }) {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!user || user.isAnonymous) { setError("문의 내용을 보관하려면 로그인해 주세요."); return; }
    if (!form.privacyAgreed) { setError("개인정보 수집 및 이용에 동의해 주세요."); return; }
    setStatus("saving"); setError("");
    try {
      await addDoc(collection(db, "artifacts", "unframe-join", "public", "data", "applications"), {
        ...form, inquiryType: "space-rental", trackType: "rental", status: "review",
        userId: user.uid, applicantEmail: form.email || user.email || "", submittedAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (e) { console.error(e); setError("문의 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); setStatus("idle"); }
  };
  if (status === "done") return <section className="mx-auto max-w-3xl py-14"><span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Check size={20}/></span><h1 className="mt-5 text-3xl font-black">대관 문의가 접수되었습니다.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-800">문의 내용을 검토한 뒤 입력하신 연락처로 안내드립니다. 일정과 비용은 별도 협의 후 확정되며, 지금은 예약 상태가 아닙니다.</p><button type="button" onClick={onBack} className="mt-7 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">대관 안내로</button></section>;
  return <main className="mx-auto max-w-5xl pb-14 text-zinc-950">
    <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-zinc-600"><ArrowLeft size={16}/> 대관 안내</button>
    <header className="border-b border-zinc-200 pb-6"><h1 className="text-3xl font-black md:text-4xl">공간 이용 문의</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">확정되지 않은 일정·인원·예산은 ‘미정’으로 적어도 됩니다. 문의 접수는 일정 예약이나 계약 확정이 아닙니다.</p></header>
    {(!user || user.isAnonymous) && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EEF4FF] px-4 py-3"><p className="text-sm font-semibold text-zinc-700">문의 내용을 마이페이지에서 확인하려면 로그인해 주세요.</p><button type="button" onClick={handleLogin} className="rounded-full bg-[#004AAD] px-4 py-2 text-sm font-bold text-white">로그인</button></div>}
    <form onSubmit={submit} className="grid gap-x-5 gap-y-5 py-7 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">문의 제목<input required className={inputClass} value={form.title} onChange={e=>update("title",e.target.value)} placeholder="예: 11월 브랜드 팝업"/></label>
      <label className="grid gap-2 text-sm font-bold">이용 목적<select className={inputClass} value={form.purpose} onChange={e=>update("purpose",e.target.value)}>{PURPOSES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">팀 / 브랜드명<input className={inputClass} value={form.organization} onChange={e=>update("organization",e.target.value)}/></label>
      <label className="grid gap-2 text-sm font-bold">담당자 이름<input required className={inputClass} value={form.name} onChange={e=>update("name",e.target.value)}/></label>
      <label className="grid gap-2 text-sm font-bold">연락처<input required type="tel" className={inputClass} value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="010-0000-0000"/></label>
      <label className="grid gap-2 text-sm font-bold">회신 이메일<input required type="email" className={inputClass} value={form.email || user?.email || ""} onChange={e=>update("email",e.target.value)}/></label>
      <label className="grid gap-2 text-sm font-bold">희망 날짜<input type="date" className={inputClass} value={form.date} onChange={e=>update("date",e.target.value)}/><span className="text-xs font-normal text-zinc-500">미정이면 비워 두세요.</span></label>
      <label className="grid gap-2 text-sm font-bold">이용 시간 / 기간<input className={inputClass} value={form.hours} onChange={e=>update("hours",e.target.value)} placeholder="예: 3일, 오전 10시–오후 6시"/></label>
      <label className="grid gap-2 text-sm font-bold">예상 인원<input inputMode="numeric" className={inputClass} value={form.attendees} onChange={e=>update("attendees",e.target.value)} placeholder="미정 가능"/></label>
      <label className="grid gap-2 text-sm font-bold">예산 범위<input className={inputClass} value={form.budget} onChange={e=>update("budget",e.target.value)} placeholder="미정 가능"/></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">공간 활용 계획<textarea required rows={5} className="w-full rounded-lg border border-zinc-300 p-3 text-sm outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/15" value={form.plan} onChange={e=>update("plan",e.target.value)} placeholder="행사 내용과 공간을 어떻게 사용할지 적어 주세요."/></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">반입 장비 / 설치 요청<textarea rows={3} className="w-full rounded-lg border border-zinc-300 p-3 text-sm outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/15" value={form.equipment} onChange={e=>update("equipment",e.target.value)} placeholder="없으면 비워 두세요."/></label>
      <label className="flex items-start gap-3 text-sm font-medium leading-6 text-zinc-700 sm:col-span-2"><input type="checkbox" checked={form.privacyAgreed} onChange={e=>update("privacyAgreed",e.target.checked)} className="mt-1 h-4 w-4 accent-[#004AAD]"/>문의 검토와 회신을 위한 개인정보 수집 및 이용에 동의합니다.</label>
      {error && <p role="alert" className="sm:col-span-2 text-sm font-bold text-red-700">{error}</p>}
      <div className="sm:col-span-2"><button disabled={status === "saving"} className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[#004AAD] px-6 text-sm font-bold text-white disabled:opacity-50"><Send size={16}/>{status === "saving" ? "문의 접수 중..." : "대관 문의 보내기"}<ArrowRight size={16}/></button></div>
    </form>
  </main>;
}

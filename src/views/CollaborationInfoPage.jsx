import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { fillContactFromProfile } from "../lib/profilePrefill";
import { callSalonFunction } from "../lib/salonApi";

const options = ["공동 기획", "브랜드·콘텐츠", "음악·미디어", "기술·인터랙티브", "기타 제안"];
const fields = [
  { label: "제안 제목", key: "title", required: true },
  { label: "팀 / 브랜드명", key: "organization" },
  { label: "담당자 이름", key: "name", required: true },
  { label: "연락처", key: "phone", type: "tel", required: true },
  { label: "회신 이메일", key: "email", type: "email", required: true },
  { label: "협업 분야", key: "category", type: "select" },
  { label: "아이디어와 목표", key: "idea", type: "textarea", required: true },
  { label: "희망하는 UNFRAME의 역할", key: "desiredRole", type: "textarea" },
  { label: "일정 / 예산 메모", key: "timelineBudget", type: "textarea" },
  { label: "소개 자료 / 참고 링크", key: "referenceUrl", type: "url" },
];
const inputClass = "min-h-12 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/15";

export default function CollaborationInfoPage({ user, initialProfileData, onBack, handleLogin, onViewInquiry }) {
  const [form, setForm] = useState({ category: options[0], privacyAgreed: false });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const signedIn = user && !user.isAnonymous;
  useEffect(() => {
    // The saved profile arrives after this form mounts, and typed values must survive it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => fillContactFromProfile(current, initialProfileData, user?.email || ""));
  }, [initialProfileData, user?.email]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!signedIn) { setError("로그인 후 제안서를 보내주세요."); return; }
    if (!form.privacyAgreed) { setError("개인정보 수집 및 이용에 동의해 주세요."); return; }
    if (state === "saving") return;
    setState("saving");
    setError("");
    try {
      const result = await callSalonFunction("submit-application", { ...form, trackType: "collaboration" });
      setInquiryId(result.applicationId);
      setState("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (failure) {
      console.error(failure);
      setError(failure.message || "제안서를 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 보내주세요.");
      setState("idle");
    }
  };

  if (state === "done") return (
    <section className="mx-auto max-w-3xl py-14">
      <Check size={28} className="text-emerald-700" />
      <h1 className="mt-5 text-3xl font-black">협업 제안이 접수되었습니다.</h1>
      <p className="mt-3 text-sm leading-7 text-zinc-600">제안 내용을 검토한 뒤 입력하신 연락처로 안내드리겠습니다. 접수는 협업 확정이 아니며, 진행 여부와 조건은 별도 협의로 정합니다.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={() => onViewInquiry?.(inquiryId)} className="rounded-lg bg-[#004AAD] px-5 py-3 text-sm font-bold text-white">내 제안 확인</button>
        <button type="button" onClick={onBack} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-bold">메인으로</button>
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl pb-16 text-zinc-950">
      <button type="button" onClick={onBack} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-zinc-600"><ArrowLeft size={16} /> 메인으로</button>
      <header className="border-b border-zinc-200 pb-9">
        <h1 className="text-4xl font-black leading-tight md:text-5xl">UNFRAME 협업 문의</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600">전시와 공동 기획, 브랜드·콘텐츠 협업, 음악·미디어 프로젝트까지. 언프레임과 함께 만들고 싶은 일을 들려주세요. 초기 아이디어도 제안할 수 있습니다.</p>
        <a href="#collaboration-form" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#004AAD] px-6 text-sm font-bold text-white">협업 제안하기 <ArrowRight size={16} /></a>
      </header>
      <section className="grid gap-6 border-b border-zinc-200 py-7 sm:grid-cols-3" aria-label="협업 진행 과정">
        {[["제안 접수", "아이디어와 목표, 필요한 역할을 알려주세요."], ["내용 검토", "협업 방향과 가능 여부를 확인한 뒤 연락드립니다."], ["조건 협의", "미팅을 통해 각자의 역할과 일정, 비용을 정합니다."]].map(([title, text], index) => (
          <div key={title}><h2 className="text-base font-bold"><span className="mr-2 text-[#004AAD]">{index + 1}.</span>{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p></div>
        ))}
      </section>
      <section id="collaboration-form" className="grid scroll-mt-28 gap-8 py-10 lg:grid-cols-[.65fr_1.35fr]">
        <div><h2 className="text-2xl font-black">협업 제안서</h2><p className="mt-3 text-sm leading-7 text-zinc-600">제안 내용과 회신받을 연락처를 입력해 주세요. 참고 링크와 일정, 예산은 선택 사항입니다.</p></div>
        <div className="min-w-0">
          {!signedIn && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EEF4FF] p-4"><p className="text-sm font-semibold text-zinc-700">로그인하면 제안 내용과 검토 상태를 마이페이지에서 확인할 수 있습니다.</p><button type="button" onClick={handleLogin} className="min-h-11 rounded-lg bg-[#004AAD] px-4 text-sm font-bold text-white">로그인하고 작성</button></div>}
          <form onSubmit={submit}>
            <fieldset disabled={!signedIn || state === "saving"} className="grid min-w-0 gap-x-4 gap-y-5 sm:grid-cols-2 disabled:opacity-60">
              {fields.map(({ label, key, type = "text", required }) => (
                <label key={key} className={`grid min-w-0 gap-2 text-sm font-bold ${type === "textarea" || key === "referenceUrl" ? "sm:col-span-2" : ""}`}>
                  <span>{label}{required && <span className="ml-1 text-red-700">*</span>}</span>
                  {type === "select" ? <select value={form[key]} onChange={e => update(key, e.target.value)} className={inputClass}>{options.map(option => <option key={option}>{option}</option>)}</select>
                    : type === "textarea" ? <textarea required={required} rows={4} value={form[key] ?? ""} onChange={e => update(key, e.target.value)} className={inputClass} />
                      : <input required={required} type={type} value={form[key] ?? (key === "email" ? user?.email || "" : "")} onChange={e => update(key, e.target.value)} className={inputClass} />}
                </label>
              ))}
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700 sm:col-span-2"><input required type="checkbox" checked={form.privacyAgreed} onChange={e => update("privacyAgreed", e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#004AAD]" />문의 검토와 회신을 위한 개인정보 수집 및 이용에 동의합니다.</label>
              <button disabled={state === "saving"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#004AAD] px-6 text-sm font-bold text-white sm:col-span-2"><Send size={16} />{state === "saving" ? "제안 접수 중..." : "협업 제안 보내기"}</button>
            </fieldset>
            {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}

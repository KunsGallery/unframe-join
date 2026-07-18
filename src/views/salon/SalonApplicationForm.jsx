import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getSalonAvailability } from "../../constants/salon";
import { callSalonFunction } from "../../lib/salonApi";
import { unframeDesign } from "../../components/ui/unframeDesign";
import { useSalonEvent } from "./useSalonEvent";

const EMPTY = { applicantName: "", phone: "", email: "", nickname: "", privacyAgreed: false };
const SalonApplicationForm = ({ slug, user, initialProfileData, onBack, onComplete }) => {
  const { loading, event, error } = useSalonEvent(slug);
  const [form, setForm] = useState(EMPTY);
  const [customAnswers, setCustomAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  useEffect(() => {
    setForm((current) => ({ ...current, applicantName: current.applicantName || initialProfileData?.realName || user?.displayName || "", phone: current.phone || initialProfileData?.phone || "", email: current.email || user?.email || "" }));
  }, [initialProfileData, user]);
  const fields = useMemo(() => event?.formSettings?.fields || {}, [event]);
  if (loading) return <div className="py-24 text-center font-black">신청 양식을 불러오는 중입니다.</div>;
  if (!event) return <div className="py-24 text-center font-black">{error}</div>;
  const availability = getSalonAvailability(event);
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (e) => {
    e.preventDefault(); setSubmitError("");
    if (!availability.available) return setSubmitError(availability.reason);
    const privacy = event.formSettings?.privacy;
    if (privacy?.enabled !== false && privacy?.required !== false && !form.privacyAgreed) return setSubmitError("개인정보 수집 및 이용에 동의해 주세요.");
    setSubmitting(true);
    try {
      const customFieldAnswers = Object.fromEntries((event.formSettings?.customFields || []).map((field) => [field.id, { label: field.label || field.id, type: field.type || "text", value: customAnswers[field.id] ?? "" }]));
      const result = await callSalonFunction("submit-salon-application", { salonId: event.id, ...form, customFieldAnswers });
      onComplete({ salonTitle: event.title, status: result.status });
    } catch (err) { setSubmitError(err.message); } finally { setSubmitting(false); }
  };
  return <section className="mx-auto max-w-3xl py-4 md:py-8"><button type="button" onClick={onBack} className={unframeDesign.secondaryButton}><ArrowLeft size={14} /> 상세로</button>
    <form onSubmit={submit} className="mt-6 rounded-[36px] border-2 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_#000] md:p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">Application</p><h1 className="mt-3 text-3xl font-black tracking-tight break-keep">{event.title} 참가 신청</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {Object.entries(fields).map(([key, setting]) => { const formKey = key === "name" ? "applicantName" : key; return setting.enabled === false ? null : <label key={key} className="block"><span className="text-xs font-black">{setting.label}{setting.required !== false && <b className="text-red-500"> *</b>}</span><input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} required={setting.required !== false} value={form[formKey] || ""} onChange={(e) => setValue(formKey, e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold outline-none focus:border-[#004aad]" /></label>; })}
        {(event.formSettings?.customFields || []).map((field) => <label key={field.id} className="block"><span className="text-xs font-black">{field.label}{field.required && <b className="text-red-500"> *</b>}</span>{field.type === "textarea" ? <textarea required={field.required} value={customAnswers[field.id] || ""} onChange={(e) => setCustomAnswers((v) => ({ ...v, [field.id]: e.target.value }))} className="mt-2 min-h-28 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold" /> : field.type === "checkbox" ? <input type="checkbox" checked={Boolean(customAnswers[field.id])} onChange={(e) => setCustomAnswers((v) => ({ ...v, [field.id]: e.target.checked }))} className="ml-3 mt-3 h-5 w-5" /> : <input required={field.required} value={customAnswers[field.id] || ""} onChange={(e) => setCustomAnswers((v) => ({ ...v, [field.id]: e.target.value }))} className="mt-2 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold" />}</label>)}
      </div>
      {event.formSettings?.privacy?.enabled !== false && <div className="mt-7 rounded-[24px] bg-zinc-100 p-5"><h2 className="font-black">{event.formSettings.privacy.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600">{event.formSettings.privacy.body}</p><label className="mt-4 flex items-start gap-3 font-bold"><input type="checkbox" checked={form.privacyAgreed} onChange={(e) => setValue("privacyAgreed", e.target.checked)} className="mt-1 h-5 w-5" />{event.formSettings.privacy.checkboxLabel}</label></div>}
      {submitError && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{submitError}</p>}
      <button type="submit" disabled={submitting || !availability.available} className={`${unframeDesign.primaryButton} mt-7 w-full justify-center disabled:opacity-40`}><CheckCircle2 size={17} />{submitting ? "신청 저장 중..." : "참가 신청 완료"}</button>
    </form>
  </section>;
};
export default SalonApplicationForm;

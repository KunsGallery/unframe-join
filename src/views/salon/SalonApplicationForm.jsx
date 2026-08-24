import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Music, Search } from "lucide-react";
import { getSalonAvailability } from "../../constants/salon";
import { callSalonFunction } from "../../lib/salonApi";
import { unframeDesign } from "../../components/ui/unframeDesign";
import { useSalonEvent } from "./useSalonEvent";

const EMPTY = { applicantName: "", phone: "", nickname: "", privacyAgreed: false };
const choiceFieldTypes = new Set(["select", "radio", "checkboxes"]);
const getFieldOptions = (field) => (Array.isArray(field?.options) ? field.options : []).filter((option) => String(option?.label || "").trim());
const isEmptyAnswer = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object") {
    return !value.selected?.videoId && !String(value.manual || "").trim();
  }
  return value === undefined || value === null || value === "" || value === false;
};

const MusicSearchField = ({ field, value, onChange, className = "" }) => {
  const [query, setQuery] = useState(value?.query || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const selected = value?.selected || null;
  const manual = value?.manual || "";

  const searchMusic = async () => {
    if (!query.trim()) return setError("검색어를 입력해 주세요.");
    setSearching(true);
    setError("");
    try {
      const response = await fetch(`/.netlify/functions/search-youtube-music?q=${encodeURIComponent(query.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "YouTube 검색에 실패했습니다.");
      setResults(result.items || []);
      if ((result.items || []).length === 0) setError("검색 결과가 없습니다. 직접 입력으로 남겨 주세요.");
    } catch (err) {
      setError(err.message || "YouTube 검색에 실패했습니다. 직접 입력으로 남겨 주세요.");
    } finally {
      setSearching(false);
    }
  };

  return <div className={`rounded-2xl border-2 border-zinc-200 p-4 ${className}`}>
    <div className="flex items-start gap-2">
      <Music size={18} className="mt-0.5 text-[#004aad]" />
      <div>
        <p className="text-xs font-black">{field.label}{field.required && <b className="text-red-500"> *</b>}</p>
        {field.description && <p className="mt-1 whitespace-pre-line text-xs font-bold leading-5 text-zinc-500">{field.description}</p>}
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <input value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...(value || {}), query: e.target.value }); }} placeholder="곡명 또는 아티스트 검색" className="min-w-0 flex-1 rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold outline-none focus:border-[#004aad]" />
      <button type="button" onClick={searchMusic} disabled={searching} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40"><Search size={15} />{searching ? "검색 중" : "검색"}</button>
    </div>
    {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
    {selected && <a href={selected.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-[#004aad] bg-blue-50 p-3 text-left"><img src={selected.thumbnailUrl} alt="" className="h-14 w-20 rounded-xl object-cover" /><span className="min-w-0"><b className="block truncate text-sm">{selected.title}</b><small className="block truncate font-bold text-zinc-500">{selected.channelTitle}</small></span></a>}
    {results.length > 0 && <div className="mt-3 grid gap-2">{results.map((item) => <button key={item.videoId} type="button" onClick={() => onChange({ ...(value || {}), query, selected: item })} className={`flex items-center gap-3 rounded-2xl border p-2 text-left ${selected?.videoId === item.videoId ? "border-[#004aad] bg-blue-50" : "border-zinc-200 bg-white"}`}><img src={item.thumbnailUrl} alt="" className="h-12 w-16 rounded-xl object-cover" /><span className="min-w-0"><b className="block truncate text-sm">{item.title}</b><small className="block truncate font-bold text-zinc-500">{item.channelTitle}</small></span></button>)}</div>}
    <input value={manual} onChange={(e) => onChange({ ...(value || {}), manual: e.target.value })} placeholder="검색이 안 되면 곡명/아티스트/링크를 직접 입력해 주세요." className="mt-3 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold outline-none focus:border-[#004aad]" />
  </div>;
};

const SalonApplicationForm = ({ slug, user, initialProfileData, onBack, onComplete }) => {
  const { loading, event, error } = useSalonEvent(slug);
  const [form, setForm] = useState(EMPTY);
  const [customAnswers, setCustomAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  useEffect(() => {
    setForm((current) => ({ ...current, applicantName: current.applicantName || initialProfileData?.realName || user?.displayName || "", phone: current.phone || initialProfileData?.phone || "" }));
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
    const requiredCustomField = (event.formSettings?.customFields || []).find((field) => field.required && isEmptyAnswer(customAnswers[field.id]));
    if (requiredCustomField) return setSubmitError(`${requiredCustomField.label || "필수 질문"} 항목을 입력해 주세요.`);
    setSubmitting(true);
    try {
      const customFieldAnswers = Object.fromEntries((event.formSettings?.customFields || []).map((field) => [field.id, { label: field.label || field.id, description: field.description || "", type: field.type || "text", value: customAnswers[field.id] ?? (field.type === "checkboxes" ? [] : ""), options: choiceFieldTypes.has(field.type) ? getFieldOptions(field).map((option) => option.label) : [] }]));
      const result = await callSalonFunction("submit-salon-application", { salonId: event.id, ...form, customFieldAnswers });
      onComplete({
        salonTitle: event.title,
        status: result.status,
        applicantName: form.applicantName,
        paymentSettings: event.paymentSettings,
      });
    } catch (err) { setSubmitError(err.message); } finally { setSubmitting(false); }
  };
  return <section className="mx-auto max-w-3xl py-4 md:py-8"><button type="button" onClick={onBack} className={unframeDesign.secondaryButton}><ArrowLeft size={14} /> 상세로</button>
    <form onSubmit={submit} className="mt-6 rounded-[36px] border-2 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_#000] md:p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">Application</p><h1 className="mt-3 text-3xl font-black tracking-tight break-keep">{event.title} 참가 신청</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {Object.entries(fields).map(([key, setting]) => { const formKey = key === "name" ? "applicantName" : key; return setting.enabled === false ? null : <label key={key} className="block"><span className="text-xs font-black">{setting.label}{setting.required !== false && <b className="text-red-500"> *</b>}</span><input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} required={setting.required !== false} value={form[formKey] || ""} onChange={(e) => setValue(formKey, e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold outline-none focus:border-[#004aad]" /></label>; })}
        {(event.formSettings?.customFields || []).map((field) => {
          const options = getFieldOptions(field);
          const value = customAnswers[field.id];
          const setCustomValue = (nextValue) => setCustomAnswers((v) => ({ ...v, [field.id]: nextValue }));
          const fieldLayoutClass = field.layout === "full" ? "sm:col-span-2" : "";
          const commonTitle = <><span className="text-xs font-black">{field.label}{field.required && <b className="text-red-500"> *</b>}</span>{field.description && <p className="mt-1 whitespace-pre-line text-xs font-bold leading-5 text-zinc-500">{field.description}</p>}</>;
          if (field.type === "music") return <MusicSearchField key={field.id} field={field} value={value || {}} onChange={setCustomValue} className={fieldLayoutClass} />;
          if (field.type === "textarea") return <label key={field.id} className={`block ${fieldLayoutClass}`}>{commonTitle}<textarea required={field.required} value={value || ""} onChange={(e) => setCustomValue(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold" /></label>;
          if (field.type === "checkbox") return <label key={field.id} className={`block rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold ${fieldLayoutClass}`}><input type="checkbox" required={field.required} checked={Boolean(value)} onChange={(e) => setCustomValue(e.target.checked)} className="mr-3 h-5 w-5 align-middle" />{commonTitle}</label>;
          if (field.type === "select") return <label key={field.id} className={`block ${fieldLayoutClass}`}>{commonTitle}<select required={field.required} value={value || ""} onChange={(e) => setCustomValue(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 font-bold outline-none focus:border-[#004aad]"><option value="">선택해 주세요</option>{options.map((option) => <option key={option.id || option.label} value={option.label}>{option.label}</option>)}</select></label>;
          if (field.type === "radio") return <fieldset key={field.id} className={`block rounded-2xl border-2 border-zinc-200 p-4 ${fieldLayoutClass}`}><legend className="px-1 text-xs font-black">{field.label}{field.required && <b className="text-red-500"> *</b>}</legend>{field.description && <p className="mt-1 whitespace-pre-line text-xs font-bold leading-5 text-zinc-500">{field.description}</p>}<div className="mt-2 grid gap-2">{options.map((option) => <label key={option.id || option.label} className="flex items-center gap-2 text-sm font-bold"><input type="radio" name={`custom-${field.id}`} required={field.required} checked={value === option.label} onChange={() => setCustomValue(option.label)} />{option.label}</label>)}</div></fieldset>;
          if (field.type === "checkboxes") return <fieldset key={field.id} className={`block rounded-2xl border-2 border-zinc-200 p-4 ${fieldLayoutClass}`}><legend className="px-1 text-xs font-black">{field.label}{field.required && <b className="text-red-500"> *</b>}</legend>{field.description && <p className="mt-1 whitespace-pre-line text-xs font-bold leading-5 text-zinc-500">{field.description}</p>}<div className="mt-2 grid gap-2">{options.map((option) => <label key={option.id || option.label} className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Array.isArray(value) && value.includes(option.label)} onChange={(e) => setCustomValue(e.target.checked ? [...(Array.isArray(value) ? value : []), option.label] : (Array.isArray(value) ? value : []).filter((item) => item !== option.label))} />{option.label}</label>)}</div></fieldset>;
          return <label key={field.id} className={`block ${fieldLayoutClass}`}>{commonTitle}<input required={field.required} value={value || ""} onChange={(e) => setCustomValue(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-zinc-200 px-4 py-3 font-bold outline-none focus:border-[#004aad]" /></label>;
        })}
      </div>
      {event.formSettings?.privacy?.enabled !== false && <div className="mt-7 rounded-[24px] bg-zinc-100 p-5"><h2 className="font-black">{event.formSettings.privacy.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600">{event.formSettings.privacy.body}</p><label className="mt-4 flex items-start gap-3 font-bold"><input type="checkbox" checked={form.privacyAgreed} onChange={(e) => setValue("privacyAgreed", e.target.checked)} className="mt-1 h-5 w-5" />{event.formSettings.privacy.checkboxLabel}</label></div>}
      {submitError && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{submitError}</p>}
      <button type="submit" disabled={submitting || !availability.available} className={`${unframeDesign.primaryButton} mt-7 w-full justify-center disabled:opacity-40`}><CheckCircle2 size={17} />{submitting ? "신청 저장 중..." : "참가 신청 완료"}</button>
    </form>
  </section>;
};
export default SalonApplicationForm;

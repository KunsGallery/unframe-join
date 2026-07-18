import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { CheckCircle2, ExternalLink, Lightbulb, QrCode } from "lucide-react";

const SalonPassPage = ({ token }) => {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    let active = true;
    fetch(`/.netlify/functions/get-salon-pass?token=${encodeURIComponent(token || "")}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "QR을 확인할 수 없습니다."); return data; })
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message }));
    return () => { active = false; };
  }, [token]);
  if (state.loading) return <div className="py-24 text-center font-black">개인 입장 QR을 확인하는 중입니다.</div>;
  if (!state.data) return <section className="mx-auto max-w-lg py-20 text-center"><div className="rounded-[32px] border-2 border-red-700 bg-red-50 p-8"><QrCode className="mx-auto text-red-700" size={48} /><h1 className="mt-5 text-2xl font-black">QR을 사용할 수 없습니다.</h1><p className="mt-3 font-bold text-red-700">{state.error}</p></div></section>;
  const data = state.data;
  return <section className="mx-auto max-w-xl py-5 text-center"><div className={`rounded-[36px] border-2 border-zinc-900 p-7 shadow-[8px_8px_0px_#000] md:p-10 ${data.checkedIn ? "bg-[#AAD004]" : "bg-white"}`}>
    {data.checkedIn ? <><CheckCircle2 size={60} className="mx-auto" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em]">Checked in</p><h1 className="mt-3 text-4xl font-black">{data.welcomeScreenTitle || "입장이 확인되었습니다."}</h1><p className="mt-4 whitespace-pre-line font-bold">{data.welcomeScreenMessage || `${data.applicantDisplayName}님, ${data.salonTitle}에 오신 것을 환영합니다.`}</p><div className="mt-8 grid gap-3">{data.programUrl && <a href={data.programUrl} target="_blank" rel="noreferrer" className="rounded-full bg-zinc-950 px-6 py-4 font-black text-white">오늘의 프로그램 <ExternalLink className="ml-2 inline" size={16} /></a>}{data.guestbookUrl && <a href={data.guestbookUrl} target="_blank" rel="noreferrer" className="rounded-full border-2 border-zinc-900 bg-white px-6 py-4 font-black">온라인 방명록 <ExternalLink className="ml-2 inline" size={16} /></a>}</div></> : <><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">Personal entrance pass</p><h1 className="mt-3 text-3xl font-black break-keep">{data.salonTitle}</h1><p className="mt-2 font-bold text-zinc-500">{data.applicantDisplayName}님의 개인 QR</p><div className="mx-auto mt-7 w-full max-w-[320px] rounded-[28px] border-2 border-zinc-900 bg-white p-5"><QRCode value={data.qrPayload} size={270} className="h-auto w-full" /></div><p className="mt-5 font-black tracking-[0.3em]">확인 코드 {data.shortCode}</p><div className="mt-6 rounded-2xl bg-zinc-100 p-4 text-sm font-bold leading-6 text-zinc-600"><Lightbulb className="mr-2 inline" size={17} />화면 밝기를 높이고 운영자에게 이 화면을 보여주세요.</div><div className="mt-5 text-sm font-bold text-zinc-600"><p>{data.eventDateTime}</p><p>{data.venueName}</p></div></>}
  </div></section>;
};
export default SalonPassPage;

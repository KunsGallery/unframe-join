import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, CheckCircle2, Expand, Keyboard, Pause, Play, Search, Usb, XCircle } from "lucide-react";
import { callSalonFunction } from "../../lib/salonApi";
import { formatSalonDateTime } from "../../constants/salon";

const extractToken = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  try { const url = new URL(value); return url.searchParams.get("token") || value; } catch { return value; }
};

const SalonCheckInScanner = ({ salonId, applications, isAdmin }) => {
  const videoRef = useRef(null); const controlsRef = useRef(null); const cooldownRef = useRef(0); const bufferRef = useRef(""); const bufferTimerRef = useRef(null);
  const [devices, setDevices] = useState([]); const [deviceId, setDeviceId] = useState(() => localStorage.getItem("salon-checkin-camera") || ""); const [cameraActive, setCameraActive] = useState(false); const [paused, setPaused] = useState(true); const [result, setResult] = useState(null); const [recent, setRecent] = useState([]); const [rawInput, setRawInput] = useState(""); const [manualSearch, setManualSearch] = useState(""); const [error, setError] = useState("");
  const approved = useMemo(() => (applications || []).filter((item) => item.trackType === "salon" && item.salonId === salonId && item.status === "approved"), [applications, salonId]);
  const manualMatches = useMemo(() => { const term = manualSearch.trim().toLowerCase(); if (!term) return []; return approved.filter((item) => `${item.applicantName} ${String(item.phone || "").slice(-4)} ${item.id}`.toLowerCase().includes(term)).slice(0, 8); }, [approved, manualSearch]);

  const checkIn = useCallback(async ({ token = "", applicationId = "", method = "qr" }) => {
    if (Date.now() - cooldownRef.current < 1800) return;
    cooldownRef.current = Date.now(); setPaused(true); controlsRef.current?.stop(); setCameraActive(false); setError("");
    try {
      const response = await callSalonFunction("check-in-salon-participant", { token: extractToken(token), salonId, applicationId, method });
      const entry = { ...response, at: new Date(), tone: response.duplicate ? "duplicate" : "success" };
      setResult(entry); setRecent((items) => [entry, ...items].slice(0, 10));
    } catch (err) { const entry = { error: err.message, at: new Date(), tone: "error" }; setResult(entry); setRecent((items) => [entry, ...items].slice(0, 10)); }
  }, [salonId]);

  const stopCamera = useCallback(() => { controlsRef.current?.stop(); controlsRef.current = null; setCameraActive(false); setPaused(true); }, []);
  const requestCameras = useCallback(async () => {
    setError("");
    try { const permission = await navigator.mediaDevices.getUserMedia({ video: true }); permission.getTracks().forEach((track) => track.stop()); const list = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === "videoinput"); setDevices(list); if (!deviceId && list[0]) setDeviceId(list[0].deviceId); } catch (err) { setError(`카메라를 사용할 수 없습니다: ${err.message}`); }
  }, [deviceId]);
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return; stopCamera(); setError(""); setPaused(false);
    try { const reader = new BrowserMultiFormatReader(); const controls = await reader.decodeFromVideoDevice(deviceId || undefined, videoRef.current, (scanResult) => { if (scanResult && Date.now() - cooldownRef.current >= 1800) checkIn({ token: scanResult.getText(), method: "qr" }); }); controlsRef.current = controls; setCameraActive(true); if (deviceId) { localStorage.setItem("salon-checkin-camera", deviceId); } } catch (err) { setError(`QR 스캔을 시작할 수 없습니다: ${err.message}`); setPaused(true); }
  }, [checkIn, deviceId, stopCamera]);
  useEffect(() => { const timer = window.setTimeout(requestCameras, 0); return () => { window.clearTimeout(timer); stopCamera(); }; }, [requestCameras, stopCamera]);
  useEffect(() => {
    const onKey = (event) => { if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return; if (event.key === "Enter") { const value = bufferRef.current; bufferRef.current = ""; if (value.length > 10) checkIn({ token: value, method: "qr" }); return; } if (event.key.length === 1) { bufferRef.current += event.key; clearTimeout(bufferTimerRef.current); bufferTimerRef.current = setTimeout(() => { bufferRef.current = ""; }, 250); } };
    window.addEventListener("keydown", onKey); return () => { window.removeEventListener("keydown", onKey); clearTimeout(bufferTimerRef.current); };
  }, [checkIn]);
  if (!isAdmin) return <div className="py-24 text-center text-2xl font-black text-red-700">관리자 인증이 필요합니다.</div>;
  const tone = result?.tone === "success" ? "bg-[#AAD004]" : result?.tone === "duplicate" ? "bg-amber-100" : result ? "bg-red-50" : "bg-white";
  return <section className="py-2"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">SALON CHECK-IN</p><h1 className="text-3xl font-black">현장 입장 데스크</h1></div><button onClick={() => document.documentElement.requestFullscreen?.()} className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-xs font-black"><Expand size={15} /> 전체화면</button></div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-[30px] border-2 border-zinc-900 bg-zinc-950 p-4 shadow-[6px_6px_0px_#000]"><div className="relative aspect-video overflow-hidden rounded-[22px] bg-black"><video ref={videoRef} muted playsInline className="h-full w-full object-cover" />{!cameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center text-white"><Camera size={50} /><p className="mt-4 font-black">카메라를 선택하고 스캔을 시작하세요.</p></div>}</div><div className="mt-4 flex flex-wrap gap-2"><select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="min-w-52 flex-1 rounded-full bg-white px-4 py-2 text-xs font-black">{devices.map((item, index) => <option key={item.deviceId} value={item.deviceId}>{item.label || `카메라 ${index + 1}`}</option>)}</select><button onClick={requestCameras} className="rounded-full bg-white px-4 py-2 text-xs font-black">카메라 새로고침</button>{cameraActive ? <button onClick={stopCamera} className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-black"><Pause size={14} /> 일시정지</button> : <button onClick={startCamera} className="inline-flex items-center gap-2 rounded-full bg-[#AAD004] px-4 py-2 text-xs font-black"><Play size={14} /> {paused ? "스캔 시작" : "재시작"}</button>}</div>{error && <p className="mt-3 rounded-xl bg-red-950 p-3 text-xs font-bold text-red-200">{error}</p>}</div>
      <div className={`flex min-h-[24rem] flex-col justify-center rounded-[30px] border-2 border-zinc-900 p-7 shadow-[6px_6px_0px_#000] ${tone}`}>{result?.tone === "success" ? <CheckCircle2 size={68} /> : result ? <XCircle size={68} /> : <QrCodeIcon />}<p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em]">Check-in result</p><h2 className="mt-2 text-4xl font-black break-keep">{result ? result.error || result.message : "QR을 스캔해 주세요"}</h2>{result?.participant && <p className="mt-4 text-2xl font-black">{result.participant.name}</p>}{result && <button onClick={() => { setResult(null); startCamera(); }} className="mt-8 rounded-full bg-zinc-950 px-6 py-4 font-black text-white">다음 참가자</button>}</div></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="rounded-[28px] border-2 border-zinc-900 bg-white p-5"><h3 className="flex items-center gap-2 font-black"><Keyboard size={18} /> QR 문자열 / USB 스캐너</h3><div className="mt-4 flex gap-2"><input value={rawInput} onChange={(e) => setRawInput(e.target.value)} placeholder="QR URL 또는 token 붙여넣기" className="min-w-0 flex-1 rounded-full border-2 border-zinc-200 px-4 py-2 text-sm font-bold" /><button onClick={() => checkIn({ token: rawInput, method: "qr" })} className="rounded-full bg-zinc-950 px-5 text-xs font-black text-white">확인</button></div><p className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-500"><Usb size={14} /> USB 스캐너는 화면 어디서나 스캔 후 Enter 입력을 인식합니다.</p></div>
      <div className="rounded-[28px] border-2 border-zinc-900 bg-white p-5"><h3 className="flex items-center gap-2 font-black"><Search size={18} /> 수동 체크인</h3><input value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} placeholder="이름 · 전화번호 뒤 4자리 · 신청번호" className="mt-4 w-full rounded-full border-2 border-zinc-200 px-4 py-2 text-sm font-bold" /><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{manualMatches.map((item) => <button key={item.id} onClick={() => checkIn({ applicationId: item.id, method: "manual" })} className="flex w-full items-center justify-between rounded-2xl bg-zinc-100 p-3 text-left"><span><b>{item.applicantName || item.nickname}</b><br /><small>•••• {String(item.phone || "").slice(-4)} · {item.id.slice(0, 8)}</small></span><span className="text-xs font-black">{item.checkedInAt ? "입장 완료" : "수동 입장"}</span></button>)}</div></div></div>
    <div className="mt-6 rounded-[28px] border-2 border-zinc-900 bg-white p-5"><h3 className="font-black">최근 체크인</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{recent.map((item, index) => <div key={`${item.at}-${index}`} className="rounded-2xl bg-zinc-100 p-3 text-sm"><b>{item.participant?.name || item.error || item.message}</b><span className="float-right text-xs text-zinc-500">{formatSalonDateTime(item.at)}</span></div>)}</div></div>
  </section>;
};
const QrCodeIcon = () => <div className="grid h-16 w-16 grid-cols-3 gap-1">{Array.from({ length: 9 }).map((_, i) => <span key={i} className={i % 2 ? "bg-zinc-300" : "bg-zinc-900"} />)}</div>;
export default SalonCheckInScanner;

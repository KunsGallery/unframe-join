import React from "react";
import { CheckCircle2 } from "lucide-react";
import { unframeDesign } from "../../components/ui/unframeDesign";
const SalonApplicationComplete = ({ context, onHome }) => <section className="mx-auto max-w-2xl py-16 text-center"><div className="rounded-[36px] border-2 border-zinc-900 bg-white p-9 shadow-[8px_8px_0px_#000]"><CheckCircle2 size={56} className="mx-auto text-[#004aad]" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Application complete</p><h1 className="mt-3 text-4xl font-black">신청이 완료되었습니다.</h1><p className="mt-5 font-bold leading-7 text-zinc-600">{context?.salonTitle || "SALON"} 신청을 확인했습니다.<br />{context?.status === "waitlisted" ? "현재 정원이 마감되어 대기 신청으로 접수되었습니다." : "관리자 검토 후 참가 확정 안내를 보내드립니다."}</p><button type="button" onClick={onHome} className={`${unframeDesign.primaryButton} mt-8`}>SALON 목록으로</button></div></section>;
export default SalonApplicationComplete;

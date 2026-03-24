import React from "react";
import { Loader2, CheckCircle, Upload } from "lucide-react";

const FileBtn = ({ label, hasFile, onClick, loading, isPrimary }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`py-8 border rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden text-center shadow-sm ${
      hasFile
        ? isPrimary
          ? "bg-[#004aad] text-white border-transparent shadow-[#004aad]/20"
          : "bg-zinc-900 text-white border-transparent"
        : "border-zinc-100 hover:bg-zinc-50 text-zinc-800"
    }`}
  >
    {loading ? (
      <Loader2 className="animate-spin" size={20} />
    ) : hasFile ? (
      <CheckCircle size={20} />
    ) : (
      <Upload size={20} />
    )}
    {hasFile ? `${label} 완료` : `${label} 업로드`}
    {!hasFile && <span className="text-[7px] opacity-40">PDF, ZIP 가능</span>}
  </button>
);

export default FileBtn;
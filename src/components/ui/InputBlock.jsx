import React from "react";

const InputBlock = ({ label, placeholder, required, ...props }) => (
  <div className="space-y-4 text-zinc-900 text-left">
    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2 font-bold text-left">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      placeholder={placeholder}
      className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-7 rounded-[24px] focus:outline-none focus:bg-white font-bold text-base md:text-lg shadow-sm text-zinc-900 transition-all text-left transition-colors font-sans"
      {...props}
    />
  </div>
);

export default InputBlock;
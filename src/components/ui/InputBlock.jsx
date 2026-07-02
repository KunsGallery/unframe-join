import React from "react";
import { unframeDesign } from "./unframeDesign";

const InputBlock = ({ label, placeholder, required, variant = "public", ...props }) => (
  <div className="space-y-3 text-zinc-900 text-left">
    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad] text-left">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      placeholder={placeholder}
      className={variant === "admin" ? unframeDesign.inputAdmin : unframeDesign.inputPublic}
      {...props}
    />
  </div>
);

export default InputBlock;

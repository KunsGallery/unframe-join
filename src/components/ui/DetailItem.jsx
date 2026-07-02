import React from "react";

const DetailItem = ({ label, value }) => (
  <div className="flex items-center gap-4 border-b border-zinc-200 pb-3 text-left">
    <span className="w-28 shrink-0 text-left text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
    </span>
    <span className="text-sm font-bold text-zinc-800 text-left">
      {value || "정보 없음"}
    </span>
  </div>
);

export default DetailItem;

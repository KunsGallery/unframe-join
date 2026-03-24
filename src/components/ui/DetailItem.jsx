import React from "react";

const DetailItem = ({ label, value }) => (
  <div className="flex items-center gap-6 border-b border-zinc-50 pb-3 text-left">
    <span className="text-[9px] font-black text-zinc-300 uppercase w-28 shrink-0 text-left">
      {label}
    </span>
    <span className="text-xs font-black text-zinc-800 text-left">
      {value || "정보 없음"}
    </span>
  </div>
);

export default DetailItem;
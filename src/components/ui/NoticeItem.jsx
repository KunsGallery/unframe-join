import React from "react";

const NoticeItem = ({ icon, text }) => (
  <div className="flex items-start gap-3 bg-white/70 p-4 rounded-2xl shadow-sm border border-zinc-100 text-left backdrop-blur-sm">
    <div className="text-[#004aad] mt-0.5">{icon}</div>
    <span className="text-[10px] md:text-[11px] font-bold text-zinc-600 leading-tight break-keep">
      {text}
    </span>
  </div>
);

export default NoticeItem;
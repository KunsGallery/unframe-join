import React from "react";
import { unframeDesign } from "./unframeDesign";

const NoticeItem = ({ icon, text }) => (
  <div className={`${unframeDesign.miniCard} flex items-start gap-3 p-4 text-left`}>
    <div className="mt-0.5 text-[#004aad]">{icon}</div>
    <span className="text-[10px] md:text-[11px] font-bold text-zinc-700 leading-tight break-keep">
      {text}
    </span>
  </div>
);

export default NoticeItem;

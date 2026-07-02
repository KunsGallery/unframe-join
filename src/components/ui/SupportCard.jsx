import React from "react";
import { unframeDesign } from "./unframeDesign";

const SupportCard = ({ icon, title, desc }) => (
  <div className={`${unframeDesign.sectionCard} p-8 md:p-10 group text-zinc-900 text-left transition-transform duration-500 hover:-translate-y-0.5`}>
    <div className="mb-8 text-zinc-200 transition-all duration-700 group-hover:scale-110 group-hover:text-[#004aad] text-left">
      {icon}
    </div>
    <h4 className="text-xl md:text-3xl font-black mb-4 uppercase tracking-tighter leading-tight text-left break-keep">
      {title}
    </h4>
    <p className="text-base md:text-lg text-zinc-600 font-medium leading-relaxed break-keep text-left">
      {desc}
    </p>
  </div>
);

export default SupportCard;

import React from "react";
import { unframeDesign } from "./unframeDesign";

const PreparationItem = ({ icon, title, desc }) => (
  <div className="space-y-6 md:space-y-8 group text-zinc-400 text-left">
    <div className="flex items-center gap-4 md:gap-6 transform group-hover:translate-x-4 transition-all duration-500 text-left">
      <div className="flex-shrink-0 rounded-3xl border-2 border-zinc-900 bg-[#AAD004] p-4 text-left shadow-[3px_3px_0px_#000]">
        {icon}
      </div>
      <h4 className="text-xl md:text-3xl font-black uppercase text-zinc-950 tracking-tighter leading-tight text-left">
        {title}
      </h4>
    </div>
    <p className="text-base md:text-lg font-medium leading-relaxed break-keep text-left text-zinc-700">
      {desc}
    </p>
  </div>
);

export default PreparationItem;

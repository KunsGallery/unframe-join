import React from "react";
import { unframeDesign } from "./unframeDesign";

const CheckCard = ({ icon, label, value }) => (
  <div className={`${unframeDesign.sectionCard} flex items-center justify-between bg-white p-6 md:p-8 transition-all hover:-translate-y-0.5`}>
    <div className="text-left">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-left text-[#004AAD]">
        {label}
      </p>
      <p className="text-5xl font-black leading-none text-left text-zinc-900">
        {value}
      </p>
    </div>
    <div className="rounded-3xl border-2 border-zinc-900 bg-[#AAD004] p-4 text-center shadow-[3px_3px_0px_#000]">{icon}</div>
  </div>
);

export default CheckCard;

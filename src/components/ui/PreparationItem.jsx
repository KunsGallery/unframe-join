import React from "react";

const PreparationItem = ({ icon, title, desc }) => (
  <div className="space-y-6 md:space-y-10 group text-zinc-400 text-left">
    <div className="flex items-center gap-4 md:gap-6 transform group-hover:translate-x-4 transition-all duration-500 text-left">
      <div className="p-4 md:p-5 bg-[#004aad]/10 rounded-2xl md:rounded-3xl flex-shrink-0 text-left">
        {icon}
      </div>
      <h4 className="text-xl md:text-3xl font-black uppercase text-white tracking-tighter leading-tight text-left">
        {title}
      </h4>
    </div>
    <p className="text-base md:text-lg font-light leading-relaxed break-keep text-left">
      {desc}
    </p>
  </div>
);

export default PreparationItem;
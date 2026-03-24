import React from "react";

const SupportCard = ({ icon, title, desc }) => (
  <div className="bg-white/80 p-12 border border-gray-50 shadow-sm rounded-[60px] hover:border-[#004aad] transition-all duration-500 group text-zinc-900 backdrop-blur-sm text-left shadow-sm">
    <div className="mb-12 text-zinc-200 group-hover:text-[#004aad] transition-all transform group-hover:scale-110 duration-700 text-left">
      {icon}
    </div>
    <h4 className="text-xl md:text-3xl font-black mb-4 uppercase tracking-tighter leading-tight text-left break-keep">
      {title}
    </h4>
    <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed break-keep text-left">
      {desc}
    </p>
  </div>
);

export default SupportCard;
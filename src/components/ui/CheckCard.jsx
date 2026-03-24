import React from "react";

const CheckCard = ({ icon, label, value }) => (
  <div className="bg-white p-10 rounded-[40px] border border-green-100 shadow-sm flex items-center justify-between transition-all hover:scale-105 bg-green-50 text-green-600">
    <div className="text-left">
      <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-left">
        {label}
      </p>
      <p className="text-5xl font-black text-zinc-900 leading-none text-left">
        {value}
      </p>
    </div>
    <div className="p-5 bg-white rounded-3xl shadow-lg text-center">{icon}</div>
  </div>
);

export default CheckCard;
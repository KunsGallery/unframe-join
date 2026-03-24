import React from "react";

const StatCard = ({ icon, label, value, color }) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100",
  };

  return (
    <div
      className={`bg-white p-10 rounded-[40px] border shadow-sm flex items-center justify-between transition-all hover:scale-105 ${colorMap[color]}`}
    >
      <div className="text-left">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-left">
          {label}
        </p>
        <p className="text-5xl font-black text-zinc-900 leading-none text-left">
          {value}
        </p>
      </div>
      <div className="p-5 bg-white rounded-3xl shadow-lg">{icon}</div>
    </div>
  );
};

export default StatCard;
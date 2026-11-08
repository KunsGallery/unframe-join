import React from "react";
import StoredFileAnchor from "./StoredFileAnchor";

const AdminLink = ({ href, icon, label }) => (
  <StoredFileAnchor
    value={href}
    className="flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all text-zinc-800 shadow-sm text-center"
  >
    {icon} {label}
  </StoredFileAnchor>
);

export default AdminLink;

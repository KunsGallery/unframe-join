import React from "react";
import { LogOut } from "lucide-react";

const Navbar = ({
  user,
  isAdmin,
  viewMode,
  setViewMode,
  handleLogin,
  handleSignOut,
  reset,
}) => (
  <nav className="fixed top-0 w-full z-[100] px-8 py-6 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-gray-100">
    <div
      className="text-2xl font-black tracking-tighter cursor-pointer"
      onClick={reset}
    >
      UNFRAME
    </div>

    <div className="flex gap-3 md:gap-4">
      {isAdmin && (
        <button
          onClick={() => setViewMode(viewMode === "admin" ? "user" : "admin")}
          className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full hover:bg-[#004aad] transition-all shadow-lg"
        >
          {viewMode === "admin" ? "Exit Admin" : "Admin Console"}
        </button>
      )}

      {user && !user.isAnonymous && (
        <button
          onClick={() => setViewMode("my-page")}
          className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
            viewMode === "my-page"
              ? "bg-[#004aad] text-white shadow-lg"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          My Page
        </button>
      )}

      {!user || user.isAnonymous ? (
        <button
          onClick={handleLogin}
          className="text-[10px] font-black uppercase tracking-widest border border-zinc-200 px-5 py-2.5 rounded-full hover:bg-black hover:text-white transition-all text-center"
        >
          Login
        </button>
      ) : (
        <div className="flex items-center gap-4 border-l pl-4 border-zinc-100">
          <span className="hidden md:inline text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {user.displayName}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[#004aad] transition-colors hover:text-red-500"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

export default Navbar;
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
  <nav className="fixed top-0 w-full z-[100] px-4 md:px-8 py-3 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-gray-100">
    <div
      className="text-lg md:text-2xl font-black tracking-tighter cursor-pointer"
      onClick={reset}
    >
      UNFRAME
    </div>

    <div className="flex items-center gap-2 md:gap-4">
      {user && !user.isAnonymous && (
        <button
          type="button"
          onClick={() => {
            if (!isAdmin) {
              window.alert(
                `관리자 권한이 없습니다.\n현재 로그인 이메일: ${user?.email || "없음"}\nAdmin 판별: NO`
              );
              return;
            }

            setViewMode(viewMode === "admin" ? "user" : "admin");
          }}
          className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.12em] md:tracking-widest px-3 md:px-4 py-2 rounded-full transition-all shadow-lg whitespace-nowrap ${
            isAdmin
              ? "bg-black text-white hover:bg-[#004aad]"
              : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          }`}
        >
          {isAdmin
            ? viewMode === "admin"
              ? "Exit Admin"
              : "Admin Console"
            : "관리자 확인"}
        </button>
      )}

      {user && !user.isAnonymous && (
        <span className="max-w-[13rem] truncate rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 shadow-sm backdrop-blur-sm md:max-w-[18rem]">
          로그인: {user.email || "-"} · Admin: {isAdmin ? "YES" : "NO"}
        </span>
      )}

      {user && !user.isAnonymous && (
        <button
          onClick={() => setViewMode("my-page")}
          className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.12em] md:tracking-widest px-3 md:px-4 py-2 rounded-full transition-all whitespace-nowrap ${
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
          className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] md:tracking-widest border border-zinc-200 px-3.5 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-black hover:text-white transition-all text-center whitespace-nowrap"
        >
          Login
        </button>
      ) : (
        <div className="flex items-center gap-2 md:gap-4 border-l pl-2 md:pl-4 border-zinc-100">
          <span className="hidden md:inline text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {user.displayName}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[#004aad] transition-colors hover:text-red-500 p-1"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

export default Navbar;

import React from "react";
import { LogOut, User } from "lucide-react";

const Navbar = ({
  user,
  isAdmin,
  viewMode,
  setViewMode,
  handleLogin,
  handleSignOut,
  reset,
}) => (
  <nav className="fixed top-0 z-[100] flex w-full items-center justify-between gap-3 overflow-hidden border-b border-gray-100 bg-white/50 px-4 py-3 backdrop-blur-xl md:px-8 md:py-6">
    <div
      className="min-w-0 shrink text-lg font-black tracking-tighter cursor-pointer md:text-2xl"
      onClick={reset}
    >
      UNFRAME
    </div>

    <div className="flex shrink-0 items-center gap-2 md:gap-4">
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
          className={`hidden rounded-full px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em] shadow-lg transition-all whitespace-nowrap md:inline-flex md:px-4 md:text-[9px] md:tracking-widest ${
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

      {user && !user.isAnonymous && isAdmin && (
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "admin" ? "user" : "admin")}
          aria-label={viewMode === "admin" ? "관리자 콘솔 나가기" : "관리자 콘솔 열기"}
          className={`grid h-10 w-10 place-items-center rounded-full text-[11px] font-black uppercase tracking-[0.08em] transition-all md:hidden ${
            viewMode === "admin"
              ? "bg-[#004aad] text-white shadow-lg"
              : "bg-black text-white shadow-md"
          }`}
        >
          AC
        </button>
      )}

      {user && !user.isAnonymous && (
        <span className="hidden max-w-[13rem] truncate rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500 shadow-sm backdrop-blur-sm md:inline-block md:max-w-[18rem]">
          로그인: {user.email || "-"} · Admin: {isAdmin ? "YES" : "NO"}
        </span>
      )}

      {user && !user.isAnonymous && (
        <button
          onClick={() => setViewMode("my-page")}
          aria-label="마이페이지 열기"
          className={`grid h-10 w-10 place-items-center rounded-full transition-all md:inline-flex md:h-auto md:w-auto md:px-4 md:py-2 md:text-[9px] md:font-black md:uppercase md:tracking-widest ${
            viewMode === "my-page"
              ? "bg-[#004aad] text-white shadow-lg"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <User className="md:hidden" size={17} />
          <span className="hidden whitespace-nowrap md:inline">My Page</span>
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
        <div className="flex items-center gap-2 border-l border-zinc-100 pl-2 md:gap-4 md:pl-4">
          <span className="hidden md:inline text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {user.displayName}
          </span>
          <button
            onClick={handleSignOut}
            aria-label="로그아웃"
            className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-white/80 text-[#004aad] transition-colors hover:text-red-500 md:h-auto md:w-auto md:border-0 md:bg-transparent md:p-1"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

export default Navbar;

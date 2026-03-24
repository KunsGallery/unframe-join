import React from "react";
import { Loader2 } from "lucide-react";

const LoadingOverlay = () => (
  <div className="h-screen flex flex-col items-center justify-center font-black text-[#004aad] bg-[#fdfbf7] fixed inset-0 z-[200]">
    <Loader2 className="animate-spin size-12 mb-4" />
    <span className="animate-pulse tracking-[0.5em] uppercase text-xs text-zinc-400">
      Unframe Resonance
    </span>
  </div>
);

export default LoadingOverlay;
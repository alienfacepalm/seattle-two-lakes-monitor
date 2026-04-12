import React from "react";
import { Mountain, Waves, Sun, Moon, RefreshCw } from "lucide-react";
import { useWeather } from "../context/WeatherContext";

export const Header: React.FC = () => {
  const { isDark, setIsDark, refreshing, fetchData } = useWeather();

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 h-16 border-b border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mountain className="text-primary w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-surface rounded-full flex items-center justify-center shadow-sm border border-black/5 dark:border-white/10">
            <Waves className="text-primary w-3 h-3" />
          </div>
        </div>
        <div className="flex flex-col -space-y-0.5 sm:-space-y-1">
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 leading-none">Seattle</span>
          <h1 className="text-sm sm:text-lg font-black text-on-surface font-headline tracking-tighter uppercase leading-none">
            2lakes<span className="text-primary">.app</span>
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button 
          onClick={fetchData}
          disabled={refreshing}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
    </header>
  );
};

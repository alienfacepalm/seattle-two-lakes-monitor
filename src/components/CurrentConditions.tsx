import React from "react";
import { useWeather } from "../context/WeatherContext";
import { getConditionIcon } from "./Icons";
import { getBuoyBackground } from "../constants";

export const CurrentConditions: React.FC = () => {
  const { data, unit, setUnit } = useWeather();

  const currentTemp = unit === "F" ? data?.tempF : data?.tempC;

  return (
    <section className="relative overflow-hidden bg-surface-container-low rounded-[2.5rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
      <img 
        src={getBuoyBackground()}
        alt={`${data?.location || 'Lake'} Background`}
        className="absolute inset-0 w-full h-full object-cover opacity-[0.4] dark:opacity-[0.5] pointer-events-none select-none"
        referrerPolicy="no-referrer"
      />
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold text-on-surface">{data?.location}</h2>
            <p className="text-on-surface-variant text-sm font-medium opacity-70">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex gap-1 bg-surface-container-highest/50 backdrop-blur-md p-1 rounded-xl">
            <button onClick={() => setUnit("F")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${unit === "F" ? "bg-surface shadow-sm" : "opacity-50"}`}>°F</button>
            <button onClick={() => setUnit("C")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${unit === "C" ? "bg-surface shadow-sm" : "opacity-50"}`}>°C</button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center border border-black/5 dark:border-white/10 shadow-sm">
              {getConditionIcon(data?.condition || "")}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-80">Water Temperature</span>
              <span className="text-7xl font-light tracking-tighter text-on-surface">
                {data?.status === "ACTIVE" ? Math.round(currentTemp || 0) : "--"}°
              </span>
            </div>
          </div>
          <p className="text-xl font-medium text-on-surface mt-2">
            {data?.status === "ACTIVE" ? `${data?.condition} Conditions` : "Sensor Offline"}
          </p>
          <div className="flex gap-3 mt-1 text-on-surface-variant font-medium">
            {data?.status === "ACTIVE" ? (
              <>
                <span>H:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) + 2}°</span>
                <span>L:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) - 3}°</span>
              </>
            ) : (
              <span className="text-xs opacity-50 italic">Historical data unavailable for this sensor</span>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse border border-black/10 dark:border-white/10 ${data?.status === "ACTIVE" ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {data?.status === "ACTIVE" ? "Live Buoy" : "Offline Mode"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

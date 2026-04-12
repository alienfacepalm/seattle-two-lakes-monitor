import React from "react";
import { Wind, CloudRain, Clock, Thermometer } from "lucide-react";
import { useWeather } from "../context/WeatherContext";

export const WeatherMetrics: React.FC = () => {
  const { data, unit, nextSync } = useWeather();

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="bg-surface-container-low rounded-3xl p-5 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <Wind className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Wind Speed</span>
        </div>
        <p className="text-2xl font-bold text-on-surface">
          {data.status === "ACTIVE" ? `${data.windSpeed} mph` : "--"}
        </p>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-5 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <Thermometer className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Air Temp</span>
        </div>
        <p className="text-2xl font-bold text-on-surface">
          {data.status === "ACTIVE" ? `${Math.round((unit === "F" ? data.airTempF : data.airTempC) || 0)}°` : "--"}
        </p>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-5 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <CloudRain className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Humidity</span>
        </div>
        <p className="text-2xl font-bold text-on-surface">
          {data.status === "ACTIVE" ? "64%" : "--"}
        </p>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-5 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Next Sync</span>
        </div>
        <p className="text-2xl font-bold text-on-surface">{nextSync}</p>
      </div>
    </div>
  );
};

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { Thermometer, Wind, CloudRain, Droplets } from "lucide-react";
import { HistoryPoint } from "../types";

interface HistoryChartsProps {
  history: HistoryPoint[];
  unit: "C" | "F";
  isDark: boolean;
  hasPrecipitationData: boolean;
  hasHumidityData: boolean;
  hasDewpointData: boolean;
}

export const HistoryCharts: React.FC<HistoryChartsProps> = ({ history, unit, isDark, hasPrecipitationData, hasHumidityData, hasDewpointData }) => {
  const tooltipStyle = { 
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
    border: 'none', 
    borderRadius: '16px', 
    fontSize: '12px', 
    color: isDark ? '#fff' : '#000', 
    backdropFilter: 'blur(10px)', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
  };

  return (
    <div className="space-y-6">
      {/* Temperature Trend */}
      <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
          <Thermometer className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Temperature Trend</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorWaterHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007aff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#007aff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAirHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
              <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
              <YAxis domain={['auto', 'auto']} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°`} opacity={0.5} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
              <Area type="monotone" name="Water Temp" dataKey={unit === "F" ? "tempF" : "tempC"} stroke="#007aff" strokeWidth={3} fillOpacity={1} fill="url(#colorWaterHist)" connectNulls />
              <Area type="monotone" name="Air Temp" dataKey={unit === "F" ? "airTempF" : "airTempC"} stroke="#fb923c" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorAirHist)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Wind Speed Trend */}
      <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
          <Wind className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Wind Speed (MPH)</span>
        </div>
        <div className="h-48 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorWindHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
              <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
              <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
              <Area type="monotone" name="Wind Speed" dataKey="windSpeed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWindHist)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Precipitation */}
      {hasPrecipitationData && (
        <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <CloudRain className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Precipitation (Inches)</span>
          </div>
          <div className="h-40 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
                <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}"`} opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Bar name="Precipitation" dataKey="precipitation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Humidity */}
      {hasHumidityData && (
        <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <Droplets className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Humidity Trend (%)</span>
          </div>
          <div className="h-40 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorHumHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
                <YAxis domain={[0, 100]} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Area type="monotone" name="Humidity" dataKey="humidity" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorHumHist)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Dew Point */}
      {hasDewpointData && (
        <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <Droplets className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Dew Point Trend</span>
          </div>
          <div className="h-40 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorDewHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
                <YAxis domain={['auto', 'auto']} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°`} opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#ec4899', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Area type="monotone" name="Dew Point" dataKey={unit === "F" ? "dewpointF" : "dewpoint"} stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorDewHist)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};

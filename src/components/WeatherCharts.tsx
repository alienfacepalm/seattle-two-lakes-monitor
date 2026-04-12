import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { History as HistoryIcon, CloudRain } from "lucide-react";
import { useWeather } from "../context/WeatherContext";

export const WeatherCharts: React.FC = () => {
  const { data, history, unit, isDark } = useWeather();

  if (!data) return null;

  return (
    <div className="space-y-6 mt-6">
      {data.status === "ACTIVE" && (
        <section className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <HistoryIcon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">24h Temperature Trend</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[9px] font-bold text-on-surface-variant uppercase">Water</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-[9px] font-bold text-on-surface-variant uppercase">Air</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007aff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#007aff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).getHours() + ":00"}
                  stroke="var(--color-on-surface-variant)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  opacity={0.5}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  stroke="var(--color-on-surface-variant)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}°`}
                  opacity={0.5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                    border: 'none', 
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: isDark ? '#fff' : '#000',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Area 
                  type="monotone" 
                  name="Water Temp"
                  dataKey={unit === "F" ? "tempF" : "tempC"} 
                  stroke="#007aff" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorWater)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  name="Air Temp"
                  dataKey={unit === "F" ? "airTempF" : "airTempC"} 
                  stroke="#fb923c" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorAir)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data.status === "ACTIVE" && (
        <section className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <CloudRain className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">24h Precipitation (Inches)</span>
          </div>
          
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).getHours() + ":00"}
                  stroke="var(--color-on-surface-variant)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  opacity={0.5}
                />
                <YAxis 
                  stroke="var(--color-on-surface-variant)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}"`}
                  opacity={0.5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                    border: 'none', 
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: isDark ? '#fff' : '#000',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Bar 
                  name="Precipitation"
                  dataKey="precipitation" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};

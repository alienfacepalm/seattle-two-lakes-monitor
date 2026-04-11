import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Waves, 
  RefreshCw, 
  Clock, 
  Thermometer, 
  ArrowRight, 
  MapPin, 
  History as HistoryIcon, 
  Compass,
  LayoutDashboard,
  Moon,
  Sun,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface BuoyData {
  location: string;
  tempC: number;
  tempF: number;
  airTempC: number | null;
  airTempF: number | null;
  windSpeed: number | null;
  timestamp: string;
  status: string;
  condition: string;
  lastSync: string;
}

const SEASONAL_AVERAGES: Record<number, number> = {
  0: 4,  // Jan
  1: 5,  // Feb
  2: 8,  // Mar
  3: 11, // Apr
  4: 17, // May
  5: 19, // Jun
  6: 25, // Jul
  7: 25, // Aug
  8: 22, // Sep
  9: 17, // Oct
  10: 11, // Nov
  11: 7   // Dec
};

interface MapBuoy {
  id: string;
  name: string;
  tempC: number | null;
  tempF: number | null;
  lat: number;
  lon: number;
  active: boolean;
}

interface HistoryPoint {
  time: string;
  tempC: number;
  tempF: number;
}

type Tab = "current" | "history" | "map";

export default function App() {
  const [data, setData] = useState<BuoyData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [allBuoys, setAllBuoys] = useState<MapBuoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<"F" | "C">("F");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("current");
  const [selectedBuoy, setSelectedBuoy] = useState("Sammamish");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
             (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const [nextSync, setNextSync] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diff = nextHour.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setNextSync(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [currentRes, historyRes, mapRes] = await Promise.all([
        fetch(`/api/buoy-data?buoy=${selectedBuoy}`),
        fetch(`/api/buoy-history?buoy=${selectedBuoy}`),
        fetch("/api/all-buoys")
      ]);

      if (!currentRes.ok) throw new Error("Failed to fetch current data");
      
      const currentResult = await currentRes.json();
      const historyResult = await historyRes.json();
      const mapResult = await mapRes.json();

      setData(currentResult);
      setHistory(historyResult);
      setAllBuoys(mapResult);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBuoy]);

  const toggleUnit = () => {
    setUnit((prev) => (prev === "F" ? "C" : "F"));
  };

  const formatTimestamp = (ts: string | undefined) => {
    if (!ts) return "";
    try {
      const date = new Date(ts);
      return date.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short"
      }).toUpperCase();
    } catch (e) {
      return ts.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  const currentTemp = unit === "F" ? data?.tempF : data?.tempC;

  const getSwimSuitability = (tempC: number) => {
    if (tempC < 15) return { label: "Dangerous", color: "text-red-500", desc: "Extreme cold shock risk. Wetsuit mandatory." };
    if (tempC < 20) return { label: "Cold", color: "text-orange-500", desc: "Refreshing but chilly. Short swims only." };
    if (tempC < 24) return { label: "Pleasant", color: "text-secondary", desc: "Great for swimming. Enjoy the water!" };
    return { label: "Ideal", color: "text-secondary", desc: "Perfect summer conditions. Dive in!" };
  };

  const getSeasonalComparison = () => {
    if (!data) return null;
    const month = new Date().getMonth();
    const avg = SEASONAL_AVERAGES[month];
    const diff = data.tempC - avg;
    const diffF = diff * 9/5;
    return {
      avg: unit === "F" ? Math.round((avg * 9/5) + 32) : avg,
      diff: unit === "F" ? Math.round(diffF) : parseFloat(diff.toFixed(1)),
      isWarmer: diff > 0
    };
  };

  const suitability = data ? getSwimSuitability(data.tempC) : null;
  const seasonal = getSeasonalComparison();

  const getConditionIcon = (condition: string) => {
    if (condition === "Warm") return <Sun className="w-12 h-12 text-yellow-400" />;
    if (condition === "Moderate") return <Sun className="w-12 h-12 text-orange-400" />;
    return <Waves className="w-12 h-12 text-blue-400" />;
  };

  return (
    <div className="min-h-screen pb-32 transition-colors duration-300 bg-[#f2f2f7] dark:bg-black">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl flex items-center justify-between px-6 h-16 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Waves className="text-primary w-6 h-6" />
          <h1 className="text-lg font-bold text-on-surface font-headline tracking-tight">Seattle Two Lakes Monitor</h1>
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

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "current" && (
            <motion.div
              key="current"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4"
            >
              {/* Main Weather Card */}
              <section className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-semibold text-on-surface">{data?.location}</h2>
                    <p className="text-on-surface-variant text-sm font-medium opacity-70">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-xl">
                    <button onClick={() => setUnit("F")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${unit === "F" ? "bg-white dark:bg-[#3a3a3c] shadow-sm" : "opacity-50"}`}>°F</button>
                    <button onClick={() => setUnit("C")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${unit === "C" ? "bg-white dark:bg-[#3a3a3c] shadow-sm" : "opacity-50"}`}>°C</button>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <div className="flex items-center gap-4">
                    {getConditionIcon(data?.condition || "")}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Water</span>
                      <span className="text-7xl font-light tracking-tighter text-on-surface">
                        {Math.round(currentTemp || 0)}°
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-medium text-on-surface mt-2">{data?.condition} Conditions</p>
                  <div className="flex gap-3 mt-1 text-on-surface-variant font-medium">
                    <span>H:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) + 2}°</span>
                    <span>L:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) - 3}°</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Buoy {data?.status}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Updated {formatTimestamp(data?.timestamp)}
                  </p>
                </div>
              </section>

              {/* Hourly Forecast (Simulated from History) */}
              <section className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Hourly Forecast</span>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-2 no-scrollbar">
                  {history.slice(0, 12).map((h, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[40px] gap-2">
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        {i === 0 ? "Now" : new Date(h.time).getHours() + ":00"}
                      </span>
                      <Thermometer className="w-4 h-4 text-primary opacity-50" />
                      <span className="text-sm font-semibold text-on-surface">
                        {unit === "F" ? h.tempF : h.tempC}°
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bento Grid */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Swim Suitability */}
                <div className="col-span-2 bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Waves className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Swim Suitability</span>
                  </div>
                  <h3 className={`text-xl font-bold ${suitability?.color}`}>{suitability?.label}</h3>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{suitability?.desc}</p>
                </div>

                {/* Wind */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Wind</span>
                  </div>
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-2 border-black/5 dark:border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-on-surface">{data?.windSpeed}</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-on-surface-variant mt-2 uppercase">MPH</p>
                </div>

                {/* Air Temperature */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Sun className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Air Temp</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">
                    {data?.airTempC !== null ? (unit === "F" ? data?.airTempF : data?.airTempC) : "--"}°
                  </p>
                  <p className="text-xs text-on-surface-variant mt-2">Surface level</p>
                </div>

                {/* Seasonal */}
                <div className="col-span-2 bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <HistoryIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Seasonal Trend</span>
                  </div>
                  <p className="text-sm font-medium text-on-surface">
                    {seasonal?.isWarmer ? "Warmer" : "Cooler"} than average by <span className="text-primary font-bold">{Math.abs(seasonal?.diff || 0)}°{unit}</span>
                  </p>
                  <div className="mt-4 h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${Math.min(100, Math.max(0, 50 + (seasonal?.diff || 0) * 5))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Pressure */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Pressure</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">29.73</p>
                  <p className="text-xs text-on-surface-variant mt-1">Falling</p>
                </div>

                {/* Humidity */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Waves className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Humidity</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">64%</p>
                  <p className="text-xs text-on-surface-variant mt-1">Dew point: 48°</p>
                </div>
              </section>

              <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest py-4">
                Next sync in {nextSync}
              </p>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4"
            >
              <section className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
                  <HistoryIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">24h Temperature Trend</span>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007aff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#007aff" stopOpacity={0}/>
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
                          backgroundColor: 'rgba(28, 28, 30, 0.9)', 
                          border: 'none', 
                          borderRadius: '16px',
                          fontSize: '12px',
                          color: '#fff',
                          backdropFilter: 'blur(10px)'
                        }}
                        itemStyle={{ color: '#007aff', fontWeight: 'bold' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={unit === "F" ? "tempF" : "tempC"} 
                        stroke="#007aff" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTemp)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">24h High</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {Math.max(...history.map(h => unit === "F" ? h.tempF : h.tempC))}°
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">24h Low</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {Math.min(...history.map(h => unit === "F" ? h.tempF : h.tempC))}°
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4"
            >
              <section className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Regional Buoy Network</span>
                </div>

                <div className="space-y-3">
                  {allBuoys.map((buoy) => (
                    <motion.div 
                      key={buoy.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedBuoy(buoy.name);
                        setActiveTab("current");
                      }}
                      className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${selectedBuoy === buoy.name ? "bg-primary/10 ring-1 ring-primary/20" : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${buoy.active ? "bg-[#ccff00]/20 text-[#ccff00]" : "bg-on-surface-variant/10 text-on-surface-variant"}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-on-surface">{buoy.name}</h3>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                            {buoy.lat?.toFixed(3) || "0.000"}, {buoy.lon?.toFixed(3) || "0.000"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-on-surface">
                          {buoy.tempC ? (unit === "F" ? buoy.tempF : buoy.tempC) : "--"}°
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${buoy.active ? "text-[#ccff00]" : "text-on-surface-variant"}`}>
                          {buoy.active ? "Active" : "Offline"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-8 bg-white/80 dark:bg-black/80 backdrop-blur-2xl z-50 border-t border-black/5 dark:border-white/5">
        <button 
          onClick={() => setActiveTab("current")}
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "current" ? "text-primary" : "text-on-surface/40"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Current</span>
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "history" ? "text-primary" : "text-on-surface/40"}`}
        >
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">History</span>
        </button>
        <button 
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "map" ? "text-primary" : "text-on-surface/40"}`}
        >
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Network</span>
        </button>
      </nav>
    </div>
  );
}

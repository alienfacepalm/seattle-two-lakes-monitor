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
  Cloud,
  CloudRain,
  Wind,
  AlertCircle,
  ExternalLink,
  Check,
  ChevronDown,
  Share,
  Download,
  X,
  Mountain,
  WifiOff
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
  Area,
  BarChart,
  Bar,
  Legend
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
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingRefresh) {
      setPendingRefresh(false);
      fetchData();
    }
  }, [isOnline, pendingRefresh]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check iOS standalone
    if (ios) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    }

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) setTimeOfDay("dawn");
    else if (hour >= 8 && hour < 17) setTimeOfDay("day");
    else if (hour >= 17 && hour < 20) setTimeOfDay("dusk");
    else setTimeOfDay("night");
  }, []);

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
      const nextAutoRefresh = new Date(lastFetchTime.getTime() + 60 * 60 * 1000);
      const diff = nextAutoRefresh.getTime() - now.getTime();
      
      if (diff <= 0) {
        fetchData();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setNextSync(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lastFetchTime]);

  const fetchData = async () => {
    if (!navigator.onLine) {
      setPendingRefresh(true);
      setShowOfflineAlert(true);
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const [currentRes, historyRes, mapRes] = await Promise.all([
        fetch(`/api/buoy-data?buoy=${selectedBuoy}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/buoy-history?buoy=${selectedBuoy}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/all-buoys?t=${Date.now()}`, { cache: 'no-store' })
      ]);

      if (!currentRes.ok) {
        const errData = await currentRes.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${currentRes.status}`);
      }
      
      const currentResult = await currentRes.json();
      const historyResult = await historyRes.json().catch(() => []);
      const mapResult = await mapRes.json().catch(() => []);

      setData(currentResult);
      setHistory(historyResult);
      setAllBuoys(mapResult);
      setLastFetchTime(new Date());
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const dismissPrompt = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowInstallPrompt(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <Mountain className="w-10 h-10 text-primary" />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-surface rounded-full flex items-center justify-center shadow-lg border border-black/5 dark:border-white/10"
          >
            <Waves className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
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
    if (condition === "Cloudy") return <Cloud className="w-12 h-12 text-gray-400" />;
    if (condition === "Overcast") return <Cloud className="w-12 h-12 text-slate-500" opacity={0.8} />;
    if (condition === "Windy") return <Wind className="w-12 h-12 text-blue-300" />;
    if (condition === "Rainy") return <CloudRain className="w-12 h-12 text-blue-500" />;
    if (condition === "Showers") return <CloudRain className="w-12 h-12 text-blue-400 opacity-80" />;
    return <Waves className="w-12 h-12 text-blue-400" />;
  };

  return (
    <div className="min-h-screen pb-32 transition-colors duration-300 bg-surface">
      {/* Lake Background */}
      <div className={`lake-bg lake-bg-${timeOfDay}`} />
      <div className="lake-waves" />

      {/* Top App Bar */}
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

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <AnimatePresence>
          {pendingRefresh && !isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3 text-orange-500"
            >
              <WifiOff className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold uppercase tracking-wider mb-0.5">Offline</p>
                <p className="opacity-80">Refresh will occur when you reconnect. Using cached data.</p>
              </div>
            </motion.div>
          )}

          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-20 right-6 z-[60] bg-secondary text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <Check className="w-3 h-3" />
              Updated
            </motion.div>
          )}
        </AnimatePresence>

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
              {/* Network Selector Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-surface-container-low text-on-surface font-bold py-4 px-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${allBuoys.find(b => b.name === selectedBuoy)?.active ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                    <span>{selectedBuoy} Buoy</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-container-low border border-black/5 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                      >
                        {allBuoys.map(buoy => (
                          <button
                            key={buoy.id}
                            onClick={() => {
                              setSelectedBuoy(buoy.name);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedBuoy === buoy.name ? "bg-primary/5" : ""}`}
                          >
                            <span className={`font-bold ${selectedBuoy === buoy.name ? "text-primary" : "text-on-surface"}`}>
                              {buoy.name} Buoy
                            </span>
                            <div className={`w-2 h-2 rounded-full ${buoy.active ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Main Weather Card */}
              <section className="relative overflow-hidden bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                <img 
                  src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1200&q=80"
                  alt="Lake Background"
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.25] dark:opacity-[0.35] pointer-events-none select-none"
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
                      {getConditionIcon(data?.condition || "")}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Water</span>
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
                      <span className={`w-2 h-2 rounded-full animate-pulse ${data?.status === "ACTIVE" ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {data?.status === "ACTIVE" ? "Live Buoy" : "Offline Mode"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {data?.status === "ACTIVE" ? `Updated ${formatTimestamp(data?.timestamp)}` : "Data Not Available"}
                      </p>
                      <p className="text-[8px] font-medium text-on-surface-variant opacity-50 uppercase tracking-tighter mt-0.5">
                        Checked {new Date(data?.lastSync || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Hourly Forecast (Simulated from History) */}
              <section className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
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
                <div className="col-span-2 bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Waves className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Swim Suitability</span>
                  </div>
                  {data?.status === "ACTIVE" ? (
                    <>
                      <h3 className={`text-xl font-bold ${suitability?.color}`}>{suitability?.label}</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{suitability?.desc}</p>
                    </>
                  ) : (
                    <p className="text-xs text-on-surface-variant opacity-50 italic">Suitability assessment unavailable while sensor is offline</p>
                  )}
                </div>

                {/* Wind */}
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Wind</span>
                  </div>
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-2 border-black/5 dark:border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-on-surface">
                        {data?.status === "ACTIVE" ? data?.windSpeed : "--"}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-on-surface-variant mt-2 uppercase">MPH</p>
                </div>

                {/* Air Temperature */}
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
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
                <div className="col-span-2 bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <HistoryIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Seasonal Trend</span>
                  </div>
                  {data?.status === "ACTIVE" ? (
                    <>
                      <p className="text-sm font-medium text-on-surface">
                        {seasonal?.isWarmer ? "Warmer" : "Cooler"} than average by <span className="text-primary font-bold">{Math.abs(seasonal?.diff || 0)}°{unit}</span>
                      </p>
                      <div className="mt-4 h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000" 
                          style={{ width: `${Math.min(100, Math.max(0, 50 + (seasonal?.diff || 0) * 5))}%` }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-on-surface-variant opacity-50 italic">Trend analysis unavailable</p>
                  )}
                </div>

                {/* Pressure */}
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Pressure</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">
                    {data?.status === "ACTIVE" ? "29.73" : "--"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {data?.status === "ACTIVE" ? "Falling" : "Unavailable"}
                  </p>
                </div>

                {/* Humidity */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <Waves className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Humidity</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">
                    {data?.status === "ACTIVE" ? (data?.humidity ? `${data.humidity}%` : "64%") : "--"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {data?.status === "ACTIVE" ? "Dew point: 48°" : "Unavailable"}
                  </p>
                </div>

                {/* Precipitation */}
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                    <CloudRain className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Precipitation</span>
                  </div>
                  <p className="text-2xl font-semibold text-on-surface">
                    {data?.status === "ACTIVE" ? `${data?.precipitation || 0}"` : "--"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Past hour
                  </p>
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
              {/* Network Selector Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-surface-container-low text-on-surface font-bold py-4 px-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${allBuoys.find(b => b.name === selectedBuoy)?.active ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                    <span>{selectedBuoy} Buoy</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-container-low border border-black/5 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                      >
                        {allBuoys.map(buoy => (
                          <button
                            key={buoy.id}
                            onClick={() => {
                              setSelectedBuoy(buoy.name);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedBuoy === buoy.name ? "bg-primary/5" : ""}`}
                          >
                            <span className={`font-bold ${selectedBuoy === buoy.name ? "text-primary" : "text-on-surface"}`}>
                              {buoy.name} Buoy
                            </span>
                            <div className={`w-2 h-2 rounded-full ${buoy.active ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {data?.status !== "ACTIVE" && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3 text-orange-500">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">Sensor is currently offline. Historical data not available.</p>
                </div>
              )}
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
                        dataKey="precipitation" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">24h High (Water)</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {data?.status === "ACTIVE" ? `${Math.max(...history.map(h => unit === "F" ? h.tempF : h.tempC))}°` : "--°"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">24h Low (Water)</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {data?.status === "ACTIVE" ? `${Math.min(...history.map(h => unit === "F" ? h.tempF : h.tempC))}°` : "--°"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Avg Wind Speed</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {data?.status === "ACTIVE" ? `${(history.reduce((acc, h) => acc + (h.windSpeed || 0), 0) / history.length).toFixed(1)}` : "--"}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">MPH</p>
                </div>
                <div className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Max Wind Gust</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">
                    {data?.status === "ACTIVE" ? `${Math.max(...history.map(h => h.windSpeed || 0)).toFixed(1)}` : "--"}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">MPH</p>
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
              <section className="bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Regional Buoy Stations</span>
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
                      className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${selectedBuoy === buoy.name ? "bg-primary/10 ring-1 ring-primary/20" : "bg-surface-container-highest hover:bg-black/10 dark:hover:bg-white/10"}`}
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
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-8 bg-surface/80 backdrop-blur-2xl z-50 border-t border-black/5 dark:border-white/5">
        <button 
          onClick={() => setActiveTab("current")}
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "current" ? "text-primary" : "text-on-surface/40"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Dashboard</span>
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

      {/* PWA Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 left-4 right-4 z-[100] bg-surface-container-low border border-black/5 dark:border-white/10 rounded-3xl p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
                    <Mountain className="w-8 h-8" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-surface-container-low rounded-full flex items-center justify-center shadow-md border border-black/5 dark:border-white/10">
                    <Waves className="text-primary w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-on-surface uppercase tracking-tight">Install 2lakes.app</h3>
                  <p className="text-[11px] text-on-surface-variant opacity-70 mt-0.5">Add to your home screen for quick access.</p>
                </div>
              </div>
              <button 
                onClick={dismissPrompt}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="mt-5">
              {isIOS ? (
                <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3 text-xs font-medium text-on-surface">
                    <div className="w-6 h-6 rounded-lg bg-white dark:bg-black flex items-center justify-center shadow-sm">
                      <Share className="w-3.5 h-3.5" />
                    </div>
                    <span>1. Tap the Share button in Safari</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-on-surface">
                    <div className="w-6 h-6 rounded-lg bg-white dark:bg-black flex items-center justify-center shadow-sm">
                      <Download className="w-3.5 h-3.5 rotate-180" />
                    </div>
                    <span>2. Select "Add to Home Screen"</span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleInstallClick}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Alert Dialog */}
      <AnimatePresence>
        {showOfflineAlert && !isOnline && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-surface-container-low border border-black/5 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <WifiOff className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-3 font-headline">Connection Lost</h2>
              <p className="text-sm text-on-surface-variant opacity-70 mb-8 leading-relaxed">
                It looks like you're offline. Please find a stable internet connection to refresh the buoy data.
              </p>
              <button
                onClick={() => setShowOfflineAlert(false)}
                className="w-full bg-on-surface text-surface font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

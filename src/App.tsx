import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate, Routes, Route, Navigate, Link } from "react-router-dom";
import { 
  Waves, 
  RefreshCw, 
  Clock, 
  Thermometer, 
  MapPin, 
  History as HistoryIcon, 
  LayoutDashboard,
  Moon,
  Sun,
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
  Mountain,
  WifiOff,
  ThermometerSnowflake,
  ThermometerSun,
  CloudDrizzle,
  Cloudy as CloudyIcon,
  ChevronDown,
  Check,
  Share,
  Database
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { db, auth } from "./firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  getDocs,
  Timestamp,
  serverTimestamp,
  getDocFromServer,
  doc
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";

interface BuoyData {
  location: string;
  tempC: number;
  tempF: number;
  airTempC: number | null;
  airTempF: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  humidity: number | null;
  timestamp: string;
  status: string;
  condition: string;
  lastSync: string;
}

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
  airTempC?: number;
  airTempF?: number;
  precipitation?: number;
  windSpeed?: number;
  humidity?: number;
}

const getConditionIcon = (condition: string) => {
  if (condition === "Warm") return <ThermometerSun className="w-12 h-12 text-yellow-400" />;
  if (condition === "Moderate") return <Sun className="w-12 h-12 text-orange-400" />;
  if (condition === "Cold") return <ThermometerSnowflake className="w-12 h-12 text-blue-400" />;
  if (condition === "Cloudy") return <Cloud className="w-12 h-12 text-gray-400" />;
  if (condition === "Overcast") return <CloudyIcon className="w-12 h-12 text-slate-500" opacity={0.8} />;
  if (condition === "Windy") return <Wind className="w-12 h-12 text-blue-300" />;
  if (condition === "Rainy") return <CloudRain className="w-12 h-12 text-blue-500" />;
  if (condition === "Showers") return <CloudDrizzle className="w-12 h-12 text-blue-400 opacity-80" />;
  return <Waves className="w-12 h-12 text-on-surface-variant opacity-40" />;
};

const getBuoyBackground = () => {
  return "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1200&q=80";
};

const IconGallery = () => {
  const conditions = ["Warm", "Moderate", "Cold", "Cloudy", "Overcast", "Windy", "Rainy", "Showers", "Unknown"];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="bg-surface-container-low rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
        <h2 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tight">Condition Icons</h2>
        <p className="text-sm text-on-surface-variant opacity-70 mb-8">A gallery of all possible weather condition icons used in the app.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {conditions.map(c => (
            <div key={c} className="bg-surface-container-highest/50 rounded-2xl p-6 flex flex-col items-center gap-4 border border-black/5 dark:border-white/5">
              <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center shadow-inner">
                {getConditionIcon(c)}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-on-surface">{c}</p>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-1 opacity-60">Icon Preview</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [data, setData] = useState<BuoyData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [allBuoys, setAllBuoys] = useState<MapBuoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<"F" | "C">("F");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBuoy, setSelectedBuoy] = useState(() => localStorage.getItem("selectedBuoy") || "Lake Sammamish");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
             (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [nextSync, setNextSync] = useState("");
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname === "/history" ? "history" : 
                    location.pathname === "/network" ? "map" : "current";

  useEffect(() => {
    localStorage.setItem("selectedBuoy", selectedBuoy);
  }, [selectedBuoy]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch(err => {
          // Silent catch for admin-restricted-operation
          // We've updated firestore rules to allow unauthenticated writes with strict validation
          console.warn("Anonymous auth not enabled, proceeding unauthenticated:", err.message);
        });
      }
    });

    // Test connection as per guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // Trigger save when data is ready
  useEffect(() => {
    if (data) {
      saveSnapshot(data);
    }
  }, [data]);

  // Sync historical data from Firestore
  useEffect(() => {
    if (!selectedBuoy) return;

    // Removed orderBy to avoid requiring a composite index in Firestore
    const q = query(
      collection(db, "buoy_snapshots"),
      where("buoyId", "==", selectedBuoy)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData: HistoryPoint[] = snapshot.docs
        .map(doc => {
          const d = doc.data();
          return {
            time: d.timestamp,
            tempC: d.tempC,
            tempF: d.tempF,
            airTempC: d.airTempC,
            airTempF: d.airTempF,
            windSpeed: d.windSpeed,
            precipitation: d.precipitation,
            humidity: d.humidity
          };
        })
        .filter(p => p.time && !isNaN(new Date(p.time).getTime())) // Filter out invalid points
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .slice(-48); // Keep last 48 points
      
      setHistory(historyData);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "buoy_snapshots");
    });

    return () => unsubscribe();
  }, [selectedBuoy]);

  const saveSnapshot = useCallback(async (buoyData: BuoyData) => {
    if (!buoyData.timestamp) return;

    try {
      setIsSyncing(true);
      
      // Normalize timestamp to ISO format for consistent sorting and rule validation
      const normalizedTimestamp = new Date(buoyData.timestamp).toISOString();
      
      // Check if this snapshot already exists to avoid duplicates
      const q = query(
        collection(db, "buoy_snapshots"),
        where("buoyId", "==", selectedBuoy),
        where("timestamp", "==", normalizedTimestamp),
        limit(1)
      );
      
      const existing = await getDocs(q);
      if (existing.empty) {
        await addDoc(collection(db, "buoy_snapshots"), {
          buoyId: selectedBuoy,
          timestamp: normalizedTimestamp,
          recordedAt: new Date().toISOString(),
          tempC: buoyData.tempC,
          tempF: buoyData.tempF,
          airTempC: buoyData.airTempC,
          airTempF: buoyData.airTempF,
          windSpeed: buoyData.windSpeed,
          precipitation: buoyData.precipitation,
          humidity: buoyData.humidity,
          serverTime: serverTimestamp()
        });
        console.log("Snapshot saved to Firestore:", normalizedTimestamp);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "buoy_snapshots");
    } finally {
      setIsSyncing(false);
    }
  }, [user, selectedBuoy]);

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
    if (ios) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      const [currentRes, mapRes] = await Promise.all([
        fetch(`/api/buoy-data?buoy=${selectedBuoy}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/all-buoys?t=${Date.now()}`, { cache: 'no-store' })
      ]);
      if (!currentRes.ok) throw new Error(`Server error: ${currentRes.status}`);
      const currentResult = await currentRes.json();
      const mapResult = await mapRes.json().catch(() => []);
      setData(currentResult);
      setAllBuoys(mapResult);
      setLastFetchTime(new Date());
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBuoy]);

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

  return (
    <div className="min-h-screen pb-32 transition-colors duration-300 bg-surface">
      <div className={`lake-bg lake-bg-${timeOfDay}`} />
      <div className="lake-waves" />

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
          <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={fetchData} disabled={refreshing} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={
              loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-500 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6" />
                  <p className="font-medium">{error}</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  {/* Top Buoy Selector Bar */}
                  <div className="mb-6 relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-surface-container-low border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-surface-container transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse border border-black/10 dark:border-white/10 ${data?.status === "ACTIVE" ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                        <span className="text-sm font-bold text-on-surface">{selectedBuoy.endsWith("Buoy") ? selectedBuoy : `${selectedBuoy} Buoy`}</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                          animate={{ opacity: 1, y: 0, scale: 1 }} 
                          exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                          className="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                        >
                          {allBuoys.map((buoy) => (
                            <button 
                              key={buoy.id} 
                              onClick={() => { setSelectedBuoy(buoy.name); setIsDropdownOpen(false); }} 
                              className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedBuoy === buoy.name ? 'text-primary' : 'text-on-surface'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${buoy.active ? "bg-[#ccff00] shadow-[0_0_5px_#ccff00]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"}`} />
                                {buoy.name}
                              </div>
                              {selectedBuoy === buoy.name && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Current Conditions Card */}
                  <section className="relative overflow-hidden bg-surface-container-low rounded-[2.5rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
                    <img 
                      src={getBuoyBackground()} 
                      alt="Background" 
                      className="absolute inset-0 w-full h-full object-cover opacity-[0.4] dark:opacity-[0.5] pointer-events-none select-none" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-semibold text-on-surface">{data?.location?.endsWith("Buoy") ? data.location : `${data?.location} Buoy`}</h2>
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
                            <span className="text-7xl font-light tracking-tighter text-on-surface">{data?.status === "ACTIVE" ? Math.round(unit === "F" ? data?.tempF || 0 : data?.tempC || 0) : "--"}°</span>
                          </div>
                        </div>
                        <p className="text-xl font-medium text-on-surface mt-2">{data?.status === "ACTIVE" ? `${data?.condition} Conditions` : "Sensor Offline"}</p>
                        <div className="flex gap-3 mt-1 text-on-surface-variant font-medium">
                          {data?.status === "ACTIVE" && (
                            <>
                              <span>H:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) + 2}°</span>
                              <span>L:{Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) - 3}°</span>
                            </>
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
                        <div className="text-right group cursor-default">
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70 group-hover:opacity-100 group-hover:text-on-surface transition-all duration-300">Updated {new Date(data?.timestamp || "").toLocaleDateString()} at {new Date(data?.timestamp || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <div className="flex items-center justify-end gap-1.5">
                            {isSyncing && <Database className="w-2.5 h-2.5 text-primary animate-pulse" />}
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50 group-hover:opacity-90 transition-all duration-300">Checked {lastFetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Hourly Forecast */}
                  <section className="bg-surface-container-low rounded-[2rem] p-6 mt-6 shadow-sm border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Hourly Forecast</span>
                    </div>
                    <div className="flex overflow-x-auto pb-2 gap-6 no-scrollbar">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const time = new Date();
                        time.setHours(time.getHours() + i);
                        const hour = time.getHours();
                        const displayHour = hour === 0 ? "12 AM" : hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`;
                        const temp = Math.round((unit === "F" ? data?.tempF : data?.tempC) || 0) + (Math.sin(i / 2) * 2);
                        return (
                          <div key={i} className="flex flex-col items-center gap-3 min-w-[40px]">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{i === 0 ? "Now" : displayHour.split(' ')[0]}</span>
                            <Thermometer className="w-4 h-4 text-primary opacity-60" />
                            <span className="text-sm font-bold text-on-surface">{Math.round(temp)}°</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {/* Swim Suitability */}
                    <div className="col-span-2 sm:col-span-1 bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                        <Waves className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Swim Suitability</span>
                      </div>
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 text-2xl font-semibold tracking-tight ${Math.round(data?.tempF || 0) < 60 ? "text-red-500" : Math.round(data?.tempF || 0) < 70 ? "text-orange-500" : "text-green-500"}`}>
                          {Math.round(data?.tempF || 0) < 60 ? (
                            <>
                              <AlertTriangle className="w-6 h-6" />
                              <span>Dangerous</span>
                            </>
                          ) : Math.round(data?.tempF || 0) < 70 ? (
                            <>
                              <AlertCircle className="w-6 h-6" />
                              <span>Caution</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-6 h-6" />
                              <span>Safe</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed font-medium">
                          {Math.round(data?.tempF || 0) < 60 
                            ? "Extreme cold shock risk. Wetsuit mandatory." 
                            : Math.round(data?.tempF || 0) < 70 
                              ? "Cold water shock risk. Limit exposure." 
                              : "Comfortable swimming conditions."}
                        </p>
                      </div>
                    </div>

                    {/* Wind */}
                    <div className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                        <Wind className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Wind</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-4xl font-black text-on-surface">{data?.status === "ACTIVE" ? data?.windSpeed : "0"}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">MPH</p>
                      </div>
                    </div>

                    {/* Air Temp */}
                    <div className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                        <Sun className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Air Temp</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-4xl font-black text-on-surface">{data?.status === "ACTIVE" ? Math.round(unit === "F" ? data?.airTempF || 0 : data?.airTempC || 0) : "--"}°</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Surface Level</p>
                      </div>
                    </div>

                    {/* Precipitation */}
                    <div className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Precipitation</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-2xl font-black text-on-surface">{data?.status === "ACTIVE" ? `${data?.precipitation || 0}"` : "--"}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Past Hour</p>
                      </div>
                    </div>

                    {/* Pressure */}
                    <div className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pressure</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-2xl font-black text-on-surface">29.73</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Falling</p>
                      </div>
                    </div>

                    {/* Humidity */}
                    <div className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-6">
                        <Droplets className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Humidity</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-2xl font-black text-on-surface">{data?.status === "ACTIVE" ? `${Math.round(data?.humidity || 0)}%` : "--"}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Relative Humidity</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            } />
            <Route path="/history" element={
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                {/* Top Buoy Selector Bar */}
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-surface-container-low border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse border border-black/10 dark:border-white/10 ${data?.status === "ACTIVE" ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                      <span className="text-sm font-bold text-on-surface">{selectedBuoy.endsWith("Buoy") ? selectedBuoy : `${selectedBuoy} Buoy`}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                        className="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                      >
                        {allBuoys.map((buoy) => (
                          <button 
                            key={buoy.id} 
                            onClick={() => { setSelectedBuoy(buoy.name); setIsDropdownOpen(false); }} 
                            className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedBuoy === buoy.name ? 'text-primary' : 'text-on-surface'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${buoy.active ? "bg-[#ccff00] shadow-[0_0_5px_#ccff00]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"}`} />
                              {buoy.name}
                            </div>
                            {selectedBuoy === buoy.name && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="bg-surface-container-low rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
                  <h2 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tight">24h History</h2>
                  <p className="text-sm text-on-surface-variant opacity-70 mb-8">Detailed trends and historical data for the {selectedBuoy} buoy.</p>
                  
                  {history.length >= 2 ? (
                    <div className="space-y-6">
                    {/* Temperature Trend */}
                    <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <HistoryIcon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Temperature Trend</span>
                        </div>
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
                            <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '16px', fontSize: '12px', color: isDark ? '#fff' : '#000', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                            <Area type="monotone" name="Water Temp" dataKey={unit === "F" ? "tempF" : "tempC"} stroke="#007aff" strokeWidth={3} fillOpacity={1} fill="url(#colorWaterHist)" />
                            <Area type="monotone" name="Air Temp" dataKey={unit === "F" ? "airTempF" : "airTempC"} stroke="#fb923c" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorAirHist)" />
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
                      <div className="h-48 w-full">
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
                            <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '16px', fontSize: '12px', color: isDark ? '#fff' : '#000', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                            <Area type="monotone" name="Wind Speed" dataKey="windSpeed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWindHist)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* Precipitation */}
                    <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Precipitation (Inches)</span>
                      </div>
                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-on-surface-variant)" opacity={0.05} />
                            <XAxis dataKey="time" tickFormatter={(time) => new Date(time).getHours() + ":00"} stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} opacity={0.5} />
                            <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}"`} opacity={0.5} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '16px', fontSize: '12px', color: isDark ? '#fff' : '#000', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                            <Bar name="Precipitation" dataKey="precipitation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* Humidity */}
                    <section className="bg-surface-container-highest/30 rounded-[2rem] p-6 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
                        <Droplets className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Humidity Trend (%)</span>
                      </div>
                      <div className="h-40 w-full">
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
                            <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '16px', fontSize: '12px', color: isDark ? '#fff' : '#000', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                            <Area type="monotone" name="Humidity" dataKey="humidity" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorHumHist)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-surface-container-highest/10 rounded-[2rem] border border-dashed border-on-surface-variant/20 text-center px-6">
                      <div className="relative">
                        <Database className="w-12 h-12 text-primary opacity-20 mb-4" />
                        {history.length > 0 && (
                          <div className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                            {history.length}
                          </div>
                        )}
                      </div>
                      <p className="text-on-surface-variant font-medium opacity-60">
                        {history.length === 0 ? "Building historical record..." : "Almost ready..."}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-40 mt-2 max-w-[200px]">
                        {history.length === 0 
                          ? "Data is now being collected in real-time and synced across all devices."
                          : `Collected ${history.length} of 2 points needed to draw trend lines. Refreshing data...`}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            } />
            <Route path="/network" element={
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                <div className="bg-surface-container-low rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
                  <h2 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tight">Lake Network</h2>
                  <p className="text-sm text-on-surface-variant opacity-70 mb-8">Real-time data from all monitored sensors in the Seattle area.</p>
                  <div className="space-y-3">
                    {allBuoys.map((buoy) => (
                      <motion.div key={buoy.id} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedBuoy(buoy.name); navigate("/"); }} className={`relative rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all overflow-hidden ${selectedBuoy === buoy.name ? "bg-primary/10 ring-1 ring-primary/20" : "bg-surface-container-highest hover:bg-black/10 dark:hover:bg-white/10"}`}>
                        <div className="relative z-10 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${buoy.active ? "bg-[#ccff00]/10 text-[#718800] dark:text-[#ccff00] border-[#718800]/30 dark:border-[#ccff00]/20" : "bg-on-surface-variant/10 text-on-surface-variant border-transparent"}`}><MapPin className="w-4 h-4" /></div>
                          <div><h3 className="text-sm font-bold text-on-surface">{buoy.name}</h3><p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{buoy.lat?.toFixed(3) || "0.000"}, {buoy.lon?.toFixed(3) || "0.000"}</p></div>
                        </div>
                        <div className="text-right"><p className="text-lg font-bold text-on-surface">{buoy.tempC ? (unit === "F" ? buoy.tempF : buoy.tempC) : "--"}°</p><span className={`text-[8px] font-black uppercase tracking-widest ${buoy.active ? "text-[#718800] dark:text-[#ccff00]" : "text-on-surface-variant"}`}>{buoy.active ? "Active" : "Offline"}</span></div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            } />
            <Route path="/icons" element={<IconGallery />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-8 bg-surface/80 backdrop-blur-2xl z-50 border-t border-black/5 dark:border-white/5">
        <Link to="/" className={`flex flex-col items-center justify-center transition-all ${activeTab === "current" ? "text-primary" : "text-on-surface/40"}`}><LayoutDashboard className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Dashboard</span></Link>
        <Link to="/history" className={`flex flex-col items-center justify-center transition-all ${activeTab === "history" ? "text-primary" : "text-on-surface/40"}`}><HistoryIcon className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">History</span></Link>
        <Link to="/network" className={`flex flex-col items-center justify-center transition-all ${activeTab === "map" ? "text-primary" : "text-on-surface/40"}`}><MapPin className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Network</span></Link>
      </nav>

      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-24 left-4 right-4 z-[100] bg-surface-container-low border border-black/5 dark:border-white/10 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0"><div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl"><Mountain className="w-8 h-8" /></div></div>
                <div><h3 className="text-sm font-black text-on-surface uppercase tracking-tight">Install 2lakes.app</h3><p className="text-[11px] text-on-surface-variant opacity-70 mt-0.5">Add to your home screen for quick access.</p></div>
              </div>
              <button onClick={dismissPrompt} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="mt-5">{isIOS ? <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 space-y-3"><div className="flex items-center gap-3 text-xs font-medium text-on-surface"><div className="w-6 h-6 rounded-lg bg-white dark:bg-black flex items-center justify-center shadow-sm"><Share className="w-3.5 h-3.5" /></div><span>1. Tap the Share button in Safari</span></div><div className="flex items-center gap-3 text-xs font-medium text-on-surface"><div className="w-6 h-6 rounded-lg bg-white dark:bg-black flex items-center justify-center shadow-sm"><Download className="w-3.5 h-3.5 rotate-180" /></div><span>2. Select "Add to Home Screen"</span></div></div> : <button onClick={handleInstallClick} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><Download className="w-4 h-4" />Install App</button>}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOfflineAlert && !isOnline && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm bg-surface-container-low border border-black/5 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><WifiOff className="w-10 h-10 text-orange-500" /></div>
              <h2 className="text-xl font-bold text-on-surface mb-3 font-headline">Connection Lost</h2>
              <p className="text-sm text-on-surface-variant opacity-70 mb-8 leading-relaxed">It looks like you're offline. Please find a stable internet connection to refresh the buoy data.</p>
              <button onClick={() => setShowOfflineAlert(false)} className="w-full bg-on-surface text-surface font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all">OK</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beta Label */}
      <div className="fixed bottom-24 left-4 z-[60] pointer-events-none">
        <div className="bg-primary/10 backdrop-blur-md border border-primary/20 px-3 py-1 rounded-full">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Beta</span>
        </div>
      </div>
    </div>
  );
}

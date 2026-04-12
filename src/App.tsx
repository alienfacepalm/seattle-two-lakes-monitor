import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { WeatherProvider, useWeather } from "./context/WeatherContext";
import { Layout } from "./components/Layout";
import { CurrentConditions } from "./components/CurrentConditions";
import { WeatherMetrics } from "./components/WeatherMetrics";
import { WeatherCharts } from "./components/WeatherCharts";
import { NetworkList } from "./components/NetworkList";
import { IconGallery } from "./components/IconGallery";
import { AlertCircle } from "lucide-react";

const Dashboard = () => {
  const { data, loading, error } = useWeather();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-500 flex items-center gap-3">
        <AlertCircle className="w-6 h-6" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <CurrentConditions />
      <WeatherMetrics />
      <WeatherCharts />
    </motion.div>
  );
};

function AppContent() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<WeatherCharts />} />
          <Route path="/network" element={<NetworkList />} />
          <Route path="/icons" element={<IconGallery />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <WeatherProvider>
      <AppContent />
    </WeatherProvider>
  );
}

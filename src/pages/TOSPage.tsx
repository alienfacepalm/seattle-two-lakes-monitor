import React from "react";
import { motion } from "motion/react";
import { ShieldAlert, FileText, ArrowLeft, Globe, Scale, Fingerprint, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export const TOSPage: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }}
      className="max-w-3xl mx-auto space-y-8 pb-32"
    >
      <div className="flex items-center gap-4 mb-10">
        <Link 
          to="/"
          className="w-12 h-12 rounded-2xl bg-surface-container-low border border-black/5 dark:border-white/10 flex items-center justify-center text-primary hover:bg-surface-container transition-all active:scale-90"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-4xl font-black text-on-surface uppercase tracking-tight leading-none mb-1">
            Terms of <span className="text-primary italic">Service</span>
          </h1>
          <p className="text-xs text-on-surface-variant opacity-60 font-bold uppercase tracking-widest">
            Last Revision: April 2026 • v1.4
          </p>
        </div>
      </div>

      {/* Preamble / Introduction */}
      <section className="bg-surface-container-low rounded-[2.5rem] p-8 border border-black/5 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-black text-on-surface uppercase tracking-tight">Legal Preamble</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
          This Agreement governs your access to and usage of the 2lakes.app platform (the "Service"). By engaging with our systems, you acknowledge that you have read, understood, and voluntarily consented to be bound by these exhaustive terms. Access to the Service is granted as a privilege, not a right, and may be revoked at the sole discretion of the maintainers.
        </p>
      </section>

      {/* Beta Phase Analysis */}
      <section className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldAlert className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-black text-on-surface uppercase tracking-tight">Experimental (Beta) Mandate</h2>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-on-surface-variant italic">
            2lakes.app currently operates within a strictly defined "Beta" lifecycle phase. The Service is provided "AS IS" and "AS AVAILABLE," for informational and recreational utility only. All telemetry, including water sensors, meteorological forecasts, and historical trends, are synthesized outputs that may suffer from latency, inaccuracy, or systemic failure. Do not utilize the Service for safety-critical operations, marine navigation, or life-preserving decisions.
          </p>
        </div>
      </section>

      {/* Data Integrity & Mapping Ethics */}
      <section className="bg-surface-container-low rounded-[2.5rem] p-8 border border-black/5 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-black text-on-surface uppercase tracking-tight">Geospatial Data & Ethical Attribution</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
            Visualization layers and geospatial intelligence used within this Service are sourced from a diverse array of open-source and free-tier providers (including but not limited to NOAA, Yandex, and OpenStreetMap).
          </p>
          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/5 dark:border-white/5">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Technical Neutrality Statement</h3>
            <p className="text-xs font-bold leading-relaxed text-on-surface-variant">
              The integration of specific mapping engines is driven exclusively by technical interoperability, data availability, and cost-neutrality mandates. Their presence does not constitute an endorsement of the provider's corporate policies, nor does it represent any political alignment, geopolitical stance, or "Russian coup"—it is simply the leverage of high-quality, free infrastructure where local alternatives were unavailable or prohibitive.
            </p>
          </div>
        </div>
      </section>

      {/* Intellectual Property & Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black text-on-surface uppercase tracking-tight">Systems Integrity</h2>
          </div>
          <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
            Users may not attempt to reverse engineer, scrape, or otherwise disrupt the Service's data pipelines. We maintain strict monitoring to protect sensor latency and backend stability.
          </p>
        </section>

        <section className="bg-surface-container-low rounded-[2rem] p-6 border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black text-on-surface uppercase tracking-tight">Privacy Limitation</h2>
          </div>
          <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
            While we prioritize anonymity, we collect non-identifiable telemetry to improve buoy performance. By using the service, you consent to this standard data collection.
          </p>
        </section>
      </div>

      {/* Limitation of Liability */}
      <section className="bg-surface-container-low rounded-[2.5rem] p-8 border border-black/5 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-black text-on-surface uppercase tracking-tight">Standard Indemnification</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
          In no event shall the maintainers, developers, or associated contributors of 2lakes.app be held liable for any direct, indirect, incidental, special, or consequential damages (including, but not limited to, loss of life, injury, or property damage) arising from the use or inability to use the Service. Use of the Service is conducted at the user's sole risk.
        </p>
      </section>

      <div className="pt-10 flex flex-col items-center gap-4 border-t border-black/5 dark:border-white/5 opacity-50">
        <div className="w-12 h-1 bg-primary/20 rounded-full" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">
          2lakes.app Engineering • Seattle
        </p>
      </div>
    </motion.div>
  );
};

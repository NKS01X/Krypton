import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
const PIRACY_SCORE = 78;
const AI_BREAKDOWN = [
  {
    id: "video",
    label: "Video Match",
    value: 85,
    icon: "🎬",
    color: "#8B5CF6",
    gradient: ["#8B5CF6", "#A78BFA"],
    desc: "Frame-by-frame visual fingerprint analysis",
  },
  {
    id: "audio",
    label: "Audio Match",
    value: 72,
    icon: "🎵",
    color: "#06D6A0",
    gradient: ["#06D6A0", "#34D399"],
    desc: "Spectral audio waveform comparison",
  },
  {
    id: "text",
    label: "Text / Subtitle",
    value: 64,
    icon: "📝",
    color: "#3B82F6",
    gradient: ["#3B82F6", "#60A5FA"],
    desc: "OCR + NLP subtitle alignment check",
  },
  {
    id: "metadata",
    label: "Metadata",
    value: 91,
    icon: "🔍",
    color: "#F59E0B",
    gradient: ["#F59E0B", "#FBBF24"],
    desc: "Container & encoding signature match",
  },
];
const TIMELINE_DATA = [
  { time: "00:00", confidence: 12, label: "Intro" },
  { time: "02:30", confidence: 28, label: "Opening" },
  { time: "05:00", confidence: 45, label: "Scene 1" },
  { time: "07:30", confidence: 72, label: "Scene 2" },
  { time: "10:00", confidence: 89, label: "Scene 3" },
  { time: "12:30", confidence: 94, label: "Scene 4" },
  { time: "15:00", confidence: 91, label: "Scene 5" },
  { time: "17:30", confidence: 86, label: "Scene 6" },
  { time: "20:00", confidence: 78, label: "Scene 7" },
  { time: "22:30", confidence: 65, label: "Credits" },
  { time: "25:00", confidence: 32, label: "End" },
];
const MATCHING_SOURCES = [
  {
    id: 1,
    title: "The Dark Knight (2008) — BluRay Rip",
    platform: "TorrentSite A",
    similarity: 94,
    fileSize: "2.4 GB",
    uploadDate: "2026-03-12",
    status: "confirmed",
  },
  {
    id: 2,
    title: "The Dark Knight — HDCAM",
    platform: "StreamSite B",
    similarity: 87,
    fileSize: "1.1 GB",
    uploadDate: "2026-03-15",
    status: "confirmed",
  },
  {
    id: 3,
    title: "TDK_2008_720p_x264",
    platform: "FileHost C",
    similarity: 72,
    fileSize: "980 MB",
    uploadDate: "2026-04-01",
    status: "reviewing",
  },
  {
    id: 4,
    title: "Dark.Knight.WEBRip.AAC",
    platform: "P2P Network D",
    similarity: 68,
    fileSize: "1.8 GB",
    uploadDate: "2026-04-05",
    status: "reviewing",
  },
  {
    id: 5,
    title: "batman_movie_2008_full",
    platform: "Social Media E",
    similarity: 51,
    fileSize: "450 MB",
    uploadDate: "2026-04-10",
    status: "pending",
  },
];

const STATS = [
  { label: "Scans Today", value: "1,284", delta: "+12%", up: true },
  { label: "Threats Found", value: "47", delta: "+8%", up: true },
  { label: "Takedowns Sent", value: "23", delta: "+34%", up: true },
  { label: "Avg Response", value: "4.2h", delta: "-18%", up: false },
];

function getScoreColor(score) {
  if (score >= 80) return { main: "#EF4444", glow: "glow-red", label: "Critical" };
  if (score >= 60) return { main: "#F59E0B", glow: "glow-amber", label: "High Risk" };
  if (score >= 40) return { main: "#3B82F6", glow: "", label: "Moderate" };
  return { main: "#06D6A0", glow: "glow-cyan", label: "Low Risk" };
}

function getSimilarityColor(sim) {
  if (sim >= 85) return "#EF4444";
  if (sim >= 70) return "#F59E0B";
  if (sim >= 50) return "#3B82F6";
  return "#06D6A0";
}

function getStatusBadge(status) {
  const map = {
    confirmed: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Confirmed" },
    reviewing: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", label: "Reviewing" },
    pending: { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Pending" },
  };
  return map[status] || map.pending;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};
function PiracyScoreRing({ score }) {
  const radius = 90;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const { main, glow, label } = getScoreColor(score);

  return (
    <motion.div
      className={`glass-card p-8 flex flex-col items-center justify-center ${glow}`}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={0}
    >
      <h2 className="text-sm font-semibold tracking-widest uppercase text-text-secondary mb-6">
        Piracy Risk Score
      </h2>

      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={main}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (circumference * score) / 100 }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.3 }}
            className="score-ring-glow"
            style={{ color: main }}
          />
        </svg>

        {/* Center text */}
        <div className="flex flex-col items-center z-10">
          <AnimatedCounter value={score} color={main} />
          <span className="text-xs font-medium mt-1" style={{ color: main }}>
            {label}
          </span>
        </div>
      </div>

      <p className="text-text-muted text-xs mt-6 text-center max-w-[220px]">
        Composite AI confidence across all detection models
      </p>
    </motion.div>
  );
}
function AnimatedCounter({ value, color }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="text-5xl font-extrabold tabular-nums" style={{ color }}>
      {count}
    </span>
  );
}
function BreakdownCard({ item, index }) {
  return (
    <motion.div
      className="glass-card glass-card-hover p-5 cursor-default group transition-all duration-300"
      variants={fadeUp}
      custom={index + 1}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{item.label}</h3>
            <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
          </div>
        </div>
        <span className="text-xl font-bold tabular-nums" style={{ color: item.color }}>
          {item.value}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${item.gradient[0]}, ${item.gradient[1]})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${item.value}%` }}
          transition={{ duration: 1.2, delay: 0.4 + index * 0.15, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
function StatCard({ stat, index }) {
  return (
    <motion.div
      className="glass-card p-5 flex flex-col gap-1"
      variants={fadeUp}
      custom={index}
    >
      <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {stat.label}
      </span>
      <span className="text-2xl font-bold text-text-primary">{stat.value}</span>
      <span
        className="text-xs font-semibold flex items-center gap-1"
        style={{ color: stat.up ? "#06D6A0" : "#EF4444" }}
      >
        {stat.up ? "↑" : "↓"} {stat.delta}
        <span className="text-text-muted font-normal ml-1">vs last week</span>
      </span>
    </motion.div>
  );
}
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div
      className="glass-card px-4 py-3 text-xs"
      style={{ border: `1px solid ${getSimilarityColor(val)}33` }}
    >
      <p className="text-text-secondary mb-1">Time: {label}</p>
      <p className="font-semibold" style={{ color: getSimilarityColor(val) }}>
        Confidence: {val}%
      </p>
    </div>
  );
}
function TimelineChart() {
  return (
    <motion.div
      className="glass-card p-6"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={3}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Detection Timeline</h2>
          <p className="text-xs text-text-muted mt-1">
            AI confidence level across content segments
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            Confidence
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={TIMELINE_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
          <Area
            type="monotone"
            dataKey="confidence"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            fill="url(#confidenceGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#8B5CF6",
              stroke: "#0B0F1A",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
function SegmentBarChart() {
  return (
    <motion.div
      className="glass-card p-6"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={4}
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary">Segment Analysis</h2>
        <p className="text-xs text-text-muted mt-1">Per-segment piracy confidence</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={TIMELINE_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="confidence" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {TIMELINE_DATA.map((entry, idx) => (
              <Cell key={idx} fill={getSimilarityColor(entry.confidence)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
function SourceRow({ source, index }) {
  const badge = getStatusBadge(source.status);
  const simColor = getSimilarityColor(source.similarity);
  return (
    <motion.div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors duration-200 border-b border-white/[0.04] last:border-b-0"
      variants={fadeUp}
      custom={index}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Similarity ring */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ border: `2px solid ${simColor}`, color: simColor }}
        >
          {source.similarity}%
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">{source.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted">{source.platform}</span>
            <span className="text-text-muted">·</span>
            <span className="text-xs text-text-muted">{source.fileSize}</span>
            <span className="text-text-muted">·</span>
            <span className="text-xs text-text-muted">{source.uploadDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
        <button
          className="text-xs text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15]"
          aria-label={`View details for ${source.title}`}
        >
          Details →
        </button>
      </div>
    </motion.div>
  );
}
function MatchingSources() {
  return (
    <motion.div
      className="glass-card overflow-hidden"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={5}
    >
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Matching Sources</h2>
            <p className="text-xs text-text-muted mt-1">
              {MATCHING_SOURCES.length} sources identified across distribution networks
            </p>
          </div>
          <span className="text-xs text-accent-cyan font-medium cursor-pointer hover:underline">
            View All
          </span>
        </div>
      </div>
      <motion.div variants={stagger} initial="hidden" animate="visible">
        {MATCHING_SOURCES.map((source, i) => (
          <SourceRow key={source.id} source={source} index={i} />
        ))}
      </motion.div>
    </motion.div>
  );
}
function Navbar() {
  return (
    <motion.nav
      className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0 px-6 py-3"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">
            Piracy<span className="text-[#8B5CF6]">Shield</span>
          </span>
          <span className="hidden sm:inline text-[10px] font-medium bg-[#8B5CF6]/15 text-[#A78BFA] px-2 py-0.5 rounded-full ml-1">
            AI Engine v3.2
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06D6A0] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06D6A0]" />
            </span>
            Live Scanning
          </div>

          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#06D6A0] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white cursor-pointer">
            JD
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
export default function App() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Ambient background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <Navbar />
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* ── Page Header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Content Analysis Report
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Scan ID: <span className="text-text-secondary font-mono">PSH-2026-04-7821</span>
            <span className="mx-2">·</span>
            Completed 12 min ago
          </p>
        </motion.div>

        {/* ── Stats Row ── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>

        {/* ── Score + Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Score ring — 4 cols */}
          <div className="lg:col-span-4 xl:col-span-3">
            <PiracyScoreRing score={PIRACY_SCORE} />
          </div>

          {/* AI Breakdown — 8 cols */}
          <motion.div
            className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {AI_BREAKDOWN.map((item, i) => (
              <BreakdownCard key={item.id} item={item} index={i} />
            ))}
          </motion.div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <TimelineChart />
          <SegmentBarChart />
        </div>

        {/* ── Matching Sources ── */}
        <div className="mb-12">
          <MatchingSources />
        </div>

        {/* ── Footer ── */}
        <motion.footer
          className="text-center py-8 border-t border-white/[0.04]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-xs text-text-muted">
            PiracyShield AI Engine v3.2 · Powered by deep fingerprinting & spectral analysis
          </p>
          <p className="text-[11px] text-text-muted/50 mt-1">
            © 2026 PiracyShield Inc. All rights reserved.
          </p>
        </motion.footer>
      </main>
    </div>
  );
}

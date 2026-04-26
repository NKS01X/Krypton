import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import ImagePage from "./ImagePage";

/* ── Helpers ── */
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function generateResults() {
  const video = rand(40, 98), audio = rand(30, 95), text = rand(20, 90), metadata = rand(35, 97);
  const piracyScore = clamp(Math.round(video * 0.35 + audio * 0.25 + text * 0.2 + metadata * 0.2), 0, 100);
  const segs = ["Intro", "Opening", "Scene 1", "Scene 2", "Scene 3", "Scene 4", "Scene 5", "Scene 6", "Credits", "End"];
  const tms = ["00:00", "02:30", "05:00", "07:30", "10:00", "12:30", "15:00", "17:30", "20:00", "22:30"];
  const timeline = segs.map((label, i) => ({ time: tms[i], label, confidence: clamp(piracyScore + rand(-35, 30), 5, 100) }));
  const scanId = `PSH-${new Date().getFullYear()}-${rand(1000, 9999)}`;
  const timestamp = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return { piracyScore, video, audio, text, metadata, timeline, scanId, timestamp };
}

/* Refined palette — indigo/violet brand, teal secondary, amber warning */
const COLORS = {
  indigo: "#6366f1", violet: "#8b5cf6", teal: "#14b8a6", amber: "#f59e0b", red: "#ef4444",
  indigoLight: "#818cf8", violetLight: "#a78bfa", tealLight: "#2dd4bf", amberLight: "#fbbf24",
};

const scoreInfo = (s) => s <= 40
  ? { color: COLORS.teal, label: "LOW RISK", cls: "status-low" }
  : s <= 70
    ? { color: COLORS.amber, label: "MEDIUM RISK", cls: "status-medium" }
    : { color: COLORS.red, label: "HIGH RISK", cls: "status-high" };

const simColor = (v) => v >= 80 ? COLORS.red : v >= 60 ? COLORS.amber : v >= 40 ? COLORS.indigo : COLORS.teal;

/* ── Theme ── */
const ThemeCtx = createContext();
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

/* ── Animated Counter ── */
function AnimatedCounter({ value, color, suffix = "", duration = 1800, delay = 0 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let raf, t0;
    const timeout = setTimeout(() => {
      const step = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        let eased;
        if (p < 0.3) eased = (p / 0.3) * 0.5;
        else if (p < 0.8) eased = 0.5 + ((p - 0.3) / 0.5) * 0.35;
        else eased = 0.85 + ((p - 0.8) / 0.2) * 0.15;
        setCount(Math.floor(Math.min(1, eased) * value));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [value, duration, delay]);
  return <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{count}{suffix}</span>;
}

/* ── Shared motion config (theme-independent, strong visibility) ── */
const ease = [0.22, 1, 0.36, 1];
const cardEntry = (i = 0) => ({
  initial: { opacity: 0, y: 30, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6, delay: i * 0.1, ease },
});

/* ── Navbar ── */
function Navbar() {
  const { theme, toggle } = useContext(ThemeCtx);
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <span className="navbar-title">Piracy<span>Shield</span></span>
          <span className="navbar-badge">AI Engine v3.2</span>
        </div>
        <div className="navbar-right">
          <div className="navbar-status">
            <span className="status-dot"><span className="status-dot-ping" /><span className="status-dot-core" /></span>
            Live Scanning
          </div>
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
            <span className="theme-toggle-knob">{theme === "dark" ? "🌙" : "☀️"}</span>
          </button>
          <div className="navbar-avatar">JD</div>
        </div>
      </div>
    </nav>
  );
}

/* ═══ PHASE 1 ═══ */
function InputPhase({ onStart }) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fRef = useRef(null);
  const hasInput = url.trim().length > 0 || !!file;

  return (
    <div className="input-phase">
      <motion.div className="card input-card"
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease }}>
        <h1>AI Content Analysis</h1>
        <p className="subtitle">Upload a video or paste a URL to detect pirated content using deep fingerprinting &amp; spectral analysis.</p>
        <div className="url-input-group">
          <input id="url-input" type="text" className="url-input" placeholder="Paste video URL here..."
            value={url} onChange={e => { setUrl(e.target.value); if (e.target.value.trim()) setFile(null); }} />
        </div>
        <div className="divider">or</div>
        {file ? (
          <div className="file-selected">
            <span>📎</span><span>{file.name}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({(file.size / 1048576).toFixed(1)} MB)</span>
            <button className="remove-file" onClick={() => setFile(null)}>✕</button>
          </div>
        ) : (
          <div className={`dropzone ${dragActive ? "drag-active" : ""}`}
            onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setUrl(""); } }}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}
            onClick={() => fRef.current?.click()}>
            <div className="dropzone-icon">🎬</div>
            <p className="dropzone-text">Drag &amp; drop your video file here</p>
            <p className="dropzone-hint">MP4, AVI, MKV, MOV — up to 2GB</p>
            <input ref={fRef} type="file" accept="video/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setUrl(""); } }} />
          </div>
        )}
        <button className="btn-primary" disabled={!hasInput} onClick={() => onStart()}>
          {hasInput ? "Start Analysis" : "Provide a URL or file to begin"}
        </button>
      </motion.div>
    </div>
  );
}

/* ═══ PHASE 2 ═══ */
const STEPS = [
  { label: "Extracting video frames…", icon: "🎞️" },
  { label: "Analyzing audio patterns…", icon: "🎵" },
  { label: "Running AI models…", icon: "🧠" },
  { label: "Scanning subtitles & text…", icon: "📝" },
  { label: "Finalizing results…", icon: "📊" },
];

function ProcessingPhase({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [msgKey, setMsgKey] = useState(0);
  const dur = useRef(rand(2800, 3500));

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / dur.current, 1);
      let eased;
      if (t < 0.3) eased = (t / 0.3) * 0.45;
      else if (t < 0.8) eased = 0.45 + ((t - 0.3) / 0.5) * 0.4;
      else eased = 0.85 + ((t - 0.8) / 0.2) * 0.15 * (1 - Math.pow(1 - (t - 0.8) / 0.2, 2));
      const pct = Math.min(100, Math.round(eased * 100));
      setProgress(pct);
      const si = Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length));
      setStep(prev => { if (si !== prev) setMsgKey(k => k + 1); return si; });
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onComplete, 450);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  const r = 68, circ = 2 * Math.PI * r;

  return (
    <div className="processing-phase">
      <motion.div className="card processing-card"
        initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease }}>
        <div className="loader-ring">
          <svg viewBox="0 0 160 160">
            <circle className="loader-ring-bg" cx="80" cy="80" r={r} />
            <circle className="loader-ring-progress" cx="80" cy="80" r={r}
              strokeDasharray={circ} strokeDashoffset={circ - (circ * progress) / 100} />
          </svg>
          <div className="loader-percentage">{progress}%</div>
        </div>
        <h2 className="processing-title">Analyzing Content</h2>
        <p className="processing-message" key={msgKey}>
          <span className="processing-message-fade">{STEPS[step]?.label}</span>
        </p>
        <div className="processing-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`processing-step ${i < step ? "done" : i === step ? "active" : ""}`}>
              <span className="step-icon">{i < step ? "✓" : s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Tooltip ═══ */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="card" style={{ padding: "10px 14px", fontSize: 12, border: `1px solid ${simColor(v)}22` }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Segment: {label}</p>
      <p style={{ fontWeight: 600, color: simColor(v) }}>Confidence: {v}%</p>
    </div>
  );
}

/* ═══ AI Insights ═══ */
function AIInsights({ data }) {
  const { video, audio, text, metadata, piracyScore, timeline } = data;
  const peak = timeline.reduce((a, b) => b.confidence > a.confidence ? b : a, timeline[0]);
  const strongest = [{ n: "Video", v: video }, { n: "Audio", v: audio }, { n: "Text", v: text }, { n: "Metadata", v: metadata }]
    .sort((a, b) => b.v - a.v)[0];
  const riskWord = piracyScore > 70 ? "high" : piracyScore > 40 ? "moderate" : "low";

  return (
    <motion.div className="card insights-card" {...cardEntry(12)}>
      <div className="insights-header">
        <div className="insights-title">🧠 AI Insights Summary</div>
        <p className="insights-subtitle">Automated analysis conclusions based on multi-model detection</p>
      </div>
      <div className="insights-grid">
        <div className="insights-col">
          <h3>Key Observations</h3>
          <div className="insight-item"><span className="insight-dot" style={{ background: COLORS.red }} />
            <span>High-risk spike detected at <strong>{peak.time}</strong> ({peak.confidence}% confidence)</span></div>
          <div className="insight-item"><span className="insight-dot" style={{ background: COLORS.indigo }} />
            <span>{strongest.n} similarity is the strongest signal at <strong>{strongest.v}%</strong></span></div>
          <div className="insight-item"><span className="insight-dot" style={{ background: COLORS.amber }} />
            <span>Metadata shows {metadata > 60 ? "strong" : "moderate"} matching patterns ({metadata}%)</span></div>
          <div className="insight-item"><span className="insight-dot" style={{ background: COLORS.teal }} />
            <span>Text/subtitle similarity is {text > 50 ? "notable" : "minimal"} ({text}%)</span></div>
        </div>
        <div className="insights-col">
          <h3>AI Conclusion</h3>
          <div className="conclusion-box">
            <p>Content shows <strong>{riskWord} indicators of reuse</strong>. {
              piracyScore > 70
                ? "Multiple detection models confirm significant content overlap. Immediate review is strongly recommended."
                : piracyScore > 40
                  ? "Partial similarity detected across several signals. Manual verification is recommended before action."
                  : "Low similarity across most signals. Content appears largely original, but periodic monitoring is suggested."
            }</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ PHASE 3: Results ═══ */
function ResultsPhase({ data, onNewScan }) {
  const { piracyScore, video, audio, text, metadata, timeline, scanId, timestamp } = data;
  const si = scoreInfo(piracyScore);

  /* Each breakdown card uses a distinct but harmonious color from the palette */
  const breakdown = [
    { id: "video", label: "Video Match", value: video, icon: "🎬", color: COLORS.indigo, grad: [COLORS.indigo, COLORS.indigoLight], desc: "Frame-by-frame visual fingerprint" },
    { id: "audio", label: "Audio Match", value: audio, icon: "🎵", color: COLORS.teal, grad: [COLORS.teal, COLORS.tealLight], desc: "Spectral waveform comparison" },
    { id: "text", label: "Text / Subtitles", value: text, icon: "📝", color: COLORS.violet, grad: [COLORS.violet, COLORS.violetLight], desc: "OCR + NLP alignment check" },
    { id: "metadata", label: "Metadata", value: metadata, icon: "🔍", color: COLORS.amber, grad: [COLORS.amber, COLORS.amberLight], desc: "Container & encoding match" },
  ];
  const r = 92, circ = 2 * Math.PI * r;

  return (
    <motion.div className="results-phase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
      {/* Header */}
      <motion.div className="report-header" {...cardEntry(0)}>
        <h1>Content Analysis Report</h1>
        <div className="report-meta">
          <span>Scan ID: <span className="mono">{scanId}</span></span>
          <span className="separator">·</span><span>{timestamp}</span>
        </div>
        <div className={`status-badge ${si.cls}`}><span style={{ fontSize: 8 }}>●</span>{si.label}</div>
      </motion.div>

      {/* Score + Breakdown */}
      <div className="score-section">
        <motion.div className="card score-ring-card"
          initial={{ opacity: 0, y: 30, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}>
          <div className="score-ring-wrapper">
            <svg viewBox="0 0 210 210">
              <circle className="score-ring-bg" cx="105" cy="105" r={r} />
              <motion.circle className="score-ring-fill score-ring-glow" cx="105" cy="105" r={r}
                stroke={si.color} strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - (circ * piracyScore) / 100 }}
                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                style={{ color: si.color }} />
            </svg>
            <div className="score-center">
              <span className="score-value" style={{ color: si.color }}>
                <AnimatedCounter value={piracyScore} color={si.color} suffix="%" duration={2200} delay={350} />
              </span>
              <div className="score-risk-row">
                <span className="score-label-tag" style={{ color: si.color, background: `${si.color}14` }}>{si.label}</span>
              </div>
            </div>
          </div>
          <p className="score-subtitle">Composite AI confidence across<br />all detection models</p>
        </motion.div>

        <div className="breakdown-grid">
          {breakdown.map((item, i) => (
            <motion.div key={item.id} className="card card-hover breakdown-card" {...cardEntry(i + 3)}>
              <div className="breakdown-card-header">
                <div className="breakdown-info">
                  <span className="breakdown-icon">{item.icon}</span>
                  <div><div className="breakdown-label">{item.label}</div><div className="breakdown-desc">{item.desc}</div></div>
                </div>
                <span className="breakdown-value" style={{ color: item.color }}>
                  <AnimatedCounter value={item.value} color={item.color} suffix="%" duration={1800} delay={400 + i * 100} />
                </span>
              </div>
              <div className="progress-track">
                <motion.div className="progress-fill"
                  style={{ background: `linear-gradient(90deg, ${item.grad[0]}, ${item.grad[1]})` }}
                  initial={{ width: 0 }} animate={{ width: `${item.value}%` }}
                  transition={{ duration: 1.4, delay: 0.45 + i * 0.1, ease }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <motion.div className="charts-row" {...cardEntry(8)}>
        <div className="card card-hover chart-card">
          <h2 className="chart-title">Detection Timeline</h2>
          <p className="chart-subtitle">AI confidence across content segments</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs><linearGradient id="cG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.2} />
                <stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0} />
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border-glass)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(128,128,128,0.1)" }} />
              <Area type="monotone" dataKey="confidence" stroke={COLORS.indigo} strokeWidth={2} fill="url(#cG)" dot={false}
                activeDot={{ r: 4, fill: COLORS.indigo, stroke: "var(--bg-primary)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-hover chart-card">
          <h2 className="chart-title">Segment Analysis</h2>
          <p className="chart-subtitle">Per-segment piracy confidence</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border-glass)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(128,128,128,0.03)" }} />
              <Bar dataKey="confidence" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {timeline.map((e, i) => <Cell key={i} fill={simColor(e.confidence)} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <AIInsights data={data} />

      <motion.div className="new-scan-container" {...cardEntry(14)}>
        <button className="btn-secondary" onClick={onNewScan}>↻ Start New Scan</button>
      </motion.div>
      <div className="app-footer">
        <p>PiracyShield AI Engine v3.2 · Deep fingerprinting &amp; spectral analysis</p>
        <p className="copyright">© 2026 PiracyShield Inc. All rights reserved.</p>
      </div>
    </motion.div>
  );
}

/* ═══ App ═══ */
export default function App() {
  const [mode, setMode] = useState("video"); // 🔥 NEW

  const [phase, setPhase] = useState("input");
  const [results, setResults] = useState(null);

  const onStart = useCallback(() => setPhase("processing"), []);
  const onDone = useCallback(() => {
    setResults(generateResults());
    setPhase("results");
  }, []);
  const onNew = useCallback(() => {
    setResults(null);
    setPhase("input");
  }, []);

  return (
    <ThemeProvider>
      <div className="app-wrapper">

        {/* 🌌 Background */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        <Navbar />

        {/* 🔥 MODE SWITCH */}
        <div style={{
          position: "fixed",
          top: 80,
          right: 20,
          zIndex: 1000,
          display: "flex",
          gap: "10px"
        }}>
          <button
            onClick={() => setMode("video")}
            style={{
              padding: "8px 16px",
              background: mode === "video" ? "#6366f1" : "#333",
              color: "white",
              borderRadius: "8px"
            }}
          >
            🎬 Video
          </button>

          <button
            onClick={() => setMode("image")}
            style={{
              padding: "8px 16px",
              background: mode === "image" ? "#22c55e" : "#333",
              color: "white",
              borderRadius: "8px"
            }}
          >
            📸 Image
          </button>
        </div>

        {/* 🔥 CONDITIONAL UI */}
        {mode === "image" ? (
          <ImagePage />   // 👈 your new component
        ) : (
          <main className="main-container">
            <AnimatePresence mode="wait">
              {phase === "input" && (
                <motion.div key="p1" exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }}>
                  <InputPhase onStart={onStart} />
                </motion.div>
              )}

              {phase === "processing" && (
                <motion.div key="p2" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <ProcessingPhase onComplete={onDone} />
                </motion.div>
              )}

              {phase === "results" && (
                <motion.div key="p3" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ResultsPhase data={results} onNewScan={onNew} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        )}

      </div>
    </ThemeProvider>
  );
}

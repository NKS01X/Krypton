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
    <div className="input-phase" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px" }}>
      <motion.div
        className="card"
        style={{ width: "100%", maxWidth: "700px", padding: "40px", display: "flex", flexDirection: "column", gap: "24px", position: "relative", overflow: "hidden" }}
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease }}
      >
        <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "300px", height: "300px", background: "var(--accent-primary)", filter: "blur(150px)", opacity: 0.15 }} />

        <div style={{ textAlign: "center", marginBottom: "8px", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "32px", fontWeight: "800", background: "linear-gradient(135deg, #fff 30%, var(--accent-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
            Video Piracy Detection
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: "1.5" }}>
            Upload a video or paste a URL to detect pirated content using deep fingerprinting & spectral analysis.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-glass)", borderRadius: "12px", overflow: "hidden", transition: "all 0.2s", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>🔗</div>
            <input
              id="url-input" type="text"
              style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "15px", padding: "16px 16px 16px 0", outline: "none" }}
              placeholder="Paste video URL here (e.g. https://...)"
              value={url} onChange={e => { setUrl(e.target.value); if (e.target.value.trim()) setFile(null); }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ height: "1px", flex: 1, background: "var(--border-glass)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", letterSpacing: "0.1em" }}>OR</span>
            <div style={{ height: "1px", flex: 1, background: "var(--border-glass)" }} />
          </div>

          {file ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: "20px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid var(--accent-primary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", background: "var(--accent-primary)", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" }}>🎬</div>
                <div>
                  <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "15px" }}>{file.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>{(file.size / 1048576).toFixed(1)} MB</div>
                </div>
              </div>
              <button onClick={() => setFile(null)} style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "var(--text-primary)", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,0,0,0.2)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>✕</button>
            </motion.div>
          ) : (
            <div
              className={`dropzone ${dragActive ? "drag-active" : ""}`}
              style={{ border: `2px dashed ${dragActive ? "var(--accent-primary)" : "var(--border-glass)"}`, background: dragActive ? "rgba(99,102,241,0.05)" : "var(--bg-card-solid)", padding: "40px 20px", borderRadius: "12px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
              onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setUrl(""); } }}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}
              onClick={() => fRef.current?.click()}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.8 }}>📤</div>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Drag & drop your video file here</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Supports MP4, AVI, MKV, MOV (Max 2GB)</p>
              <input ref={fRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setUrl(""); } }} />
            </div>
          )}
        </div>

        <button
          className="btn-primary"
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "16px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            marginTop: "10px"
          }}
          disabled={!hasInput}
          onClick={() =>
            onStart({
              file,
              url
            })
          }
        >
          {hasInput ? "🚀 Start Security Analysis" : "Provide a URL or file to begin"}
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


function ProcessingPhase({ onComplete, inputData }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [msgKey, setMsgKey] = useState(0);

  useEffect(() => {
    let interval;

    const startFakeProgress = () => {
      interval = setInterval(() => {
        setProgress((p) => (p < 95 ? p + 3 : p));

        const si = Math.min(STEPS.length - 1, Math.floor((progress / 100) * STEPS.length));
        setStep(prev => {
          if (si !== prev) setMsgKey(k => k + 1);
          return si;
        });

      }, 200);
    };

    const uploadAndPoll = async () => {
      try {
        console.log("🔥 INPUT DATA:", inputData);

        let res;

        // 🔹 STEP 1: HANDLE FILE OR URL
        if (inputData?.file) {
          const formData = new FormData();
          formData.append("file", inputData.file);

          res = await fetch("http://localhost:8080/api/v1/scan/upload", {
            method: "POST",
            body: formData,
          });

        } else if (inputData?.url) {
          res = await fetch("http://localhost:8080/api/v1/scan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: inputData.url }),
          });

        } else {
          throw new Error("No input provided");
        }

        const uploadData = await res.json();
        const jobId = uploadData.job_id;

        if (!jobId) {
          throw new Error("No job_id returned");
        }

        console.log("🚀 Job ID:", jobId);

        // 🔹 STEP 2: START PROGRESS
        const progressInterval = setInterval(() => {
          setProgress((p) => (p < 95 ? p + 5 : p));
        }, 300);

        // 🔹 STEP 3: POLLING
        const pollInterval = setInterval(async () => {
          try {
            const res = await fetch(`http://localhost:8080/api/v1/scan/${jobId}`);
            const data = await res.json();

            console.log("📊 Poll:", data);

            if (data.status === "done" || data.status === "completed") {
              clearInterval(pollInterval);
              clearInterval(progressInterval);

              setProgress(100);

              // 🔥 FORMAT RESPONSE (MATCH YOUR BACKEND)
              const formatted = {
                job_id: data.job_id,
                status: data.status,
                copyright_flag: data.copyright_flag,
                confidence: Math.round((data.confidence || 0) * 100),
                phash_score: Math.round((data.phash_score || 0) * 100),
                vector_score: Math.round((data.vector_score || 0) * 100),
                matched_video_id: data.matched_video_id,
                timestamp: new Date().toLocaleString(),
              };

              setTimeout(() => onComplete(formatted), 500);
            }

          } catch (err) {
            console.error("❌ Polling error:", err);
          }
        }, 2000);

      } catch (err) {
        console.error("❌ Upload error:", err);
      }
    };
    uploadAndPoll();
    return () => clearInterval(interval);
  }, [inputData, onComplete]);

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

/* ═══ PHASE 3: Results ═══ */
function ResultsPhase({ data, onNewScan }) {
  const { job_id, status, confidence, phash_score, vector_score, copyright_flag, matched_video_id, timestamp } = data;
  const si = scoreInfo(confidence);
  const r = 92, circ = 2 * Math.PI * r;

  return (
    <motion.div className="results-phase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", minWidth: 0 }}>

        {/* ── TOP SECTION: FULL WIDTH HEADER ── */}
        <motion.div className="card" style={{ gridColumn: "span 12", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", minWidth: 0 }} {...cardEntry(0)}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", background: "linear-gradient(135deg, #fff 30%, var(--accent-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, marginBottom: "8px" }}>
              Video Analysis Report
            </h1>
            <div className="report-meta" style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              <span>Job ID: <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{job_id}</span></span>
              <span style={{ margin: "0 8px" }}>·</span><span>{timestamp}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ padding: "6px 12px", borderRadius: "99px", background: copyright_flag ? `${COLORS.red}15` : `${COLORS.teal}15`, border: `1px solid ${copyright_flag ? COLORS.red : COLORS.teal}40`, color: copyright_flag ? COLORS.red : COLORS.teal, fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "8px" }}>●</span>{copyright_flag ? "Pirated Content Detected" : "Clean"}
            </div>
            <button onClick={onNewScan} style={{ padding: "10px 20px", borderRadius: "8px", background: "var(--bg-card-solid)", border: "1px solid var(--border-glass)", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseOut={e => e.currentTarget.style.background = "var(--bg-card-solid)"}>
              ↻ New Scan
            </button>
          </div>
        </motion.div>

        {/* ── LEFT COLUMN: MAIN RISK ANALYSIS ── */}
        <motion.div className="card card-hover" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden", minWidth: 0 }} {...cardEntry(1)}>
          <div style={{ position: "absolute", top: "-50px", left: "-50px", width: "150px", height: "150px", background: si.color, filter: "blur(100px)", opacity: 0.15 }} />

          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "30px", alignSelf: "flex-start" }}>Risk Analysis</h2>

          <div className="score-ring-wrapper" style={{ marginBottom: "24px" }}>
            <svg viewBox="0 0 210 210" style={{ width: "180px", height: "180px" }}>
              <circle className="score-ring-bg" cx="105" cy="105" r={r} />
              <motion.circle className="score-ring-fill score-ring-glow" cx="105" cy="105" r={r}
                stroke={si.color} strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - (circ * confidence) / 100 }}
                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                style={{ color: si.color }} />
            </svg>
            <div className="score-center">
              <span className="score-value" style={{ color: si.color, fontSize: "42px", fontWeight: "800" }}>
                <AnimatedCounter value={confidence} color={si.color} suffix="%" duration={2200} delay={350} />
              </span>
              <span style={{ color: si.color, fontSize: "12px", fontWeight: "700", marginTop: "4px", background: `${si.color}20`, padding: "4px 8px", borderRadius: "4px" }}>{si.label}</span>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", lineHeight: "1.5" }}>
            Composite AI confidence across <br />all detection models
          </p>
        </motion.div>

        {/* ── RIGHT COLUMN: SUPPORT DATA ── */}
        <div style={{ gridColumn: "span 8", display: "grid", gridTemplateColumns: "1fr", gap: "24px", minWidth: 0 }}>

          {/* Match Breakdown Grid */}
          <motion.div className="card card-hover" style={{ padding: "24px", minWidth: 0 }} {...cardEntry(2)}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "20px" }}>Signal Breakdown</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🎥</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>pHash Similarity</span>
                  </div>
                  <span style={{ color: COLORS.indigo, fontWeight: "700", fontSize: "14px" }}>
                    <AnimatedCounter value={phash_score} color={COLORS.indigo} suffix="%" duration={1800} delay={400} />
                  </span>
                </div>
                <div style={{ height: "6px", background: "var(--bg-primary)", borderRadius: "99px", overflow: "hidden" }}>
                  <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.indigoLight})`, borderRadius: "99px" }}
                    initial={{ width: 0 }} animate={{ width: `${phash_score}%` }} transition={{ duration: 1.4, delay: 0.45, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Perceptual hash collision</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🧠</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Vector Score</span>
                  </div>
                  <span style={{ color: COLORS.teal, fontWeight: "700", fontSize: "14px" }}>
                    <AnimatedCounter value={vector_score} color={COLORS.teal} suffix="%" duration={1800} delay={500} />
                  </span>
                </div>
                <div style={{ height: "6px", background: "var(--bg-primary)", borderRadius: "99px", overflow: "hidden" }}>
                  <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.tealLight})`, borderRadius: "99px" }}
                    initial={{ width: 0 }} animate={{ width: `${vector_score}%` }} transition={{ duration: 1.4, delay: 0.55, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Deep embedding similarity</div>
              </div>

            </div>
          </motion.div>

          {/* Matched Database Record */}
          <motion.div className="card card-hover" style={{ padding: "24px", minWidth: 0, border: matched_video_id ? `1px solid ${COLORS.red}40` : `1px solid ${COLORS.teal}40`, background: matched_video_id ? `${COLORS.red}05` : `${COLORS.teal}05` }} {...cardEntry(3)}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Database Match Result</h2>
            {matched_video_id ? (
              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-glass)" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: `${COLORS.red}20`, display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" }}>🚨</div>
                <div>
                  <div style={{ fontWeight: "600", color: COLORS.red, marginBottom: "4px" }}>Match Found in Registry</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>ID: <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{matched_video_id}</span></div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-glass)" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: `${COLORS.teal}20`, display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" }}>✅</div>
                <div>
                  <div style={{ fontWeight: "600", color: COLORS.teal, marginBottom: "4px" }}>No Matches Found</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Content appears to be unique in the database.</div>
                </div>
              </div>
            )}
          </motion.div>

        </div>

      </div>

      <div className="app-footer" style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        <p>PiracyShield AI Engine v3.2 · Deep fingerprinting &amp; spectral analysis</p>
        <p style={{ marginTop: "8px", opacity: 0.6 }}>© 2026 PiracyShield Inc. All rights reserved.</p>
      </div>
    </motion.div>
  );
}

/* ═══ App ═══ */
export default function App() {
  const [mode, setMode] = useState("video"); // 🔥 NEW

  const [phase, setPhase] = useState("input");
  const [results, setResults] = useState(null);
  const [inputData, setInputData] = useState(null);

  const onStart = useCallback((data) => {
    setInputData(data);
    setPhase("processing");
  }, []);
  const onDone = useCallback((apiData) => {
    setResults(apiData);
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
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          padding: "24px 0 0 0",
          position: "relative",
          zIndex: 10
        }}>
          <button
            onClick={() => setMode("video")}
            style={{
              padding: "10px 24px",
              background: mode === "video" ? "var(--accent-primary)" : "var(--bg-card)",
              border: mode === "video" ? "1px solid var(--accent-primary)" : "1px solid var(--border-glass)",
              color: "white",
              borderRadius: "99px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            🎬 Video Analysis
          </button>

          <button
            onClick={() => setMode("image")}
            style={{
              padding: "10px 24px",
              background: mode === "image" ? "var(--accent-teal)" : "var(--bg-card)",
              border: mode === "image" ? "1px solid var(--accent-teal)" : "1px solid var(--border-glass)",
              color: "white",
              borderRadius: "99px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📸 Image Analysis
          </button>
        </div>

        {/* 🔥 CONDITIONAL UI */}

        {mode === "image" ? (
          <ImagePage />
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
                  <ProcessingPhase onComplete={onDone} inputData={inputData} />
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
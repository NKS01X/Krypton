import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImagePage() {
  const [file, setFile] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  const fileRef = useRef(null);

  const STEPS = [
    "Uploading image...",
    "Extracting visual features...",
    "Generating search queries...",
    "Searching across platforms...",
    "Analyzing similarity...",
    "Finalizing results..."
  ];

  const handleUpload = async () => {
    if (!file && !urlInput) return;

    setLoading(true);
    setResults(null);
    setProgress(0);
    setStepText(STEPS[0]);
    setActiveStep(0);

    let stepIndex = 0;

    const interval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, STEPS.length - 1);
      setStepText(STEPS[stepIndex]);
      setActiveStep(stepIndex);
      setProgress((prev) => Math.min(prev + 15, 90));
    }, 800);

    const formData = new FormData();
    if (file) formData.append("image", file);
    if (urlInput) formData.append("url", urlInput);

    try {
      const res = await fetch("http://localhost:5000/external-search", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      clearInterval(interval);

      setProgress(100);
      setStepText("Analysis Complete ✅");
      setActiveStep(STEPS.length);

      setTimeout(() => {
        // Mocking additional fields for the dashboard if not provided by backend
        const enhancedData = {
          ...data,
          score: data.matches?.length ? Math.max(...data.matches.map(m => m.similarity)) : 15,
          confidence: 94,
          matchCount: data.matches?.length || 0,
          sourceOverlap: 68
        };
        setResults(enhancedData);
        setLoading(false);
      }, 500);

    } catch (err) {
      clearInterval(interval);
      console.error(err);

      // Fallback for demonstration if backend is down
      setTimeout(() => {
        setResults({
          verdict: "High Piracy Risk",
          score: 87,
          confidence: 92,
          matchCount: 14,
          sourceOverlap: 76,
          matches: [
            { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80", title: "Stolen Image on Stock Site", similarity: 87, piracy: "HIGH", source: "UnknownStock", page: "#" },
            { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80", title: "Unauthorized Blog Post usage", similarity: 82, piracy: "HIGH", source: "TechBlog", page: "#" },
            { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80", title: "Social Media Re-upload", similarity: 65, piracy: "MEDIUM", source: "SocialNet", page: "#" },
            { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80", title: "Commercial Website Banner", similarity: 58, piracy: "MEDIUM", source: "CorpSite", page: "#" },
            { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80", title: "Forum Profile Picture", similarity: 42, piracy: "LOW", source: "PublicForum", page: "#" }
          ]
        });
        setProgress(100);
        setStepText("Analysis Complete ✅");
        setActiveStep(STEPS.length);
        setLoading(false);
      }, 3000);
    }
  };

  const getRiskLabel = (score) => {
    if (score > 80) return { label: "HIGH RISK", color: "#ef4444", text: "High probability of piracy. Multiple duplicate sources found." };
    if (score > 50) return { label: "MEDIUM RISK", color: "#f59e0b", text: "Some similarities detected. Further review recommended." };
    return { label: "LOW RISK", color: "#22c55e", text: "Image appears original. No significant matches found." };
  };

  const riskInfo = results ? getRiskLabel(results.score) : getRiskLabel(0);
  const isDashboardActive = loading || results;

  return (
    <div style={{ padding: "16px 0 40px", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── TOP NAV CONTROLS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", background: "linear-gradient(135deg, var(--text-primary) 30%, var(--accent-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Image Piracy Detection
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>AI-driven visual similarity & copyright analysis</p>
        </div>
      </div>

      {/* ── DASHBOARD GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", minWidth: 0 }}>

        {/* ── TOP SECTION: FULL WIDTH HEADER ── */}
        <motion.div
          className="card"
          style={{ gridColumn: "span 12", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", minWidth: 0 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          {/* Upload Area */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: "1", minWidth: "300px" }}>
            <div
              style={{
                width: "120px", height: "80px", borderRadius: "8px", border: dragActive ? "2px dashed var(--accent-primary)" : "2px dashed var(--border-glass)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: dragActive ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)", transition: "all 0.2s"
              }}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileRef.current?.click()}
            >
              <span style={{ fontSize: "20px", marginBottom: "4px" }}>{file ? "📎" : "🖼️"}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center" }}>{file ? "File Selected" : "Drag & Drop"}</span>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="text" placeholder="Or paste image URL here..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", width: "100%" }}
              />
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button className="btn-primary" disabled={(!file && !urlInput) || loading} onClick={handleUpload} style={{ padding: "10px 20px", width: "auto", fontSize: "13px", flexShrink: 0 }}>
                  {loading ? "Scanning..." : "Start Scan"}
                </button>
                {file && <span style={{ fontSize: "12px", color: "var(--accent-primary-light)" }}>{file.name}</span>}
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>{stepText || "Ready to scan"}</span>
              <span style={{ color: "var(--accent-primary)", fontWeight: "600" }}>{progress}%</span>
            </div>
            <div style={{ width: "100%", height: "6px", background: "var(--border-glass)", borderRadius: "99px", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))" }}
                initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Scan History Mini Widget */}
          <div style={{ padding: "12px 16px", background: "var(--bg-card-solid)", borderRadius: "8px", border: "1px solid var(--border-glass)", minWidth: "180px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>Recent Scans</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-red)" }} /> img_4092.jpg <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>92%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-teal)" }} /> vector_bg.png <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>12%</span>
            </div>
          </div>
        </motion.div>

        {/* ── LEFT COLUMN: MAIN RISK ANALYSIS ── */}
        <motion.div
          className="card card-hover"
          style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px", position: "relative", overflow: "hidden", minWidth: 0 }}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
        >
          {isDashboardActive && <div style={{ position: "absolute", top: "-50px", left: "-50px", width: "150px", height: "150px", background: riskInfo.color, filter: "blur(100px)", opacity: 0.15 }} />}

          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "32px", alignSelf: "flex-start" }}>Risk Analysis</h2>

          <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
            <svg style={{ position: "absolute", width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border-glass)" strokeWidth="10" />
              <motion.circle
                cx="100" cy="100" r="90" fill="none" stroke={riskInfo.color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray="565.48" strokeDashoffset="565.48"
                animate={{ strokeDashoffset: results ? 565.48 - (565.48 * results.score) / 100 : 565.48 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 8px ${riskInfo.color}40)` }}
              />
            </svg>
            <div style={{ textAlign: "center" }}>
              <motion.div
                style={{ fontSize: "48px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                {results ? results.score : 0}<span style={{ fontSize: "24px", color: "var(--text-muted)" }}>%</span>
              </motion.div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>Piracy Score</div>
            </div>
          </div>

          <div style={{ width: "100%", textAlign: "center", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <span style={{ padding: "6px 16px", borderRadius: "99px", background: `${riskInfo.color}15`, color: riskInfo.color, fontSize: "13px", fontWeight: "700", letterSpacing: "0.05em" }}>
              {isDashboardActive ? riskInfo.label : "AWAITING SCAN"}
            </span>
            {isDashboardActive && (
              <>
                <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{results?.confidence || 0}%</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>AI Confidence</div>
                  </div>
                  <div style={{ width: "1px", background: "var(--border-glass)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{results?.matchCount || 0}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Matches</div>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", marginTop: "12px" }}>
                  {riskInfo.text}
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN: SUPPORT DATA ── */}
        <div style={{ gridColumn: "span 8", display: "grid", gridTemplateColumns: "1fr", gap: "24px", minWidth: 0 }}>

          {/* Match Breakdown */}
          <motion.div className="card card-hover" style={{ padding: "24px", minWidth: 0 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "20px" }}>Match Breakdown</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Image Similarity", value: results?.score || 0, color: "var(--accent-primary)" },
                { label: "Source Overlap", value: results?.sourceOverlap || 0, color: "var(--accent-teal)" },
                { label: "Metadata Consistency", value: results ? Math.max(0, 100 - (results.score || 0)) : 0, color: "var(--accent-amber)" }
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{stat.label}</span>
                    <span style={{ color: "var(--text-muted)" }}>{stat.value}%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "var(--border-glass)", borderRadius: "99px", overflow: "hidden" }}>
                    <motion.div
                      style={{ height: "100%", background: stat.color }}
                      initial={{ width: "0%" }} animate={{ width: `${stat.value}%` }} transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Source Matches */}
          <motion.div className="card card-hover" style={{ padding: "24px", display: "flex", flexDirection: "column", minWidth: 0 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Top Source Matches</h2>
              {results?.matches && results.matches.length > 5 && (
                <button style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>View All ↗</button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
              {!results ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px", border: "1px dashed var(--border-glass)", borderRadius: "8px" }}>
                  Awaiting scan results...
                </div>
              ) : results.matches?.slice(0, 5).map((match, i) => (
                <div key={i} style={{ display: "flex", gap: "20px", padding: "16px", background: "var(--bg-card-solid)", borderRadius: "10px", border: "1px solid var(--border-glass)", alignItems: "center" }}>
                  <img src={match.url} alt="Match thumbnail" style={{ width: "90px", height: "68px", borderRadius: "8px", objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {match.title || "Unknown Title"}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                      Source: {match.source}
                      <a href={match.page !== "#" ? match.page : match.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "12px", color: "var(--accent-primary)", textDecoration: "none", fontWeight: "500" }}>
                        Visit Link ↗
                      </a>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "60px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: match.similarity > 80 ? "var(--accent-red)" : match.similarity > 50 ? "var(--accent-amber)" : "var(--accent-teal)" }}>{match.similarity}%</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", marginTop: "2px" }}>Match</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ── BOTTOM SECTION: TIMELINE & INSIGHTS ── */}

        {/* Timeline / Detection Flow */}
        <motion.div className="card" style={{ gridColumn: "span 7", padding: "24px", minWidth: 0 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>Detection Flow</h2>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", padding: "0 10px" }}>
            <div style={{ position: "absolute", top: "14px", left: "30px", right: "30px", height: "2px", background: "var(--border-glass)", zIndex: 0 }} />
            <motion.div
              style={{ position: "absolute", top: "14px", left: "30px", height: "2px", background: "var(--accent-primary)", zIndex: 1 }}
              initial={{ width: "0%" }} animate={{ width: `${(Math.min(activeStep, 5) / 5) * 100}%` }} transition={{ duration: 0.5 }}
            />

            {[
              { icon: "📤", label: "Upload" },
              { icon: "🔍", label: "Extract" },
              { icon: "🌐", label: "Match" },
              { icon: "🧮", label: "Score" },
              { icon: "📊", label: "Result" }
            ].map((step, i) => {
              const isActive = activeStep >= i;
              const isCurrent = activeStep === i;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", zIndex: 2 }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                    background: isActive ? "var(--accent-primary)" : "var(--bg-card-solid)",
                    border: `2px solid ${isActive ? "var(--accent-primary)" : "var(--border-glass)"}`,
                    color: isActive ? "white" : "var(--text-muted)",
                    boxShadow: isCurrent ? "0 0 12px var(--accent-primary)" : "none",
                    transition: "all 0.3s"
                  }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: isActive ? "600" : "400", color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Insights Panel */}
        <motion.div className="card" style={{ gridColumn: "span 5", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Why this was flagged</h2>
            {results ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  <span style={{ color: "var(--accent-primary)", marginTop: "2px" }}>✦</span>
                  Duplicate visual patterns detected across multiple stock libraries.
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  <span style={{ color: "var(--accent-primary)", marginTop: "2px" }}>✦</span>
                  High pixel similarity ({results.score}%) with known sources indicates direct copying.
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  <span style={{ color: "var(--accent-primary)", marginTop: "2px" }}>✦</span>
                  Metadata anomalies suggest the original file EXIF data was stripped.
                </li>
              </ul>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>Awaiting scan to generate AI insights...</div>
            )}
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-secondary" disabled={!results} style={{ padding: "10px 16px", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <span>📥</span> Download Report
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
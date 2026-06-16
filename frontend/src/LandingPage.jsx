import { useState } from "react";
import { motion } from "framer-motion";
import AuthModal from "./AuthModal";

const ease = [0.22, 1, 0.36, 1];

const cardAnim = (i = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay: i * 0.1, ease },
});

export default function LandingPage() {
  const [modal, setModal] = useState(null); // null | "login" | "signup"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-wrapper">
      <AuthModal isOpen={!!modal} onClose={() => setModal(null)} initialTab={modal === "signup" ? "signup" : "login"} />

      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-container landing-nav-inner">
          {/* Logo */}
          <a href="/" className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="landing-logo-text">Krypton<span>AI</span></span>
          </a>

          {/* Desktop nav */}
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#stats" className="landing-nav-link">Why Us</a>
          </nav>

          <div className="landing-nav-actions">
            <button className="landing-btn-ghost" onClick={() => setModal("login")}>Customer Login</button>
            <button className="landing-btn-dark" onClick={() => setModal("signup")}>Sign up free</button>
          </div>

          {/* Mobile hamburger */}
          <button className="landing-hamburger" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
            {mobileMenuOpen
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div className="landing-mobile-menu"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <a href="#features" className="landing-mobile-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="landing-mobile-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#stats" className="landing-mobile-link" onClick={() => setMobileMenuOpen(false)}>Why Us</a>
            <button className="landing-mobile-link" onClick={() => { setModal("login"); setMobileMenuOpen(false); }}>Customer Login</button>
            <button className="landing-btn-dark landing-mobile-cta" onClick={() => { setModal("signup"); setMobileMenuOpen(false); }}>Sign up free</button>
          </motion.div>
        )}
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <motion.p className="landing-hero-eyebrow" {...cardAnim(0)}>
            AI-Powered Video Piracy Detection
          </motion.p>
          <motion.h1 className="landing-hero-heading" {...cardAnim(1)}>
            Protect your content from
            <span className="landing-hero-gradient-word">
              <span className="landing-gradient-blur" />
              <span className="landing-gradient-text"> piracy</span>
            </span>
          </motion.h1>
          <motion.p className="landing-hero-sub" {...cardAnim(2)}>
            Krypton uses deep fingerprinting, perceptual hashing, and AI embeddings to detect pirated video content across the internet — in seconds.
          </motion.p>
          <motion.div className="landing-hero-ctas" {...cardAnim(3)}>
            <button className="landing-btn-dark landing-btn-lg" onClick={() => setModal("signup")}>
              Get started free
            </button>
            <a href="#how-it-works" className="landing-btn-outline landing-btn-lg">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.18 13.43C6.86 14.39 5 13.45 5 11.81V5.44C5 3.8 6.86 2.86 8.18 3.82l4.36 3.19c1.09.8 1.09 2.43 0 3.23L8.18 13.43z" strokeMiterlimit="10"/>
              </svg>
              See how it works
            </a>
          </motion.div>
          <motion.p className="landing-hero-note" {...cardAnim(4)}>
            Free trial · No credit card required
          </motion.p>
        </div>

        {/* Hero visual */}
        <motion.div className="landing-hero-visual-wrap"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease }}>
          <div className="landing-hero-visual">
            <div className="landing-hero-bg-fill" />
            <div className="landing-dashboard-preview">
              <div className="ldp-header">
                <div className="ldp-dots">
                  <span /><span /><span />
                </div>
                <div className="ldp-title">Krypton — Live Dashboard</div>
                <div className="ldp-status"><span className="ldp-dot" />Scanning</div>
              </div>
              <div className="ldp-body">
                <div className="ldp-ring-area">
                  <svg viewBox="0 0 110 110" width="110" height="110">
                    <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(99,102,241,0.10)" strokeWidth="8"/>
                    <circle cx="55" cy="55" r="44" fill="none" stroke="url(#grd)" strokeWidth="8"
                      strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset="80"
                      transform="rotate(-90 55 55)"/>
                    <defs>
                      <linearGradient id="grd" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1"/>
                        <stop offset="100%" stopColor="#8b5cf6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="ldp-ring-label">
                    <span className="ldp-pct">71%</span>
                    <span className="ldp-risk">HIGH RISK</span>
                  </div>
                </div>
                <div className="ldp-bars">
                  {[
                    { label: "pHash Match", val: 82, color: "#6366f1" },
                    { label: "Vector Score", val: 71, color: "#14b8a6" },
                    { label: "Confidence",  val: 71, color: "#f59e0b" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="ldp-bar-row">
                      <div className="ldp-bar-label">{label}</div>
                      <div className="ldp-bar-track">
                        <div className="ldp-bar-fill" style={{ width: `${val}%`, background: color }} />
                      </div>
                      <div className="ldp-bar-val" style={{ color }}>{val}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ldp-footer">
                <div className="ldp-badge ldp-badge-red">⚠ Pirated Content Detected</div>
                <div className="ldp-badge ldp-badge-gray">Job #a3f7c1d2</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section id="stats" className="landing-section landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {[
              { value: "99.3%", label: "Detection Accuracy" },
              { value: "< 30s", label: "Average Scan Time" },
              { value: "2M+",   label: "Videos in Registry" },
              { value: "150+",  label: "Platforms Monitored" },
            ].map(({ value, label }, i) => (
              <motion.div key={label} className="landing-stat-card" {...cardAnim(i * 0.5)}>
                <div className="landing-stat-value">{value}</div>
                <div className="landing-stat-label">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <motion.div className="landing-section-header" {...cardAnim(0)}>
            <p className="landing-section-eyebrow">Capabilities</p>
            <h2 className="landing-section-heading">Everything you need to fight piracy</h2>
            <p className="landing-section-sub">Three cutting-edge detection technologies working together.</p>
          </motion.div>

          <div className="landing-features-grid">
            {[
              {
                icon: "🎞️",
                title: "Perceptual Hashing",
                desc: "Frame-level pHash comparison catches even re-encoded, cropped, or watermarked copies with sub-millisecond speed.",
                accent: "#6366f1",
              },
              {
                icon: "🧠",
                title: "AI Vector Embeddings",
                desc: "Deep neural embeddings capture semantic video similarity — resistant to color grading, speed changes, and partial clips.",
                accent: "#14b8a6",
              },
              {
                icon: "⚡",
                title: "Real-time Scanning",
                desc: "Submit a URL or upload a file and get a full piracy report in under 30 seconds, powered by a distributed worker queue.",
                accent: "#f59e0b",
              },
            ].map(({ icon, title, desc, accent }, i) => (
              <motion.div key={title} className="landing-feature-card" {...cardAnim(i * 0.15)}>
                <div className="landing-feature-icon" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-desc">{desc}</p>
                <div className="landing-feature-bar" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="landing-section landing-how-section">
        <div className="landing-container">
          <motion.div className="landing-section-header" {...cardAnim(0)}>
            <p className="landing-section-eyebrow">Process</p>
            <h2 className="landing-section-heading">Three steps to protection</h2>
          </motion.div>

          <div className="landing-steps-grid">
            {[
              { step: "01", title: "Submit Content", desc: "Paste a video URL or upload a file. Supports MP4, AVI, MKV, MOV up to 2 GB." },
              { step: "02", title: "AI Analysis",    desc: "Our engine extracts frames, generates embeddings, and compares against 2M+ registered videos." },
              { step: "03", title: "Get Your Report", desc: "Receive a detailed piracy report with confidence score, matched content ID, and signal breakdown." },
            ].map(({ step, title, desc }, i) => (
              <motion.div key={step} className="landing-step-card" {...cardAnim(i * 0.15)}>
                <div className="landing-step-number">{step}</div>
                <h3 className="landing-step-title">{title}</h3>
                <p className="landing-step-desc">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="landing-cta-banner">
        <div className="landing-container landing-cta-inner">
          <motion.h2 className="landing-cta-heading" {...cardAnim(0)}>
            Ready to protect your content?
          </motion.h2>
          <motion.p className="landing-cta-sub" {...cardAnim(1)}>
            Join thousands of creators and studios using Krypton.
          </motion.p>
          <motion.div className="landing-cta-actions" {...cardAnim(2)}>
            <button className="landing-btn-dark landing-btn-lg" onClick={() => setModal("signup")}>
              Start for free
            </button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={() => setModal("login")}>
              Sign in
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="landing-logo-text landing-logo-sm">Krypton<span>AI</span></span>
            </div>
            <p className="landing-footer-tagline">AI-powered content protection for the modern web.</p>
          </div>
          <div className="landing-footer-links">
            <span className="landing-footer-copy">© 2026 Krypton Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

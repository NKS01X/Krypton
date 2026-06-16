import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";

const ease = [0.22, 1, 0.36, 1];

export default function AuthModal({ isOpen, onClose, initialTab = "login" }) {
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { login, register, loading } = useAuth();

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { if (isOpen) { setError(""); setSuccess(""); setForm({ username: "", email: "", password: "" }); } }, [isOpen, tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (tab === "signup") {
      const result = await register(form.username, form.email, form.password);
      if (!result.ok) { setError(result.error); return; }
      setSuccess("Account created! Please log in.");
      setTimeout(() => setTab("login"), 1200);
    } else {
      const result = await login(form.email, form.password);
      if (!result.ok) { setError(result.error); return; }
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="auth-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          >

          {/* Modal — stop click propagating to backdrop */}
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.28, ease }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="auth-modal-header">
              <div className="auth-modal-logo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 className="auth-modal-title">
                {tab === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="auth-modal-subtitle">
                {tab === "login"
                  ? "Sign in to access the piracy detection dashboard"
                  : "Join Krypton to protect your content"}
              </p>
              <button className="auth-modal-close" onClick={onClose} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${tab === "login" ? "active" : ""}`}
                onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
              >Login</button>
              <button
                className={`auth-tab ${tab === "signup" ? "active" : ""}`}
                onClick={() => { setTab("signup"); setError(""); setSuccess(""); }}
              >Sign Up</button>
            </div>

            {/* Form */}
            <form className="auth-form" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {tab === "signup" && (
                  <motion.div key="username-field"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="auth-field">
                      <label className="auth-label">Username</label>
                      <input
                        className="auth-input"
                        type="text"
                        placeholder="johndoe"
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder={tab === "signup" ? "At least 8 characters" : "Enter your password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={tab === "signup" ? 8 : undefined}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div className="auth-error"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div className="auth-success"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    ✓ {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  tab === "login" ? "Sign In →" : "Create Account →"
                )}
              </button>
            </form>

            <p className="auth-switch">
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button className="auth-switch-link" onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}>
                {tab === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

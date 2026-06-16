import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const API_BASE = "/api/v1/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, username, email }
  const [token, setToken] = useState(null);     // JWT access token (in-memory only)
  const [loading, setLoading] = useState(false);
  const refreshTimerRef = useRef(null);

  // ── Schedule a refresh 60s before the access token expires (14 min)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Access token TTL = 15 min → refresh at 14 min
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/refresh`, {
          method: "POST",
          credentials: "include", // sends the httpOnly refresh cookie
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
          scheduleRefresh();
        } else {
          // Refresh failed — log the user out silently
          setUser(null);
          setToken(null);
        }
      } catch {
        setUser(null);
        setToken(null);
      }
    }, 14 * 60 * 1000);
  }, []);

  // ── Login
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server returned invalid response (Status ${res.status})`);
        }
      }

      if (!res.ok) throw new Error(data.error || `Login failed (Status ${res.status})`);
      setToken(data.access_token);
      setUser(data.user);
      scheduleRefresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [scheduleRefresh]);

  // ── Register
  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server returned invalid response (Status ${res.status})`);
        }
      }

      if (!res.ok) throw new Error(data.error || `Registration failed (Status ${res.status})`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Logout
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore */ }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setToken(null);
    setUser(null);
  }, []);

  // ── Auto-restore session on page load via refresh cookie
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
          // Decode user from JWT payload (base64 middle segment)
          const payload = JSON.parse(atob(data.access_token.split(".")[1]));
          setUser({
            id: payload.user_id,
            username: payload.username,
            email: payload.email,
          });
          scheduleRefresh();
        }
      } catch { /* no stored session */ }
    })();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [scheduleRefresh]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

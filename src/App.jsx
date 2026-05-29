import { useState, useEffect } from "react";

const API_BASE = "/api";

const api = {
  async request(path, opts = {}) {
    const token = localStorage.getItem("token");
    const res = await fetch(API_BASE + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });

    // Handle auth errors
    if (res.status === 401) {
      // Token expired or invalid — clear and reload
      localStorage.removeItem("token");
      window.sessionExpired = true;
      window.location.reload();
      return;
    }
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      // For /auth/me specifically, throw so tryAuth can handle retries
      // For other endpoints, throw permission error
      throw new Error(data.error || "403");
    }

    // 204 No Content (e.g. DELETE) has no body — return empty object
    if (res.status === 204 || res.headers.get("content-length") === "0") return {};

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  get: (path) => api.request(path),
  post: (path, body) => api.request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => api.request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => api.request(path, { method: "DELETE" }),
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" },
  topbar: { background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 2rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontWeight: 600, fontSize: 16, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 8 },
  badge: (color) => ({ background: `var(--color-background-${color})`, color: `var(--color-text-${color})`, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }),
  btn: (variant = "default") => ({
    padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all .15s",
    background: variant === "primary" ? "var(--color-text-primary)" : "transparent",
    color: variant === "primary" ? "var(--color-background-primary)" : "var(--color-text-primary)",
    borderColor: variant === "primary" ? "transparent" : "var(--color-border-secondary)",
  }),
  btnSm: (variant = "default") => ({ ...S.btn(variant), padding: "4px 12px", fontSize: 12 }),
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.25rem" },
  input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" },
  layout: { display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 56px)" },
  sidebar: { background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", padding: "1rem 0" },
  main: { padding: "2rem" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "8px 1.25rem", cursor: "pointer", fontSize: 14, borderRadius: 0, color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: active ? "var(--color-background-secondary)" : "transparent", fontWeight: active ? 500 : 400, transition: "all .1s" }),
};

// ─── Country codes + phone validation ─────────────────────────────────────────
const COUNTRY_CODES = [
  // Africa (top — most relevant for platform)
  { flag:"🇬🇭", code:"GH", dial:"+233", len:9,  hint:"9 digits e.g. 244000001" },
  { flag:"🇳🇬", code:"NG", dial:"+234", len:10, hint:"10 digits e.g. 8012345678" },
  { flag:"🇰🇪", code:"KE", dial:"+254", len:9,  hint:"9 digits e.g. 712345678" },
  { flag:"🇺🇬", code:"UG", dial:"+256", len:9,  hint:"9 digits e.g. 712345678" },
  { flag:"🇹🇿", code:"TZ", dial:"+255", len:9,  hint:"9 digits e.g. 712345678" },
  { flag:"🇿🇦", code:"ZA", dial:"+27",  len:9,  hint:"9 digits e.g. 821234567" },
  { flag:"🇪🇹", code:"ET", dial:"+251", len:9,  hint:"9 digits e.g. 911234567" },
  { flag:"🇨🇮", code:"CI", dial:"+225", len:10, hint:"10 digits" },
  { flag:"🇸🇳", code:"SN", dial:"+221", len:9,  hint:"9 digits" },
  { flag:"🇨🇲", code:"CM", dial:"+237", len:9,  hint:"9 digits" },
  { flag:"🇿🇲", code:"ZM", dial:"+260", len:9,  hint:"9 digits" },
  { flag:"🇿🇼", code:"ZW", dial:"+263", len:9,  hint:"9 digits" },
  { flag:"🇲🇿", code:"MZ", dial:"+258", len:9,  hint:"9 digits" },
  { flag:"🇷🇼", code:"RW", dial:"+250", len:9,  hint:"9 digits" },
  { flag:"🇬🇳", code:"GN", dial:"+224", len:9,  hint:"9 digits" },
  { flag:"🇧🇫", code:"BF", dial:"+226", len:8,  hint:"8 digits" },
  { flag:"🇲🇱", code:"ML", dial:"+223", len:8,  hint:"8 digits" },
  { flag:"🇧🇯", code:"BJ", dial:"+229", len:8,  hint:"8 digits" },
  { flag:"🇹🇬", code:"TG", dial:"+228", len:8,  hint:"8 digits" },
  { flag:"🇳🇪", code:"NE", dial:"+227", len:8,  hint:"8 digits" },
  { flag:"🇸🇱", code:"SL", dial:"+232", len:8,  hint:"8 digits" },
  { flag:"🇱🇷", code:"LR", dial:"+231", len:7,  hint:"7 digits" },
  { flag:"🇬🇲", code:"GM", dial:"+220", len:7,  hint:"7 digits" },
  { flag:"🇬🇼", code:"GW", dial:"+245", len:7,  hint:"7 digits" },
  { flag:"🇲🇦", code:"MA", dial:"+212", len:9,  hint:"9 digits" },
  { flag:"🇩🇿", code:"DZ", dial:"+213", len:9,  hint:"9 digits" },
  { flag:"🇹🇳", code:"TN", dial:"+216", len:8,  hint:"8 digits" },
  { flag:"🇱🇾", code:"LY", dial:"+218", len:9,  hint:"9 digits" },
  { flag:"🇪🇬", code:"EG", dial:"+20",  len:10, hint:"10 digits" },
  { flag:"🇸🇩", code:"SD", dial:"+249", len:9,  hint:"9 digits" },
  { flag:"🇸🇸", code:"SS", dial:"+211", len:9,  hint:"9 digits" },
  { flag:"🇨🇩", code:"CD", dial:"+243", len:9,  hint:"9 digits" },
  { flag:"🇦🇴", code:"AO", dial:"+244", len:9,  hint:"9 digits" },
  { flag:"🇳🇦", code:"NA", dial:"+264", len:9,  hint:"9 digits" },
  { flag:"🇧🇼", code:"BW", dial:"+267", len:8,  hint:"8 digits" },
  { flag:"🇸🇿", code:"SZ", dial:"+268", len:8,  hint:"8 digits" },
  { flag:"🇱🇸", code:"LS", dial:"+266", len:8,  hint:"8 digits" },
  { flag:"🇲🇬", code:"MG", dial:"+261", len:9,  hint:"9 digits" },
  { flag:"🇲🇺", code:"MU", dial:"+230", len:8,  hint:"8 digits" },
  { flag:"🇸🇨", code:"SC", dial:"+248", len:7,  hint:"7 digits" },
  { flag:"🇨🇻", code:"CV", dial:"+238", len:7,  hint:"7 digits" },
  { flag:"🇸🇹", code:"ST", dial:"+239", len:7,  hint:"7 digits" },
  { flag:"🇨🇫", code:"CF", dial:"+236", len:8,  hint:"8 digits" },
  { flag:"🇬🇦", code:"GA", dial:"+241", len:7,  hint:"7 digits" },
  { flag:"🇨🇬", code:"CG", dial:"+242", len:9,  hint:"9 digits" },
  { flag:"🇬🇶", code:"GQ", dial:"+240", len:9,  hint:"9 digits" },
  { flag:"🇩🇯", code:"DJ", dial:"+253", len:8,  hint:"8 digits" },
  { flag:"🇸🇴", code:"SO", dial:"+252", len:8,  hint:"8 digits" },
  { flag:"🇪🇷", code:"ER", dial:"+291", len:7,  hint:"7 digits" },
  { flag:"🇨🇲", code:"TD", dial:"+235", len:8,  hint:"8 digits" },
  // Rest of world
  { flag:"🇬🇧", code:"GB", dial:"+44",  len:10, hint:"10 digits e.g. 7911123456" },
  { flag:"🇺🇸", code:"US", dial:"+1",   len:10, hint:"10 digits e.g. 2025551234" },
  { flag:"🇨🇦", code:"CA", dial:"+1",   len:10, hint:"10 digits" },
  { flag:"🇫🇷", code:"FR", dial:"+33",  len:9,  hint:"9 digits" },
  { flag:"🇩🇪", code:"DE", dial:"+49",  len:10, hint:"10 digits" },
  { flag:"🇮🇹", code:"IT", dial:"+39",  len:10, hint:"10 digits" },
  { flag:"🇪🇸", code:"ES", dial:"+34",  len:9,  hint:"9 digits" },
  { flag:"🇵🇹", code:"PT", dial:"+351", len:9,  hint:"9 digits" },
  { flag:"🇳🇱", code:"NL", dial:"+31",  len:9,  hint:"9 digits" },
  { flag:"🇧🇪", code:"BE", dial:"+32",  len:9,  hint:"9 digits" },
  { flag:"🇨🇭", code:"CH", dial:"+41",  len:9,  hint:"9 digits" },
  { flag:"🇦🇺", code:"AU", dial:"+61",  len:9,  hint:"9 digits" },
  { flag:"🇳🇿", code:"NZ", dial:"+64",  len:9,  hint:"9 digits" },
  { flag:"🇮🇳", code:"IN", dial:"+91",  len:10, hint:"10 digits" },
  { flag:"🇨🇳", code:"CN", dial:"+86",  len:11, hint:"11 digits" },
  { flag:"🇯🇵", code:"JP", dial:"+81",  len:10, hint:"10 digits" },
  { flag:"🇧🇷", code:"BR", dial:"+55",  len:11, hint:"11 digits" },
  { flag:"🇲🇽", code:"MX", dial:"+52",  len:10, hint:"10 digits" },
  { flag:"🇦🇪", code:"AE", dial:"+971", len:9,  hint:"9 digits" },
  { flag:"🇸🇦", code:"SA", dial:"+966", len:9,  hint:"9 digits" },
];

function isValidPhone(local, code) {
  if (!local) return false;
  const stripped = local.replace(/^0+/, "");
  const rule = COUNTRY_CODES.find(c => c.dial === code);
  if (!rule) return stripped.length >= 7 && stripped.length <= 12;
  return stripped.length === rule.len;
}

function getPhoneHint(code) {
  const rule = COUNTRY_CODES.find(c => c.dial === code);
  return rule ? rule.hint : "Enter a valid phone number";
}

function buildFullPhone(local, code) {
  return code + local.replace(/^0+/, "");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const sessionExpired = window.sessionExpired === true;
  // Clear the flag so it only shows once
  if (sessionExpired) window.sessionExpired = false;
  const [step, setStep] = useState("credentials");
  const [loginMethod, setLoginMethod] = useState("email");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", companyName: "", phone: "", countryCode: "+233", phoneLocal: "" });
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "register") {
        if (!form.phoneLocal) { setError("Phone number is required"); setLoading(false); return; }
        if (!isValidPhone(form.phoneLocal, form.countryCode)) { setError(getPhoneHint(form.countryCode)); setLoading(false); return; }
        const payload = { ...form, phone: buildFullPhone(form.phoneLocal, form.countryCode) };
        const res = await api.post("/auth/register", payload);
        if (res.error && res.error.toLowerCase().includes("already")) {
          setError("This email is already registered. Please sign in instead.");
          setMode("login");
        } else if (!res.token) {
          setSuccess("Account created! Please check your email (" + payload.email + ") and click the verification link to activate your account.");
          setMode("login");
        } else {
          localStorage.setItem("token", res.token);
          onLogin(res.user);
        }
      } else {
        const identifier = loginMethod === "phone" ? buildFullPhone(form.phoneLocal, form.countryCode) : form.email;
        const res = await fetch("/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier, password: form.password })
        });
        const data = await res.json();
        if (!res.ok) setError(data.error || "Login failed");
        else if (data.otpRequired) { setSuccess(data.message); setStep("otp"); }
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function submitOtp() {
    setLoading(true); setError("");
    try {
      const identifier = loginMethod === "phone" ? buildFullPhone(form.phoneLocal, form.countryCode) : form.email;
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, code: otp })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid code"); if (!data.error?.includes("Resend")) setOtp(""); }
      else { localStorage.setItem("token", data.token); onLogin(data.user); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function resendOtp() {
    setLoading(true); setError(""); setSuccess(""); setOtp("");
    try {
      const identifier = loginMethod === "phone" ? buildFullPhone(form.phoneLocal, form.countryCode) : form.email;
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password: form.password })
      });
      const data = await res.json();
      if (res.ok && data.otpRequired) setSuccess("New code sent! Check your email.");
      else setError(data.error || "Failed to resend");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function resendVerification() {
    setLoading(true); setError("");
    try {
      await api.post("/auth/resend-verification", { email: form.email });
      setSuccess("Verification email resent! Please check your inbox.");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", fontSize: 14,
    outline: "none", boxSizing: "border-box",
    transition: "border-color .15s"
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)",
    letterSpacing: "0.8px", textTransform: "uppercase", display: "block", marginBottom: 6
  };

  // ── OTP screen ─────────────────────────────────────────────────────────────
  if (step === "otp") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ width: 380, maxWidth: "90vw", background: "var(--color-background-primary)", borderRadius: 16, padding: "40px 36px", border: "1px solid var(--color-border-tertiary)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <i className="ti ti-mail" style={{ fontSize: 20, color: "#00e87a" }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Check your email</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px", lineHeight: 1.6 }}>
          {loginMethod === "phone"
            ? <>Logged in with your phone number. The code was sent to your email:</>
            : <>We sent a 6-digit code to</>}
          <br/>
          <strong style={{ color: "var(--color-text-primary)" }}>{otpEmail || form.email || "your email"}</strong>
          {loginMethod === "phone" && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 6, display: "block" }}>
              SMS delivery coming soon
            </span>
          )}
        </p>

        {success && <div style={{ background: "#f0fdf4", color: "#166534", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>✓ {success}</div>}
        {error && <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <label style={labelStyle}>Verification code</label>
        <input style={{ ...inputStyle, fontSize: 30, letterSpacing: 14, textAlign: "center", padding: "14px", fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}
          maxLength={6} placeholder="000000" value={otp}
          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={e => e.key === "Enter" && otp.length === 6 && submitOtp()}
          autoFocus />
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>Expires in 10 minutes · Max 3 attempts</p>

        <button onClick={submitOtp} disabled={loading || otp.length !== 6} style={{
          width: "100%", padding: "12px", borderRadius: 8, border: "none", cursor: "pointer",
          background: otp.length === 6 ? "#0a0a0a" : "var(--color-background-secondary)",
          color: otp.length === 6 ? "#fff" : "var(--color-text-secondary)",
          fontSize: 14, fontWeight: 600, transition: "all .2s"
        }}>
          {loading ? "Verifying…" : "Verify & sign in"}
        </button>

        {error && error.includes("Resend") && (
          <div style={{ marginTop: 12, padding: "12px", background: "#fef9c3", borderRadius: 8, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#854d0e", fontWeight: 600 }}>🔒 Locked after 3 wrong attempts</p>
            <button style={{ background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 13, cursor: "pointer" }} onClick={resendOtp}>Get a new code</button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500 }} onClick={resendOtp}>Resend code</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
            onClick={() => { setStep("credentials"); setOtp(""); setError(""); setSuccess(""); }}>← Back</span>
        </div>
      </div>
    </div>
  );

  // ── Main login/register layout ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div style={{
        width: 420, flexShrink: 0, background: "#0d0d0d",
        display: "flex", flexDirection: "column", padding: "40px 44px",
        position: "relative", overflow: "hidden"
      }}>
        {/* dot grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "28px 28px" }} />
        {/* green glow */}
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(0,232,122,0.18) 0%, transparent 65%)" }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#00e87a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-antenna" style={{ fontSize: 17, color: "#000" }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>USSD Platform</span>
          </div>
          <p style={{ color: "#5a5a5a", fontSize: 12, margin: 0 }}>Built for African businesses</p>
        </div>

        {/* Hero copy — vertically centred */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 40 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-1.2px", margin: "0 0 14px" }}>
            Launch USSD apps<br />
            <span style={{ color: "#00e87a" }}>without code.</span>
          </h1>
          <p style={{ color: "#777", fontSize: 14, lineHeight: 1.7, margin: "0 0 36px", maxWidth: 300 }}>
            Build, deploy and manage USSD applications visually. Connect to every major Ghana network from one dashboard.
          </p>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "ti-layout-list", text: "Visual drag-and-drop menu builder" },
              { icon: "ti-chart-bar",   text: "Real-time session analytics" },
              { icon: "ti-users",       text: "Team roles & permissions" },
              { icon: "ti-currency",    text: "GHS billing & flexible plans" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,232,122,0.1)",
                  border: "1px solid rgba(0,232,122,0.18)", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 15, color: "#00e87a" }} />
                </div>
                <span style={{ fontSize: 14, color: "#bbb", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: "relative", zIndex: 1, marginTop: 40 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {["MTN", "Telecel", "AirtelTigo", "Africa's Talking", "Hubtel", "Nalo"].map(n => (
              <span key={n} style={{ fontSize: 10, color: "#444", fontWeight: 600, letterSpacing: "0.3px" }}>{n}</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#3a3a3a", margin: 0 }}>© 2026 USSD Platform · Made in Ghana 🇬🇭</p>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 40px", background: "var(--color-background-primary)", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {sessionExpired && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", color: "#854d0e", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-clock" style={{ fontSize: 15 }} />
              Your session expired. Please sign in again.
            </div>
          )}
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 28px" }}>
            {mode === "login" ? "Sign in to your USSD Platform account" : "Free forever on the Starter plan"}
          </p>

          {/* Email / Phone toggle (login only) */}
          {mode === "login" && (
            <div style={{ display: "flex", background: "var(--color-background-secondary)", borderRadius: 8, padding: 3, marginBottom: 24, gap: 3 }}>
              {["email", "phone"].map(m => (
                <button key={m} onClick={() => setLoginMethod(m)} style={{
                  flex: 1, padding: "7px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  background: loginMethod === m ? "var(--color-background-primary)" : "transparent",
                  color: loginMethod === m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  boxShadow: loginMethod === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all .15s"
                }}>
                  <i className={`ti ti-${m === "email" ? "mail" : "device-mobile"}`} style={{ fontSize: 13, marginRight: 6, verticalAlign: "-1px" }} />
                  {m === "email" ? "Email" : "Phone number"}
                </button>
              ))}
            </div>
          )}

          {/* Alerts */}
          {success && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "11px 13px", borderRadius: 8, fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
            ✓ {success}
            {success.includes("verify") && form.email && <div style={{ marginTop: 6 }}><span style={{ cursor: "pointer", textDecoration: "underline", fontWeight: 600 }} onClick={resendVerification}>Resend verification email</span></div>}
          </div>}
          {error && <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "11px 13px", borderRadius: 8, fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
            {error}
            {error.includes("verify") && <div style={{ marginTop: 6 }}><span style={{ cursor: "pointer", textDecoration: "underline", fontWeight: 600 }} onClick={resendVerification}>Resend verification email</span></div>}
          </div>}

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {mode === "register" && <>
              <div>
                <label style={labelStyle}>Full name</label>
                <input style={inputStyle} {...f("fullName")} placeholder="Kofi Mensah" />
              </div>
              <div>
                <label style={labelStyle}>Company name</label>
                <input style={inputStyle} {...f("companyName")} placeholder="Kofi Tech Ltd" />
              </div>
            </>}

            {/* Email field */}
            {(mode === "register" || loginMethod === "email") && (
              <div>
                <label style={labelStyle}>Email address</label>
                <input style={inputStyle} type="email" {...f("email")} placeholder="kofi@company.com" />
              </div>
            )}

            {/* Phone field */}
            {loginMethod === "phone" && mode === "login" && (
              <div>
                <label style={labelStyle}>Phone number</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...inputStyle, width: 100, flexShrink: 0, padding: "11px 8px" }}
                    value={form.countryCode} onChange={e => setForm(p => ({ ...p, countryCode: e.target.value }))}>
                    {COUNTRY_CODES.map(c => <option key={c.code + c.dial} value={c.dial}>{c.flag} {c.dial}</option>)}
                  </select>
                  <input style={{ ...inputStyle, flex: 1 }} type="tel" placeholder="244000001"
                    value={form.phoneLocal} onChange={e => setForm(p => ({ ...p, phoneLocal: e.target.value.replace(/[^0-9]/g, "") }))} />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ ...labelStyle, margin: 0 }}>Password</label>
                {mode === "login" && (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
                    onClick={() => window.location.href = "/forgot-password"}>Forgot password?</span>
                )}
              </div>
              <input style={inputStyle} type="password" {...f("password")}
                placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
                onKeyDown={e => e.key === "Enter" && submit()} />
            </div>

            {/* Register phone */}
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Phone number <span style={{ color: "var(--color-text-danger)" }}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...inputStyle, width: 100, flexShrink: 0, padding: "11px 8px" }}
                    value={form.countryCode} onChange={e => setForm(p => ({ ...p, countryCode: e.target.value }))}>
                    {COUNTRY_CODES.map(c => <option key={c.code + c.dial} value={c.dial}>{c.flag} {c.dial}</option>)}
                  </select>
                  <input style={{ ...inputStyle, flex: 1 }} type="tel" placeholder="244000001" maxLength={10}
                    value={form.phoneLocal} onChange={e => setForm(p => ({ ...p, phoneLocal: e.target.value.replace(/[^0-9]/g, "") }))} />
                </div>
                {form.phoneLocal && !isValidPhone(form.phoneLocal, form.countryCode) && (
                  <p style={{ fontSize: 11, color: "var(--color-text-danger)", marginTop: 4 }}>{getPhoneHint(form.countryCode)}</p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: 8, border: "none",
            background: "#0d0d0d", color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginTop: 22, opacity: loading ? 0.7 : 1, transition: "opacity .2s"
          }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
          </button>

          {/* Mode switch */}
          <p style={{ textAlign: "center", fontSize: 13, marginTop: 18, color: "var(--color-text-secondary)" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 700 }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}>
              {mode === "login" ? "Sign up free" : "Sign in"}
            </span>
          </p>

          {/* Trust badges */}
          {mode === "login" && (
            <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 24, paddingTop: 18, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
              {[
                { icon: "ti-shield-check", text: "SSL secured" },
                { icon: "ti-lock", text: "2FA login" },
                { icon: "ti-building-bank", text: "Bank-grade" },
              ].map(b => (
                <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className={`ti ${b.icon}`} style={{ fontSize: 12, color: "var(--color-text-secondary)" }} />
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Verify Email Page ────────────────────────────────────────────────────────
function VerifyEmailPage() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); setMessage("Invalid verification link — no token found."); return; }
    // Single GET call — backend handles email pre-fetch gracefully with 60s grace period
    fetch("/api/auth/verify?token=" + token)
      .then(r => r.json())
      .then(data => {
        if (data.email) {
          setStatus("success");
        } else if (data.error && (data.error.toLowerCase().includes("already") || data.error.toLowerCase().includes("log in"))) {
          setStatus("already");
        } else {
          setStatus("error"); setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong. Please try again."); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 420, maxWidth: "90vw", textAlign: "center", padding: "2.5rem" }}>

        {status === "loading" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 500, margin: "0 0 8px" }}>Verifying your email…</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Just a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 700, margin: "0 0 8px", color: "#166534", fontSize: 22 }}>You're all set!</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              Your email has been verified and your account is now active.<br />
              You can now sign in to your dashboard.
            </p>
            <button style={{ padding: "12px 32px", borderRadius: 8, border: "2px solid #0d0d0d", background: "transparent", color: "#0d0d0d", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
              onClick={() => window.location.href = "/"}>
              Go to login →
            </button>
          </>
        )}

        {status === "already" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontWeight: 700, margin: "0 0 8px", fontSize: 22 }}>Already verified!</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              Your email is already verified and your account is active.<br />
              Just sign in to get started.
            </p>
            <button style={{ padding: "12px 32px", borderRadius: 8, border: "2px solid #0d0d0d", background: "transparent", color: "#0d0d0d", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
              onClick={() => window.location.href = "/"}>
              Go to login →
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontWeight: 700, margin: "0 0 8px", color: "#991b1b", fontSize: 22 }}>Verification failed</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>{message}</p>
            <button style={{ ...S.btn("primary"), padding: "12px 32px" }}
              onClick={() => window.location.href = "/"}>
              Back to login
            </button>
          </>
        )}

      </div>
    </div>
  );
}


// ─── Team Page ────────────────────────────────────────────────────────────────
function TeamPage({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "MEMBER" });
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [m, i] = await Promise.all([api.get("/team/members"), api.get("/team/invites")]);
      setMembers(m); setInvites(i);
    } catch {}
  }

  function notify(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 4000);
  }

  async function sendInvite() {
    setLoading(true);
    try {
      const res = await api.post("/team/invite", inviteForm);
      notify(res.message || "Invitation sent!");
      setShowInvite(false);
      setInviteForm({ email: "", role: "MEMBER" });
      loadAll();
    } catch (e) { notify(e.message, "error"); }
    setLoading(false);
  }

  async function revokeInvite(id) {
    if (!confirm("Revoke this invite?")) return;
    try { await api.delete("/team/invite/" + id); loadAll(); } catch (e) { notify(e.message, "error"); }
  }

  async function removeMember(id, name) {
    if (!confirm("Remove " + name + " from the team?")) return;
    try { await api.delete("/team/members/" + id); loadAll(); notify(name + " removed"); } catch (e) { notify(e.message, "error"); }
  }

  async function changeRole(id, role) {
    try { await api.put("/team/members/" + id + "/role", { role }); loadAll(); notify("Role updated"); } catch (e) { notify(e.message, "error"); }
  }

  const canManage = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";
  const roleColor = { OWNER: "success", ADMIN: "info", MEMBER: "warning" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Team</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Manage who has access to your USSD apps
          </p>
        </div>
        {canManage && (
          <button style={S.btn("primary")} onClick={() => setShowInvite(true)}>+ Invite member</button>
        )}
      </div>

      {msg.text && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16,
          background: msg.type === "error" ? "var(--color-background-danger)" : "#f0fdf4",
          color: msg.type === "error" ? "var(--color-text-danger)" : "#166534"
        }}>{msg.type === "success" ? "✓ " : "✗ "}{msg.text}</div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div style={{ ...S.card, marginBottom: "1.5rem", border: "1px solid var(--color-border-info)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 500 }}>Invite a team member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
            <div>
              <label style={S.label}>Email address</label>
              <input style={S.input} type="email" placeholder="colleague@company.com"
                value={inviteForm.email}
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Role</label>
              <select style={S.select} value={inviteForm.role}
                onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                {currentUser?.role === "OWNER" && <option value="OWNER">Owner</option>}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12, background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
              <strong>Member</strong> — View apps, build and edit menus<br/>
              <strong>Admin</strong> — All of Member + create apps, invite people<br/>
              <strong>Owner</strong> — Full access including billing and team management
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={S.btn("primary")} onClick={sendInvite} disabled={loading || !inviteForm.email}>
              {loading ? "Sending…" : "Send invitation"}
            </button>
            <button style={S.btn()} onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>
          Members ({members.length})
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0", borderBottom: "0.5px solid var(--color-border-tertiary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--color-background-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 600, fontSize: 14
                }}>
                  {m.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>
                    {m.fullName} {m.isCurrentUser && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>(you)</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{m.email}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.badge(roleColor[m.role] || "default")}>{m.role}</span>
                {canManage && !m.isCurrentUser && m.role !== "OWNER" && (
                  <>
                    {currentUser?.role === "OWNER" && (
                      <select style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
                        value={m.role}
                        onChange={e => changeRole(m.id, e.target.value)}>
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                    <button style={{ ...S.btnSm(), color: "var(--color-text-danger)", borderColor: "transparent", fontSize: 12 }}
                      onClick={() => removeMember(m.id, m.fullName)}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div style={S.card}>
          <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>
            Pending invitations ({invites.length})
          </p>
          {invites.map(inv => (
            <div key={inv.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)"
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14 }}>{inv.email}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {inv.role} · Invited by {inv.invitedBy} · {inv.expired ? "⚠️ Expired" : "Expires " + new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {canManage && (
                  <>
                    <button style={S.btnSm()} onClick={() => {
                      setInviteForm({ email: inv.email, role: inv.role });
                      setShowInvite(true);
                    }}>Resend</button>
                    <button style={{ ...S.btnSm(), color: "var(--color-text-danger)", borderColor: "transparent" }}
                      onClick={() => revokeInvite(inv.id)}>Revoke</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Accept Invite Page ───────────────────────────────────────────────────────
function AcceptInvitePage({ onLogin }) {
  const [status, setStatus] = useState("loading"); // loading | form | success | error
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ fullName: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("Invalid invite link — no token found."); return; }
    api.get("/team/invite/validate?token=" + token)
      .then(data => { setInvite(data); setStatus("form"); })
      .catch(e => { setStatus("error"); setError(e.message); });
  }, []);

  async function accept() {
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fullName: form.fullName, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to accept invite"); }
      else {
        localStorage.setItem("token", data.token);
        setStatus("success");
        setTimeout(() => window.location.href = "/", 2000);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 440, maxWidth: "90vw" }}>
        <div style={{ ...S.logo, marginBottom: "1.5rem" }}>
          <span style={{ fontSize: 22 }}>📡</span> USSD Platform
        </div>

        {status === "loading" && <p style={{ color: "var(--color-text-secondary)" }}>Validating invite…</p>}

        {status === "error" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <h3 style={{ margin: "0 0 8px" }}>Invalid invite</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{error}</p>
            <button style={{ ...S.btn("primary"), marginTop: 16 }} onClick={() => window.location.href = "/"}>
              Go to login
            </button>
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h3 style={{ margin: "0 0 8px" }}>Welcome to the team!</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Redirecting you to the dashboard…</p>
          </div>
        )}

        {status === "form" && invite && (
          <div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500 }}>
                You've been invited to join <strong>{invite.tenantName}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
                Role: {invite.role} · Invited by {invite.invitedBy} · Signing up as {invite.email}
              </p>
            </div>

            {error && (
              <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={S.label}>Your full name</label><input style={S.input} {...f("fullName")} placeholder="John Doe" /></div>
              <div><label style={S.label}>Create a password</label><input style={S.input} type="password" {...f("password")} /></div>
              <div><label style={S.label}>Confirm password</label><input style={S.input} type="password" {...f("confirmPassword")}
                onKeyDown={e => e.key === "Enter" && accept()} /></div>
            </div>

            <button style={{ ...S.btn("primary"), width: "100%", marginTop: 20, padding: "10px 16px" }}
              onClick={accept} disabled={loading || !form.fullName || !form.password}>
              {loading ? "Setting up account…" : "Accept invitation & join team →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Billing Page ─────────────────────────────────────────────────────────────
function BillingPage({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, s, u, i] = await Promise.all([
        api.get("/billing/plans"),
        api.get("/billing/subscription"),
        api.get("/billing/usage"),
        api.get("/billing/invoices"),
      ]);
      setPlans(p); setSubscription(s); setUsage(u); setInvoices(i);
    } catch {}
    setLoading(false);
  }

  async function subscribe(planName) {
    if (!confirm("Upgrade to " + planName + " plan?")) return;
    setUpgrading(planName);
    try {
      const res = await api.post("/billing/subscribe/" + planName, {});
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else if (res.message) {
        alert(res.message);
        loadAll();
      }
    } catch (e) { alert(e.message); }
    setUpgrading(null);
  }

  if (loading) return <p style={{ color: "var(--color-text-secondary)" }}>Loading billing…</p>;

  const isOwner = currentUser?.role === "OWNER";
  const currentPlan = subscription?.planName || "FREE";
  const usagePct = usage ? Math.min(100, Math.round((usage.sessionsUsed / Math.max(1, usage.sessionsLimit)) * 100)) : 0;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 20 }}>Billing & Plans</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Manage your subscription and view usage
      </p>

      {!isOwner && (
        <div style={{ background: "#fef9c3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#854d0e", marginBottom: 20 }}>
          Only the account owner can manage billing.
        </div>
      )}

      {/* Usage card */}
      {usage && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>This month's usage</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                {usage.sessionsUsed} of {usage.sessionsLimit === -1 ? "Unlimited" : usage.sessionsLimit} sessions
              </p>
            </div>
            <span style={{ ...S.badge(usagePct >= 100 ? "red" : usagePct >= 80 ? "yellow" : "green"), fontSize: 13, padding: "4px 12px" }}>
              {usage.sessionsLimit === -1 ? "Unlimited" : usagePct + "%"}
            </span>
          </div>
          {usage.sessionsLimit !== -1 && (
            <div style={{ background: "var(--color-background-secondary)", borderRadius: 100, height: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 100, transition: "width .5s",
                width: usagePct + "%",
                background: usagePct >= 100 ? "#dc2626" : usagePct >= 80 ? "#f59e0b" : "#10b981"
              }} />
            </div>
          )}
        </div>
      )}

      {/* Plans grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {plans.map(plan => {
          const isCurrent = plan.name === currentPlan;
          return (
            <div key={plan.id} style={{
              ...S.card,
              border: isCurrent ? "2px solid var(--color-text-primary)" : "0.5px solid var(--color-border-tertiary)",
              position: "relative"
            }}>
              {isCurrent && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "var(--color-text-primary)", color: "var(--color-background-primary)",
                  fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                  Current plan
                </div>
              )}
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: 1, textTransform: "uppercase" }}>
                {plan.displayName}
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                {plan.priceGhs === 0 ? "Free" : "GHS " + plan.priceGhs}
                {plan.priceGhs > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--color-text-secondary)" }}>/mo</span>}
              </p>
              <div style={{ margin: "12px 0", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
                <div>✓ {plan.maxApps === -1 ? "Unlimited" : plan.maxApps} app{plan.maxApps !== 1 ? "s" : ""}</div>
                <div>✓ {plan.maxSessions === -1 ? "Unlimited" : plan.maxSessions.toLocaleString()} sessions/mo</div>
                {plan.extraSessionFee > 0 && <div>✓ GHS {plan.extraSessionFee}/extra session</div>}
              </div>
              {!isCurrent && isOwner && (
                <button style={{ ...S.btn(plan.priceGhs === 0 ? "default" : "primary"), width: "100%", fontSize: 13 }}
                  onClick={() => subscribe(plan.name)}
                  disabled={upgrading === plan.name}>
                  {upgrading === plan.name ? "Redirecting…" : plan.priceGhs === 0 ? "Downgrade" : "Upgrade →"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div style={S.card}>
          <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Invoice history</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice", "Amount", "Status", "Date"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}><code style={{ fontSize: 12 }}>{inv.invoiceNumber}</code></td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>GHS {Number(inv.amountGhs).toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={S.badge(inv.status === "PAID" ? "success" : inv.status === "FAILED" ? "danger" : "warning")}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────
function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/analytics/overview"), api.get("/analytics/sessions?limit=20")])
      .then(([d, s]) => { setData(d); setSessions(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--color-text-secondary)" }}>Loading analytics…</p>;
  if (!data) return <p style={{ color: "var(--color-text-secondary)" }}>No data yet.</p>;

  const maxDaily = Math.max(...(data.daily || []).map(d => d.count), 1);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 20 }}>Analytics</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Session activity and usage trends
      </p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total sessions",   value: data.totalSessions?.toLocaleString(),  color: "#6366f1" },
          { label: "This month",       value: data.monthSessions?.toLocaleString(),  color: "#0ea5e9" },
          { label: "Active now",       value: data.activeSessions?.toLocaleString(), color: "#10b981" },
          { label: "Total apps",       value: data.totalApps,                        color: "#f59e0b" },
        ].map(c => (
          <div key={c.label} style={{ ...S.card, borderTop: "3px solid " + c.color }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Sessions — last 7 days</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {(data.daily || []).map(d => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{d.count}</span>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                background: "var(--color-text-primary)",
                height: Math.max(4, (d.count / maxDaily) * 90) + "px",
                opacity: 0.8, transition: "height .3s"
              }} />
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status breakdown + per app */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={S.card}>
          <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Session outcomes</p>
          {[
            { label: "Completed", value: data.statusBreakdown?.completed, color: "#10b981" },
            { label: "Timed out", value: data.statusBreakdown?.timeout,   color: "#f59e0b" },
            { label: "Active",    value: data.statusBreakdown?.active,    color: "#6366f1" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 13 }}>{s.label}</span>
              </div>
              <strong style={{ fontSize: 13 }}>{s.value ?? 0}</strong>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Sessions per app</p>
          {(data.perApp || []).map(a => (
            <div key={a.appId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 13 }}>{a.appName}</span>
              <strong style={{ fontSize: 13 }}>{a.sessions}</strong>
            </div>
          ))}
          {(!data.perApp || data.perApp.length === 0) && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>No apps yet</p>
          )}
        </div>
      </div>

      {/* Recent sessions table */}
      <div style={S.card}>
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Recent sessions</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Phone", "App", "Status", "Duration", "Started"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace" }}>{s.msisdn}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{s.appName}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={S.badge(s.status === "COMPLETED" ? "success" : s.status === "ACTIVE" ? "info" : "warning")}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {s.duration != null ? s.duration + "s" : "—"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {new Date(s.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "20px 12px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No sessions yet. Test your USSD app to see data here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── USSD Simulator ───────────────────────────────────────────────────────────
function UssdSimulator({ appId, appName, shortCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState("SIM-" + Date.now());
  const [isNew, setIsNew] = useState(true);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = { current: null };

  async function send(val) {
    const userInput = val ?? input;
    if (ended) return;
    setLoading(true);

    if (isNew) {
      setMessages([{ type: "system", text: "Dialling " + (shortCode || "*000#") + "…" }]);
    } else {
      setMessages(m => [...m, { type: "user", text: userInput || "(empty)" }]);
    }

    try {
      const res = await api.post("/simulator/" + appId, {
        input: userInput,
        sessionId,
        isNew: isNew ? "true" : "false"
      });

      setMessages(m => [...m, { type: "ussd", text: res.message }]);
      setIsNew(false);
      setInput("");

      if (!res.shouldContinue) {
        setEnded(true);
        setMessages(m => [...m, { type: "system", text: "Session ended" }]);
      }
    } catch (e) {
      setMessages(m => [...m, { type: "error", text: "Error: " + e.message }]);
    }
    setLoading(false);
  }

  function reset() {
    setMessages([]);
    setInput("");
    setIsNew(true);
    setEnded(false);
  }

  const msgColor = { user: "var(--color-text-primary)", ussd: "#00e87a", system: "#6b7280", error: "#ef4444" };
  const msgAlign = { user: "flex-end", ussd: "flex-start", system: "center", error: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Phone screen */}
      <div style={{
        flex: 1, background: "#0a0a0a", borderRadius: "12px 12px 0 0",
        padding: "16px 12px", overflowY: "auto", minHeight: 280,
        display: "flex", flexDirection: "column", gap: 8
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", margin: "auto", color: "#555", fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
            <p>Press Dial to start</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msgAlign[m.type] }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 8, fontSize: 12,
              fontFamily: m.type === "ussd" ? "monospace" : "inherit",
              color: msgColor[m.type],
              background: m.type === "user" ? "#1a1a2e" : m.type === "ussd" ? "#001a0e" : "transparent",
              whiteSpace: "pre-wrap", lineHeight: 1.6,
              border: m.type === "ussd" ? "1px solid #00401e" : m.type === "user" ? "1px solid #1e1e3f" : "none"
            }}>
              {m.type === "user" && <span style={{ color: "#666", fontSize: 10, display: "block", marginBottom: 2 }}>You entered</span>}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: "#555", fontSize: 12, textAlign: "center" }}>Processing…</div>
        )}
      </div>

      {/* Input area */}
      <div style={{ background: "#111", borderRadius: "0 0 12px 12px", padding: 12 }}>
        {!ended ? (
          isNew ? (
            <button style={{ ...S.btn("primary"), width: "100%", background: "#00e87a", color: "#000", fontWeight: 700 }}
              onClick={() => send("")} disabled={loading}>
              📞 Dial {shortCode || "*000#"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1, background: "#1a1a1a", borderColor: "#333", color: "#fff" }}
                placeholder="Enter your reply…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                autoFocus
              />
              <button style={{ ...S.btn("primary"), background: "#00e87a", color: "#000", flexShrink: 0 }}
                onClick={() => send()} disabled={loading || !input}>
                Send
              </button>
            </div>
          )
        ) : (
          <button style={{ ...S.btn(), width: "100%", background: "#1a1a1a", color: "#fff", borderColor: "#333" }}
            onClick={reset}>
            🔄 Start new session
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user, onUpdate }) {
  const [profile, setProfile] = useState({ fullName: user?.fullName || "", phone: user?.phone || "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [loading, setLoading] = useState(false);

  function notify(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 4000);
  }

  async function saveProfile() {
    setLoading(true);
    try {
      await api.put("/auth/profile", profile);
      notify("Profile updated successfully");
      if (onUpdate) onUpdate({ ...user, ...profile });
    } catch (e) { notify(e.message, "error"); }
    setLoading(false);
  }

  async function changePassword() {
    if (passwords.newPassword !== passwords.confirmPassword) {
      notify("New passwords don't match", "error"); return;
    }
    setLoading(true);
    try {
      await api.put("/auth/change-password", passwords);
      notify("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) { notify(e.message, "error"); }
    setLoading(false);
  }

  const p = (k) => ({ value: profile[k] || "", onChange: e => setProfile(prev => ({ ...prev, [k]: e.target.value })) });
  const pw = (k) => ({ value: passwords[k], onChange: e => setPasswords(prev => ({ ...prev, [k]: e.target.value })) });

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 20 }}>Profile & Settings</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Manage your personal details and security
      </p>

      {msg.text && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16,
          background: msg.type === "error" ? "var(--color-background-danger)" : "#f0fdf4",
          color: msg.type === "error" ? "var(--color-text-danger)" : "#166534" }}>
          {msg.type === "success" ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      {/* Profile info */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Personal information</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={S.label}>Email</label>
            <input style={{ ...S.input, opacity: 0.6 }} value={user?.email || ""} disabled />
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Email cannot be changed</p>
          </div>
          <div>
            <label style={S.label}>Full name</label>
            <input style={S.input} {...p("fullName")} />
          </div>
          <div>
            <label style={S.label}>Phone number</label>
            <input style={S.input} {...p("phone")} placeholder="+233244000001" />
          </div>
        </div>
        <button style={{ ...S.btn("primary"), marginTop: 16 }} onClick={saveProfile} disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Change password */}
      <div style={S.card}>
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: 14 }}>Change password</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={S.label}>Current password</label><input style={S.input} type="password" {...pw("currentPassword")} /></div>
          <div><label style={S.label}>New password</label><input style={S.input} type="password" {...pw("newPassword")} /></div>
          <div><label style={S.label}>Confirm new password</label><input style={S.input} type="password" {...pw("confirmPassword")} /></div>
        </div>
        <button style={{ ...S.btn("primary"), marginTop: 16 }} onClick={changePassword} disabled={loading}>
          {loading ? "Changing…" : "Change password"}
        </button>
      </div>
    </div>
  );
}

// ─── Forgot Password Page ─────────────────────────────────────────────────────
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true); setError("");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setSent(true);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 400, maxWidth: "90vw" }}>
        <div style={{ ...S.logo, marginBottom: "1.25rem" }}><span style={{ fontSize: 22 }}>📡</span> USSD Platform</div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h3 style={{ margin: "0 0 8px" }}>Check your email</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 20 }}>
              If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your inbox.
            </p>
            <button style={S.btn("primary")} onClick={() => window.location.href = "/"}>Back to login</button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontWeight: 500 }}>Forgot your password?</h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
              Enter your email and we'll send you a reset link.
            </p>
            {error && <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <label style={S.label}>Email address</label>
            <input style={{ ...S.input, marginBottom: 16 }} type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
            <button style={{ ...S.btn("primary"), width: "100%", padding: "10px" }} onClick={submit} disabled={loading || !email}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, marginTop: 12 }}>
              <span style={{ color: "var(--color-text-primary)", cursor: "pointer" }} onClick={() => window.location.href = "/"}>← Back to login</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Reset Password Page ──────────────────────────────────────────────────────
function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState("form"); // form | success | error
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Reset failed");
      else setStatus("success");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 400, maxWidth: "90vw" }}>
        <div style={{ ...S.logo, marginBottom: "1.25rem" }}><span style={{ fontSize: 22 }}>📡</span> USSD Platform</div>
        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: "0 0 8px" }}>Password reset!</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 20 }}>You can now log in with your new password.</p>
            <button style={S.btn("primary")} onClick={() => window.location.href = "/"}>Go to login</button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontWeight: 500 }}>Set new password</h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>Choose a strong password for your account.</p>
            {error && <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div><label style={S.label}>New password</label><input style={S.input} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div><label style={S.label}>Confirm password</label><input style={S.input} type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && submit()} /></div>
            </div>
            <button style={{ ...S.btn("primary"), width: "100%", padding: "10px" }} onClick={submit} disabled={loading}>
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// ─── Billing Verify Page (Paystack redirect handler) ─────────────────────────
function BillingVerifyPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("reference");
    if (!ref) { setStatus("error"); setMessage("No payment reference found."); return; }

    fetch("/api/billing/verify?reference=" + ref)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setMessage("Payment confirmed! Your plan has been upgraded.");
          setTimeout(() => window.location.href = "/", 3000);
        } else {
          setStatus("error");
          setMessage("Payment could not be verified. Please contact support.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("Verification failed. Please try again."); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 400, textAlign: "center", padding: "2.5rem" }}>
        {status === "loading" && <><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div><h3>Verifying payment…</h3></>}
        {status === "success" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: "#166534" }}>Payment confirmed!</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 8 }}>{message}</p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 8 }}>Redirecting to dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <h3 style={{ color: "#991b1b" }}>Verification failed</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 8 }}>{message}</p>
            <button style={{ ...S.btn("primary"), marginTop: 20 }} onClick={() => window.location.href = "/"}>Go to dashboard</button>
          </>
        )}
      </div>
    </div>
  );
}


// ─── Gateway display helpers ──────────────────────────────────────────────────
const GATEWAY_LABELS = {
  AFRICASTALKING:   "Africa's Talking",
  HUBTEL:           "Hubtel",
  WIGAL:            "Wigal",
  ARKESEL:          "Arkesel",
  RANCARD:          "Rancard",
  NALO:             "Nalo Solutions",
  MTN_GHANA:        "MTN Ghana (Direct)",
  TELECEL_GHANA:    "Telecel Ghana (Direct)",
  AIRTELTIGO_GHANA: "AirtelTigo (Direct)",
  CUSTOM:           "Custom",
  CONFIGURABLE:     "Custom (Configured)",
};
function gatewayLabel(type) {
  return GATEWAY_LABELS[type] || type;
}

// ─── Apps List ────────────────────────────────────────────────────────────────
function AppsPage() {
  const [apps, setApps] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", shortCode: "", gatewayType: "AFRICASTALKING", webhookMethod: "POST", requestFormat: "JSON" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setApps(await api.get("/apps")); } catch {}
    setLoading(false);
  }

  async function createApp() {
    try {
      await api.post("/apps", form);
      setShowCreate(false);
      setForm({ name: "", description: "", shortCode: "", gatewayType: "AFRICASTALKING", webhookMethod: "POST", requestFormat: "JSON" });
      load();
    } catch (e) { alert(e.message); }
  }

  const statusColor = { ACTIVE: "success", DRAFT: "warning", PAUSED: "danger" };
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>USSD Apps</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Manage and deploy your USSD applications</p>
        </div>
        <button style={S.btn("primary")} onClick={() => setShowCreate(true)}>+ New app</button>
      </div>

      {showCreate && (
        <div style={{ ...S.card, marginBottom: "1.5rem", border: "1px solid var(--color-border-info)" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 500 }}>Create new app</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={S.label}>App name *</label><input style={S.input} {...f("name")} /></div>
            <div><label style={S.label}>Short code (e.g. *714#)</label><input style={S.input} {...f("shortCode")} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Description</label><input style={S.input} {...f("description")} /></div>
            <div>
              <label style={S.label}>Gateway</label>
              <select style={S.select} {...f("gatewayType")}>
                <optgroup label="🇬🇭 Ghana Aggregators">
                  <option value="AFRICASTALKING">Africa's Talking</option>
                  <option value="HUBTEL">Hubtel</option>
                  <option value="WIGAL">Wigal</option>
                  <option value="ARKESEL">Arkesel</option>
                  <option value="RANCARD">Rancard</option>
                  <option value="NALO">Nalo Solutions</option>
                </optgroup>
                <optgroup label="📡 Direct Telco (Enterprise)">
                  <option value="MTN_GHANA">MTN Ghana (Direct)</option>
                  <option value="TELECEL_GHANA">Telecel Ghana (Direct)</option>
                  <option value="AIRTELTIGO_GHANA">AirtelTigo Ghana (Direct)</option>
                </optgroup>
                <optgroup label="⚙️ Other">
                  <option value="CUSTOM">Custom / Generic (auto-detect)</option>
                  <option value="CONFIGURABLE">Custom (with field mapping)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label style={S.label}>Webhook method</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["POST", "GET"].map(m => (
                  <button key={m} type="button"
                    style={{ ...S.btnSm(form.webhookMethod === m ? "primary" : "default"), flex: 1 }}
                    onClick={() => setForm(p => ({ ...p, webhookMethod: m }))}>
                    {m}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                {form.webhookMethod === "GET" ? "Gateway sends params in URL query string" : "Gateway sends params in request body (most common)"}
              </p>
            </div>
            <div>
              <label style={S.label}>Request format</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["JSON", "FORM", "XML"].map(f => (
                  <button key={f} type="button"
                    style={{ ...S.btnSm(form.requestFormat === f ? "primary" : "default"), flex: 1 }}
                    onClick={() => setForm(p => ({ ...p, requestFormat: f }))}>
                    {f}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                {form.requestFormat === "XML" ? "Gateway sends XML body" : form.requestFormat === "FORM" ? "Gateway sends URL-encoded form data" : "Gateway sends JSON body (most common)"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={S.btn("primary")} onClick={createApp}>Create app</button>
            <button style={S.btn()} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {apps.map(app => (
            <div key={app.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 15 }}>{app.name}</p>
                  {app.shortCode && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{app.shortCode}</p>}
                </div>
                <span style={S.badge(statusColor[app.status] || "warning")}>{app.status}</span>
              </div>
              {app.description && <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>{app.description}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{gatewayLabel(app.gatewayType)}</span>
                <button style={S.btnSm("primary")} onClick={() => window.location.hash = `#app/${app.id}`}>Open →</button>
              </div>
            </div>
          ))}
          {apps.length === 0 && !showCreate && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
              <p>No apps yet. Create your first USSD app to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  DISPLAY: { color: "#3b82f6", bg: "#eff6ff", label: "Option",  icon: "ti-list-numbers", desc: "Numbered menu choice" },
  INPUT:   { color: "#f59e0b", bg: "#fffbeb", label: "Input",   icon: "ti-keyboard",     desc: "Collect user text"   },
  END:     { color: "#ef4444", bg: "#fef2f2", label: "End",     icon: "ti-circle-x",     desc: "Close the session"   },
  WEBHOOK: { color: "#10b981", bg: "#f0fdf4", label: "API",     icon: "ti-webhook",      desc: "Call external API"   },
  ROUTER:  { color: "#8b5cf6", bg: "#f5f3ff", label: "Router",  icon: "ti-arrows-split", desc: "Go to menu"          },
};

function ActionCard({ icon, color, title, desc, active, children }) {
  const [open, setOpen] = useState(!!active);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  return (
    <div style={{ borderRadius: 8, border: open ? `1.5px solid ${color}` : "1px solid var(--color-border-secondary)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
          background: open ? `${color}12` : "var(--color-background-secondary)", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: open ? color : "var(--color-background-primary)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color: open ? "#fff" : color }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: open ? color : "var(--color-text-primary)" }}>{title}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{desc}</p>
        </div>
        <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, color: "var(--color-text-secondary)" }} />
      </button>
      {open && <div style={{ padding: "2px 12px 12px" }}>{children}</div>}
    </div>
  );
}

function ItemForm({ data, onChange, menus = [], selectedId = null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Label & Order
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 64px", gap: 8 }}>
          <input style={{ ...S.input, fontWeight: 500 }} value={data.label}
            onChange={e => onChange({ ...data, label: e.target.value })}
            placeholder={data.itemType === "END" ? "e.g. Exit" : "e.g. Check Balance"} />
          <input style={{ ...S.input, textAlign: "center", fontWeight: 700 }} type="number" min="1"
            value={data.displayOrder} onChange={e => onChange({ ...data, displayOrder: e.target.value })} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Action
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ActionCard icon="ti-arrow-right" color="#6366f1" title="Go to menu" desc="Navigate to another screen" active={!!data.nextMenuId}>
            <select style={{ ...S.select, marginTop: 8 }} value={data.nextMenuId || ""} onChange={e => onChange({ ...data, nextMenuId: e.target.value })}>
              <option value="">— select menu —</option>
              {menus.filter(m => m.id !== selectedId).map(m => <option key={m.id} value={m.id}>{m.root ? "★ " : ""}{m.name}</option>)}
            </select>
            {data.nextMenuId && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6366f1", fontWeight: 500 }}>→ {menus.find(m => m.id === data.nextMenuId)?.name}</p>}
          </ActionCard>
          <ActionCard icon="ti-keyboard" color="#f59e0b" title="Ask for input" desc="Show a prompt and save the reply" active={!!data.inputPrompt}>
            <input style={{ ...S.input, marginTop: 8 }} value={data.inputPrompt || ""} onChange={e => onChange({ ...data, inputPrompt: e.target.value })} placeholder="Prompt e.g. Enter your phone number:" />
            {data.inputPrompt && <input style={{ ...S.input, marginTop: 6 }} value={data.variableName || ""} onChange={e => onChange({ ...data, variableName: e.target.value })} placeholder="Save as variable e.g. phone_number" />}
          </ActionCard>
          <ActionCard icon="ti-webhook" color="#10b981" title="Call an API" desc="POST to your server and show response" active={!!data.webhookUrl}>
            <input style={{ ...S.input, marginTop: 8 }} value={data.webhookUrl || ""} onChange={e => onChange({ ...data, webhookUrl: e.target.value })} placeholder="https://api.yourserver.com/ussd" />
          </ActionCard>
          <ActionCard icon="ti-circle-x" color="#ef4444" title="End the session" desc="Close with a goodbye message" active={!!data.endMessage}>
            <input style={{ ...S.input, marginTop: 8 }} value={data.endMessage || ""} onChange={e => onChange({ ...data, endMessage: e.target.value })} placeholder="e.g. Thank you. Goodbye!" />
          </ActionCard>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ icon, title, sub, color, badge, onClose }) {
  return (
    <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          {badge && <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>{badge}</span>}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{sub}</p>
      </div>
      <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className="ti ti-x" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}

function PanelFooter({ onSave, saveLabel, saveDisabled, onCancel }) {
  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", gap: 8 }}>
      <button style={{ ...S.btn("primary"), flex: 1, justifyContent: "center" }} onClick={onSave} disabled={saveDisabled}>{saveLabel}</button>
      <button style={{ ...S.btn(), padding: "8px 14px" }} onClick={onCancel}>Cancel</button>
    </div>
  );
}

function SidePanel({ panel, setPanel, selected, setSelected, menus, currentMenu,
  menuName, setMenuName, editMenuName, setEditMenuName,
  newItem, setNewItem, editingItem, setEditingItem,
  addItem, saveItem, createMenu, saveMenuName, deleteMenuConfirm, deleteItem,
  dragging, dragOver, onDragStart, onDragOverItem, onDropItem }) {

  if (!panel) return null;

  if (panel === "newMenu") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PanelHeader icon="ti-layout-list" title="New Menu" sub="Create a new screen" color="#6366f1" onClose={() => setPanel(null)} />
      <div style={{ flex: 1, padding: 16 }}>
        <label style={S.label}>Menu name</label>
        <input style={S.input} value={menuName} onChange={e => setMenuName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createMenu()}
          placeholder="e.g. Main Menu, Airtime Menu…" autoFocus />
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
          {menus.length === 0 ? "This will be your root (starting) menu" : "Will be linked from another menu's item"}
        </p>
      </div>
      <PanelFooter onSave={createMenu} saveLabel="Create menu" saveDisabled={!menuName.trim()} onCancel={() => setPanel(null)} />
    </div>
  );

  if (panel === "addItem" && selected) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PanelHeader icon="ti-plus" title="Add Item" sub={`Adding to: ${selected.name}`} color="#0d0d0d" onClose={() => setPanel("menu")} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <ItemForm data={newItem} onChange={setNewItem} menus={menus} selectedId={selected.id} />
      </div>
      <PanelFooter onSave={addItem} saveLabel="Add item" saveDisabled={!newItem.label} onCancel={() => setPanel("menu")} />
    </div>
  );

  if (panel === "editItem" && editingItem) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PanelHeader icon="ti-pencil" title="Edit Item" sub={editingItem.label} color="#6366f1" onClose={() => { setPanel("menu"); setEditingItem(null); }} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <ItemForm data={editingItem} onChange={setEditingItem} menus={menus} selectedId={selected?.id} />
      </div>
      <PanelFooter onSave={saveItem} saveLabel="Save changes" saveDisabled={!editingItem.label} onCancel={() => { setPanel("menu"); setEditingItem(null); }} />
    </div>
  );

  if (panel === "menu" && selected) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PanelHeader icon={selected.root ? "ti-home" : "ti-layout-list"} title={selected.name}
        sub={selected.root ? "Root menu · shown first" : `${currentMenu?.items?.length || 0} items`}
        color="#6366f1" badge={selected.root ? "ROOT" : null}
        onClose={() => { setPanel(null); setSelected(null); }} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12 }}>
          <label style={S.label}>Rename</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...S.input, flex: 1 }} value={editMenuName} onChange={e => setEditMenuName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveMenuName()} placeholder={selected.name} />
            <button style={S.btnSm("primary")} onClick={saveMenuName} disabled={!editMenuName.trim()}>Save</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Items ({currentMenu?.items?.length || 0})</span>
          <button style={{ ...S.btnSm("primary"), fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
            onClick={() => { setNewItem({ itemType: "DISPLAY", label: "", inputPrompt: "", variableName: "", endMessage: "", webhookUrl: "", displayOrder: (currentMenu?.items?.length || 0) + 1, nextMenuId: "" }); setPanel("addItem"); }}>
            <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add item
          </button>
        </div>
        {!currentMenu?.items?.length && (
          <div style={{ textAlign: "center", padding: "20px 0", border: "1.5px dashed var(--color-border-secondary)", borderRadius: 8, color: "var(--color-text-secondary)" }}>
            <i className="ti ti-list-numbers" style={{ fontSize: 22, display: "block", marginBottom: 6, opacity: 0.3 }} />
            <p style={{ fontSize: 12, margin: "0 0 8px" }}>No items yet</p>
            <button style={{ ...S.btnSm("primary"), fontSize: 11 }}
              onClick={() => { setNewItem({ itemType: "DISPLAY", label: "", inputPrompt: "", variableName: "", endMessage: "", webhookUrl: "", displayOrder: 1, nextMenuId: "" }); setPanel("addItem"); }}>
              Add first item
            </button>
          </div>
        )}
        {currentMenu?.items?.sort((a, b) => a.displayOrder - b.displayOrder).map(item => {
          const cfg = TYPE_CFG[item.itemType] || TYPE_CFG.DISPLAY;
          const linked = item.nextMenuId ? menus.find(m => m.id === item.nextMenuId) : null;
          return (
            <div key={item.id} draggable
              onDragStart={e => onDragStart(e, item)} onDragOver={e => onDragOverItem(e, item)}
              onDrop={e => onDropItem(e, item)} onDragEnd={() => {}}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                border: dragOver === item.id ? `2px dashed ${cfg.color}` : "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)", cursor: "grab", opacity: dragging?.id === item.id ? 0.4 : 1 }}>
              <i className="ti ti-grip-vertical" style={{ fontSize: 12, color: "var(--color-text-secondary)", flexShrink: 0 }} />
              <div style={{ width: 22, height: 22, borderRadius: 5, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                {item.displayOrder}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                  {linked && <span style={{ fontSize: 9, background: "#ede9fe", color: "#6d28d9", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>→{linked.name}</span>}
                  {item.webhookUrl && <span style={{ fontSize: 9, background: "#f0fdf4", color: "#166534", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>API</span>}
                  {item.endMessage && <span style={{ fontSize: 9, background: "#fef2f2", color: "#991b1b", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>END</span>}
                </div>
                {item.inputPrompt && <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-secondary)" }}>↳ {item.inputPrompt}</p>}
              </div>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                <button onClick={() => { setEditingItem({ ...item, nextMenuId: item.nextMenuId || "" }); setPanel("editItem"); }}
                  style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-pencil" style={{ fontSize: 11 }} />
                </button>
                <button onClick={() => deleteItem(item.id)}
                  style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-trash" style={{ fontSize: 11, color: "#ef4444" }} />
                </button>
              </div>
            </div>
          );
        })}
        {currentMenu?.items?.length > 0 && (
          <div style={{ background: "#0d0d0d", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: 1 }}>USSD PREVIEW</p>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#00e87a", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {currentMenu.items.sort((a, b) => a.displayOrder - b.displayOrder)
                .map(item => item.itemType === "INPUT" ? (item.inputPrompt || item.label) : `${item.displayOrder}. ${item.label}`)
                .join("\n")}
            </div>
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--color-border-tertiary)", paddingTop: 12 }}>
          <button onClick={deleteMenuConfirm}
            style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            <i className="ti ti-trash" style={{ marginRight: 6 }} />Delete this menu
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ─── Menu Builder ─────────────────────────────────────────────────────────────
function MenuBuilder({ appId }) {
  const [menus, setMenus]               = useState([]);
  const [expanded, setExpanded]         = useState({});   // which menus are open in tree
  const [selected, setSelected]         = useState(null);
  const [panel, setPanel]               = useState(null);
  const [editingItem, setEditingItem]   = useState(null);
  const [newItem, setNewItem]           = useState(blankItem(1));
  const [menuName, setMenuName]         = useState("");
  const [editMenuName, setEditMenuName] = useState("");
  const [filter, setFilter]             = useState("");
  const [dragging, setDragging]         = useState(null);
  const [dragOver, setDragOver]         = useState(null);

  function blankItem(order) {
    return { itemType: "DISPLAY", label: "", inputPrompt: "", variableName: "", endMessage: "", webhookUrl: "", displayOrder: order, nextMenuId: "" };
  }

  useEffect(() => { if (appId) load(); }, [appId]);

  async function load() {
    try {
      const m = await api.get(`/apps/${appId}/menus`);
      setMenus(m);
      setSelected(prev => prev ? (m.find(x => x.id === prev.id) || null) : null);
      return m;
    } catch {}
  }

  const currentMenu = menus.find(m => m.id === selected?.id);

  function toggleExpand(menuId) {
    setExpanded(p => ({ ...p, [menuId]: !p[menuId] }));
  }

  function openMenu(menu) {
    setSelected(menu);
    setEditMenuName(menu.name);
    setPanel("menu");
    setExpanded(p => ({ ...p, [menu.id]: true }));
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function createMenu() {
    if (!menuName.trim()) return;
    try { await api.post(`/apps/${appId}/menus`, { name: menuName, root: menus.length === 0 }); setMenuName(""); setPanel(null); load(); } catch (e) { alert(e.message); }
  }

  async function saveMenuName() {
    if (!editMenuName.trim() || !selected) return;
    try { await api.put(`/apps/${appId}/menus/${selected.id}`, { name: editMenuName }); load(); } catch {}
  }

  async function deleteMenuConfirm() {
    if (!selected || !confirm(`Delete "${selected.name}" and all its items?`)) return;
    try {
      await api.delete(`/apps/${appId}/menus/${selected.id}`);
      setSelected(null);
      setPanel(null);
      await load();
    } catch (e) {
      console.error("Delete menu error:", e);
      // Reload anyway to sync state with backend
      await load();
    }
  }

  function buildPayload(item) {
    return { label: item.label, itemType: item.itemType || "DISPLAY", inputPrompt: item.inputPrompt || null, variableName: item.variableName || null, endMessage: item.endMessage || null, webhookUrl: item.webhookUrl || null, displayOrder: parseInt(item.displayOrder) || 1, nextMenuId: item.nextMenuId || null };
  }

  async function addItem() {
    try { await api.post(`/apps/${appId}/menus/${selected.id}/items`, buildPayload(newItem)); setPanel("menu"); setNewItem(blankItem((currentMenu?.items?.length || 0) + 1)); load(); } catch (e) { alert(e.message); }
  }

  async function saveItem() {
    try { await api.put(`/apps/${appId}/menus/${selected.id}/items/${editingItem.id}`, buildPayload(editingItem)); setEditingItem(null); setPanel("menu"); load(); } catch (e) { alert(e.message); }
  }

  async function deleteItem(itemId) {
    if (!confirm("Delete this item?")) return;
    try {
      await api.delete(`/apps/${appId}/menus/${selected.id}/items/${itemId}`);
      await load();
    } catch (e) {
      console.error("Delete item error:", e);
      await load(); // reload anyway to stay in sync
    }
  }

  function onDragStart(e, item) { setDragging(item); e.dataTransfer.effectAllowed = "move"; }
  function onDragOverItem(e, item) { e.preventDefault(); if (item.id !== dragging?.id) setDragOver(item.id); }
  async function onDropItem(e, target) {
    e.preventDefault();
    if (!dragging || dragging.id === target.id) { setDragging(null); setDragOver(null); return; }
    const items = [...(currentMenu?.items || [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const from = items.findIndex(i => i.id === dragging.id), to = items.findIndex(i => i.id === target.id);
    const reordered = [...items]; reordered.splice(from, 1); reordered.splice(to, 0, dragging);
    setDragging(null); setDragOver(null);
    try { await api.put(`/apps/${appId}/menus/${selected.id}/items/reorder`, reordered.map((item, idx) => ({ id: item.id, displayOrder: idx + 1 }))); load(); } catch {}
  }

  const filtered = menus.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 180px)", minHeight: 500, border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>

      {/* ── Left: Tree list ────────────────────────────────────────────── */}
      <div style={{ width: panel ? 320 : "100%", borderRight: panel ? "1px solid var(--color-border-tertiary)" : "none", display: "flex", flexDirection: "column", background: "var(--color-background-primary)", transition: "width .2s" }}>

        {/* Toolbar */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ ...S.btn("primary"), display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            onClick={() => { setPanel("newMenu"); setMenuName(""); }}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} /> New Menu
          </button>
          {selected && (
            <>
              <button style={{ ...S.btnSm(), display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => { setPanel("addItem"); setNewItem(blankItem((currentMenu?.items?.length || 0) + 1)); }}>
                <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add Option
              </button>
              <button style={{ ...S.btnSm(), display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => { setEditMenuName(selected.name); setPanel("menu"); }}>
                <i className="ti ti-pencil" style={{ fontSize: 11 }} /> Edit Menu
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                onClick={deleteMenuConfirm}>
                <i className="ti ti-trash" style={{ fontSize: 11 }} /> Delete
              </button>
            </>
          )}
        </div>

        {/* Filter */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ position: "relative" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)" }} />
            <input style={{ ...S.input, paddingLeft: 32 }} placeholder="Filter menus…"
              value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-secondary)" }}>
              <i className="ti ti-topology-star" style={{ fontSize: 32, display: "block", marginBottom: 10, opacity: 0.2 }} />
              <p style={{ fontSize: 13, margin: "0 0 12px" }}>{filter ? "No menus match" : "No menus yet"}</p>
              {!filter && (
                <button style={{ ...S.btn("primary"), fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() => { setPanel("newMenu"); setMenuName(""); }}>
                  <i className="ti ti-plus" /> Create first menu
                </button>
              )}
            </div>
          )}

          {filtered.map(menu => {
            const isOpen = expanded[menu.id];
            const isSel  = selected?.id === menu.id;
            const items  = (menu.items || []).sort((a, b) => a.displayOrder - b.displayOrder);
            return (
              <div key={menu.id}>
                {/* Menu row */}
                <div
                  onClick={() => openMenu(menu)}
                  style={{ display: "flex", alignItems: "center", gap: 0, padding: "0",
                    background: isSel ? "var(--color-background-secondary)" : "transparent",
                    borderLeft: isSel ? "3px solid #6366f1" : "3px solid transparent",
                    cursor: "pointer", transition: "background .1s" }}>

                  {/* Expand toggle */}
                  <button onClick={e => { e.stopPropagation(); toggleExpand(menu.id); }}
                    style={{ width: 36, height: 36, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--color-text-secondary)" }}>
                    <i className={`ti ${items.length ? (isOpen ? "ti-chevron-down" : "ti-chevron-right") : "ti-minus"}`} style={{ fontSize: 11 }} />
                  </button>

                  {/* Icon */}
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: menu.root ? "#fef3c7" : "#eff6ff",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8 }}>
                    <i className={`ti ${menu.root ? "ti-home" : "ti-layout-list"}`}
                      style={{ fontSize: 12, color: menu.root ? "#d97706" : "#3b82f6" }} />
                  </div>

                  {/* Name */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isSel ? 600 : 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "10px 0" }}>
                    {menu.name}
                  </span>

                  {/* Badges */}
                  <div style={{ display: "flex", gap: 4, padding: "0 10px", flexShrink: 0 }}>
                    {menu.root && <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ROOT</span>}
                    <span style={{ fontSize: 9, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "1px 5px", borderRadius: 3 }}>
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Items under menu (expanded) */}
                {isOpen && items.map(item => {
                  const cfg = TYPE_CFG[item.itemType] || TYPE_CFG.DISPLAY;
                  const linked = item.nextMenuId ? menus.find(m => m.id === item.nextMenuId) : null;
                  return (
                    <div key={item.id}
                      onClick={e => { e.stopPropagation(); openMenu(menu); setEditingItem({ ...item, nextMenuId: item.nextMenuId || "" }); setPanel("editItem"); }}
                      style={{ display: "flex", alignItems: "center", gap: 0, paddingLeft: 36,
                        borderLeft: isSel ? "3px solid #6366f1" : "3px solid transparent",
                        cursor: "pointer", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      {/* Tree line */}
                      <div style={{ width: 20, height: 36, flexShrink: 0, display: "flex", alignItems: "center" }}>
                        <div style={{ width: 12, height: 1, background: "var(--color-border-secondary)", marginLeft: 4 }} />
                      </div>
                      {/* Item type dot */}
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color }}>{item.displayOrder}</span>
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "8px 0" }}>
                        {item.label}
                      </span>
                      <div style={{ display: "flex", gap: 3, padding: "0 8px", flexShrink: 0 }}>
                        <span style={{ fontSize: 9, background: cfg.bg, color: cfg.color, padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>{cfg.label}</span>
                        {linked && <span style={{ fontSize: 9, background: "#ede9fe", color: "#6d28d9", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>→{linked.name}</span>}
                        {item.webhookUrl && <span style={{ fontSize: 9, background: "#f0fdf4", color: "#166534", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>API</span>}
                        {item.endMessage && <span style={{ fontSize: 9, background: "#fef2f2", color: "#991b1b", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>END</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Status bar */}
        <div style={{ padding: "6px 12px", borderTop: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 11, color: "var(--color-text-secondary)", display: "flex", gap: 12 }}>
          <span>{menus.length} menu{menus.length !== 1 ? "s" : ""}</span>
          <span>{menus.reduce((a, m) => a + (m.items?.length || 0), 0)} total items</span>
          {selected && <span style={{ color: "#6366f1", fontWeight: 500 }}>Selected: {selected.name}</span>}
        </div>
      </div>

      {/* ── Right: Side panel ──────────────────────────────────────────── */}
      {panel && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-background-primary)" }}>
          <SidePanel
            panel={panel} setPanel={setPanel}
            selected={selected} setSelected={setSelected}
            menus={menus} currentMenu={currentMenu}
            menuName={menuName} setMenuName={setMenuName}
            editMenuName={editMenuName} setEditMenuName={setEditMenuName}
            newItem={newItem} setNewItem={setNewItem}
            editingItem={editingItem} setEditingItem={setEditingItem}
            addItem={addItem} saveItem={saveItem}
            createMenu={createMenu} saveMenuName={saveMenuName}
            deleteMenuConfirm={deleteMenuConfirm} deleteItem={deleteItem}
            dragging={dragging} dragOver={dragOver}
            onDragStart={onDragStart} onDragOverItem={onDragOverItem} onDropItem={onDropItem}
          />
        </div>
      )}
    </div>
  );
}


// ─── Webhook Info ─────────────────────────────────────────────────────────────
function WebhookPage({ appId }) {
  const webhookUrl = `http://YOUR_SERVER:8080/ussd/webhook/${appId}`;
  const [copied, setCopied] = useState(false);

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 0.5rem", fontSize: 20, fontWeight: 500 }}>Integration</h2>
      <p style={{ margin: "0 0 1.5rem", fontSize: 13, color: "var(--color-text-secondary)" }}>Configure your telecom gateway to send requests to your webhook URL.</p>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 8 }}>Your webhook URL</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, background: "var(--color-background-secondary)", padding: "10px 14px", borderRadius: 8, fontSize: 13, wordBreak: "break-all" }}>{webhookUrl}</code>
            <button style={S.btn()} onClick={() => copy(webhookUrl)}>{copied ? "✓ Copied" : "Copy"}</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>Replace YOUR_SERVER with your actual server address or domain.</p>
        </div>

        {[
          { title: "Africa's Talking", steps: ["Log in to africastalking.com", "Go to USSD → Create a channel", "Enter your short code (e.g. *714#)", "Set the callback URL to the webhook URL above", "Save and activate"] },
          { title: "Hubtel", steps: ["Log in to developers.hubtel.com", "Create a new USSD application", "Under callback settings, paste the URL above", "Select 'JSON' as request format", "Save your configuration"] },
          { title: "Wigal", steps: ["Log in to apps.wigal.com.gh", "Create a USSD service", "Set callback URL to the webhook URL above", "Set request format to JSON", "Save and test"] },
          { title: "Arkesel", steps: ["Log in to sms.arkesel.com", "Go to USSD → Create application", "Paste the webhook URL as your callback", "Response format: CON/END plain text", "Save and activate"] },
          { title: "Rancard", steps: ["Contact Rancard for API access (enterprise)", "Set callback URL to the webhook URL above", "Request format: JSON", "Response format: JSON with continue_session field"] },
          { title: "Nalo Solutions", steps: ["Log in to your Nalo Solutions dashboard (nalosolutions.com)", "Go to USSD Services → Create/Edit service", "Set the callback URL to the webhook URL above", "Request format: JSON with USERID, MSISDN, USERDATA, MSGTYPE fields", "Response format: JSON with MSG and MSGTYPE fields", "Contact Nalo support to activate your short code"] },
          { title: "MTN Ghana (Direct)", steps: ["Requires formal MTN Ghana enterprise partnership", "Contact MTN Business Ghana or developer.mtn.com.gh", "Provide the webhook URL as your callback endpoint", "Request format: JSON with requestId, msisdn, ussdString, sessionStatus", "Response format: JSON with responseString and action (INPUT/BREAK)"] },
          { title: "Telecel Ghana (Direct)", steps: ["Requires Telecel Ghana enterprise agreement", "Contact business.telecel.com.gh", "Provide the webhook URL as your callback endpoint", "Request format: JSON with msisdn, sessionId, input, type (1/2/3)", "Response format: JSON with message and continueSession fields"] },
          { title: "AirtelTigo Ghana (Direct)", steps: ["Requires AirtelTigo Ghana enterprise agreement", "Contact business.airteltigo.com.gh", "Provide the webhook URL as your callback endpoint", "Request format: JSON with msisdn, sessionId, ussdString, newSession", "Response format: CON/END plain text"] },
          { title: "Custom / Generic", steps: ["Paste the webhook URL into your gateway's callback field", "The platform accepts both JSON and form-encoded requests", "Response: CON/END plain text format", "Contact support if your gateway needs a different format"] },
        ].map(g => (
          <div key={g.title} style={S.card}>
            <p style={{ ...S.label, marginBottom: 12 }}>{g.title}</p>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
              {g.steps.map((s, i) => <li key={i} style={{ color: "var(--color-text-secondary)" }}>{s}</li>)}
            </ol>
          </div>
        ))}

        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 8 }}>HTTP method</p>
          <p style={{ fontSize: 14, margin: 0 }}>The webhook accepts <strong>POST</strong> requests. Africa's Talking sends form-encoded data; Hubtel sends JSON. Both are handled automatically.</p>
        </div>
      </div>
    </div>
  );
}

// ─── App Detail ───────────────────────────────────────────────────────────────
function AppDetail({ appId, onBack }) {
  const [tab, setTab] = useState("menus");
  const [app, setApp] = useState(null);

  useEffect(() => { api.get(`/apps/${appId}`).then(setApp).catch(() => {}); }, [appId]);

  const tabs = [
    { id: "menus", label: "Menu builder", icon: "ti-layout-list" },
    { id: "simulator", label: "Simulator", icon: "ti-device-mobile" },
    { id: "webhook", label: "Integration", icon: "ti-plug" },
    { id: "settings", label: "Settings", icon: "ti-settings" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button style={{ ...S.btn(), padding: "6px 12px" }} onClick={onBack}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>{app?.name || "Loading…"}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            {app && <span style={S.badge(app.status === "ACTIVE" ? "success" : "warning")}>{app.status}</span>}
            {app && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "2px 8px", borderRadius: 20 }}>📡 {gatewayLabel(app.gatewayType)}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.btn(), borderRadius: "8px 8px 0 0", borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent", borderLeft: "none", borderRight: "none", borderTop: "none", fontWeight: tab === t.id ? 500 : 400 }}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 6, fontSize: 15 }} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "menus" && <MenuBuilder appId={appId} />}
      {tab === "simulator" && (
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 20 }}>USSD Simulator</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)" }}>Test your USSD menus without a real SIM card</p>
          <div style={{ maxWidth: 340 }}>
            <UssdSimulator appId={appId} appName={app?.name} shortCode={app?.shortCode} />
          </div>
        </div>
      )}
      {tab === "webhook" && <WebhookPage appId={appId} />}
      {tab === "settings" && app && <AppSettings app={app} />}
    </div>
  );
}

function AppSettings({ app }) {
  const [form, setForm] = useState({ name: app.name, description: app.description || "", shortCode: app.shortCode || "", status: app.status, gatewayType: app.gatewayType || "AFRICASTALKING", webhookMethod: app.webhookMethod || "POST", requestFormat: app.requestFormat || "JSON" });
  const [gwConfig, setGwConfig] = useState(app.gatewayConfig || {});
  const [saved, setSaved] = useState(false);
  const isConfigurable = app.gatewayType === "CONFIGURABLE" || app.gatewayType === "CUSTOM";

  async function save() {
    try {
      await api.put(`/apps/${app.id}`, {
        ...form,
        gatewayConfig: isConfigurable ? gwConfig : undefined
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });
  const gw = (k) => ({ value: gwConfig[k] || "", onChange: (e) => setGwConfig(p => ({ ...p, [k]: e.target.value })) });

  const configFields = [
    { group: "Request mapping", fields: [
      { key: "req.format",      label: "Request format",        placeholder: "json or form" },
      { key: "req.sessionId",   label: "Session ID field",      placeholder: "sessionId" },
      { key: "req.msisdn",      label: "Phone number field",    placeholder: "msisdn" },
      { key: "req.shortCode",   label: "Short code field",      placeholder: "serviceCode" },
      { key: "req.input",       label: "User input field",      placeholder: "text" },
      { key: "req.isNew",       label: "New session field",     placeholder: "new_session" },
      { key: "req.isNewValue",  label: "New session value",     placeholder: "true" },
      { key: "req.cumulative",  label: "Cumulative input?",     placeholder: "false" },
    ]},
    { group: "Response format", fields: [
      { key: "res.format",      label: "Response format",       placeholder: "text or json" },
      { key: "res.message",     label: "Message field name",    placeholder: "message" },
      { key: "res.continue",    label: "Continue flag field",   placeholder: "shouldContinue" },
      { key: "res.continueVal", label: "Continue value",        placeholder: "true" },
      { key: "res.endVal",      label: "End value",             placeholder: "false" },
    ]},
  ];

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>App settings</p>
        <div><label style={S.label}>App name</label><input style={S.input} {...f("name")} /></div>
        <div><label style={S.label}>Description</label><input style={S.input} {...f("description")} /></div>
        <div><label style={S.label}>Short code</label><input style={S.input} {...f("shortCode")} /></div>
        <div>
          <label style={S.label}>Gateway</label>
          <select style={S.select} {...f("gatewayType")}>
            <optgroup label="🇬🇭 Ghana Aggregators">
              <option value="AFRICASTALKING">Africa's Talking</option>
              <option value="HUBTEL">Hubtel</option>
              <option value="WIGAL">Wigal</option>
              <option value="ARKESEL">Arkesel</option>
              <option value="RANCARD">Rancard</option>
              <option value="NALO">Nalo Solutions</option>
            </optgroup>
            <optgroup label="📡 Direct Telco (Enterprise)">
              <option value="MTN_GHANA">MTN Ghana (Direct)</option>
              <option value="TELECEL_GHANA">Telecel Ghana (Direct)</option>
              <option value="AIRTELTIGO_GHANA">AirtelTigo Ghana (Direct)</option>
            </optgroup>
            <optgroup label="⚙️ Other">
              <option value="CUSTOM">Custom / Generic (auto-detect)</option>
              <option value="CONFIGURABLE">Custom (with field mapping)</option>
            </optgroup>
          </select>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
            {form.gatewayType === "MTN_GHANA" || form.gatewayType === "TELECEL_GHANA" || form.gatewayType === "AIRTELTIGO_GHANA"
              ? "⚠️ Direct telco connections require a formal enterprise agreement with the network."
              : form.gatewayType === "CONFIGURABLE"
              ? "Configure field mappings below after saving."
              : ""}
          </p>
        </div>
        <div>
          <label style={S.label}>Status</label>
          <select style={S.select} {...f("status")}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <button style={S.btn("primary")} onClick={save}>{saved ? "✓ Saved" : "Save changes"}</button>
      </div>

      {isConfigurable && (
        <div style={S.card}>
          <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 14 }}>Custom gateway field mapping</p>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>
            Map your gateway's field names so the platform knows how to read requests and format responses.
            Leave blank to use auto-detection.
          </p>
          {configFields.map(group => (
            <div key={group.group} style={{ marginBottom: 20 }}>
              <p style={{ ...S.label, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                {group.group}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label style={S.label}>{field.label}</label>
                    <input style={S.input} placeholder={field.placeholder} {...gw(field.key)} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Preview */}
          {Object.keys(gwConfig).some(k => gwConfig[k]) && (
            <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12, marginTop: 8 }}>
              <p style={{ ...S.label, marginBottom: 8 }}>Config preview</p>
              <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap", color: "var(--color-text-secondary)" }}>
                {JSON.stringify(gwConfig, null, 2)}
              </pre>
            </div>
          )}

          <button style={{ ...S.btn("primary"), marginTop: 16 }} onClick={save}>
            {saved ? "✓ Saved" : "Save gateway config"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App({ verifyMode = false, inviteMode = false, forgotMode = false, resetMode = false }) {
  if (verifyMode || window.location.pathname.startsWith('/verify-email')) return <VerifyEmailPage />;
  if (inviteMode || window.location.pathname.startsWith('/accept-invite')) return <AcceptInvitePage />;
  if (forgotMode || window.location.pathname.startsWith('/forgot-password')) return <ForgotPasswordPage />;
  if (resetMode || window.location.pathname.startsWith('/reset-password')) return <ResetPasswordPage />;
  if (window.location.pathname.startsWith('/billing/verify')) return <BillingVerifyPage />;

  const [user, setUser] = useState(null);
  const [page, setPage] = useState("apps");
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      function tryAuth(attempt) {
        api.get("/auth/me")
          .then(u => { setUser(u); setCheckingAuth(false); })
          .catch(err => {
            const msg = err?.message || "";
            // 401 = real token expiry (already handled by api helper via reload)
            // Network errors = backend restarting, retry
            // 403 on early attempts = backend still initializing, retry
            // 403 after many retries = real auth problem, logout
            const isNetworkError = msg.includes("fetch") || msg.includes("Failed") || msg.includes("Network") || msg.includes("Load");
            const is403 = msg.includes("403");

            if (isNetworkError || (is403 && attempt < 5)) {
              // Backend restarting or still initializing — retry
              if (attempt < 10) {
                setTimeout(() => tryAuth(attempt + 1), 1500);
              } else {
                // Gave up after ~15 seconds
                setCheckingAuth(false);
              }
            } else {
              // Real auth failure (401 already handled, or persistent 403)
              localStorage.removeItem("token");
              setCheckingAuth(false);
            }
          });
      }
      tryAuth(0);
    } else {
      setCheckingAuth(false);
    }

    function onHash() {
      const hash = window.location.hash;
      if (hash.startsWith("#app/")) {
        setSelectedAppId(hash.replace("#app/", ""));
        setPage("app-detail");
      }
    }
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (checkingAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--color-background-primary)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-primary)", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
        {localStorage.getItem("token") ? "Reconnecting…" : "Loading…"}
      </p>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
  if (!user) return <AuthPage onLogin={u => setUser(u)} />;

  const navItems = [
    { id: "apps",      label: "My apps",      icon: "ti-apps" },
    { id: "analytics", label: "Analytics",     icon: "ti-chart-bar" },
    { id: "billing",   label: "Billing",       icon: "ti-credit-card" },
    { id: "team",      label: "Team",          icon: "ti-users" },
    { id: "profile",   label: "Profile",       icon: "ti-user" },
    { id: "docs",      label: "Documentation", icon: "ti-book" },
  ];

  return (
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={S.logo}>
          <span style={{ fontSize: 20 }}>📡</span>
          <span>USSD Platform</span>
          <span style={{ ...S.badge("info"), marginLeft: 8 }}>{user.plan}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{user.tenantName}</span>
          <span style={{ fontSize: 13 }}>{user.fullName}</span>
          <button style={S.btnSm()} onClick={logout}>Sign out</button>
        </div>
      </div>

      <div style={S.layout}>
        <div style={S.sidebar}>
          {navItems.map(n => (
            <div key={n.id} style={S.navItem(page === n.id && !selectedAppId)} onClick={() => { setPage(n.id); setSelectedAppId(null); window.location.hash = ""; }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
              {n.label}
            </div>
          ))}
          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", margin: "1rem 0", padding: "0.5rem 1.25rem" }}>
            <p style={{ ...S.label, marginBottom: 4 }}>Account</p>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{user.role}</p>
          </div>
        </div>

        <div style={S.main}>
          {page === "app-detail" && selectedAppId
            ? <AppDetail appId={selectedAppId} onBack={() => { setPage("apps"); setSelectedAppId(null); window.location.hash = ""; }} />
            : page === "apps" ? <AppsPage />
            : page === "analytics" ? <AnalyticsPage />
            : page === "billing" ? <BillingPage currentUser={user} />
            : page === "team" ? <TeamPage currentUser={user} />
            : page === "profile" ? <ProfilePage user={user} onUpdate={u => setUser(u)} />
            : <div><h2 style={{ fontWeight: 500 }}>Documentation</h2><p style={{ color: "var(--color-text-secondary)" }}>Coming soon.</p></div>
          }
        </div>
      </div>
    </div>
  );
}

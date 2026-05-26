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
    const data = await res.json();
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
  const [mode, setMode] = useState("login");       // login | register
  const [step, setStep] = useState("credentials"); // credentials | otp
  const [loginMethod, setLoginMethod] = useState("email"); // email | phone
  const [form, setForm] = useState({ email: "", password: "", fullName: "", companyName: "", phone: "", countryCode: "+233", phoneLocal: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "register") {
        // Validate phone
        if (!form.phoneLocal) {
          setError("Phone number is required");
          setLoading(false);
          return;
        }
        if (!isValidPhone(form.phoneLocal, form.countryCode)) {
          setError(getPhoneHint(form.countryCode));
          setLoading(false);
          return;
        }
        const payload = {
          ...form,
          phone: buildFullPhone(form.phoneLocal, form.countryCode),
        };
        const res = await api.post("/auth/register", payload);
        if (res.error && res.error.toLowerCase().includes("already")) {
          setError("This email is already registered. Please sign in instead.");
          setMode("login");
        } else {
          setSuccess("Account created! Please check your email (" + payload.email + ") and click the verification link to activate your account.");
          setMode("login");
        }
      } else {
        // Build identifier — email or full phone number
        const identifier = loginMethod === "phone"
          ? buildFullPhone(form.phoneLocal, form.countryCode)
          : form.email;
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier, password: form.password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Login failed");
        } else if (data.otpRequired) {
          setSuccess(data.message);
          setStep("otp");
        }
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function submitOtp() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otp })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        if (!data.error?.includes("Resend")) setOtp("");
      } else {
        localStorage.setItem("token", data.token);
        onLogin(data.user);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function resendOtp() {
    setLoading(true); setError(""); setSuccess(""); setOtp("");
    try {
      const identifier = loginMethod === "phone"
        ? buildFullPhone(form.phoneLocal, form.countryCode)
        : form.email;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password: form.password })
      });
      const data = await res.json();
      if (res.ok && data.otpRequired) setSuccess("New code sent! Check your email.");
      else setError(data.error || "Failed to resend. Please go back and try again.");
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 420, maxWidth: "90vw" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ ...S.logo, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📡</span> USSD Platform
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {step === "otp" ? "Two-factor verification" : mode === "login" ? "Sign in to your account" : "Create your company account"}
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div style={{ background: "#f0fdf4", color: "#166534", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            ✓ {success}
            {success.includes("verify") && form.email && (
              <div style={{ marginTop: 6 }}>
                <span style={{ cursor: "pointer", textDecoration: "underline", fontWeight: 500 }} onClick={resendVerification}>
                  Resend verification email
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            {error}
            {error.includes("verify") && (
              <div style={{ marginTop: 6 }}>
                <span style={{ cursor: "pointer", textDecoration: "underline", fontWeight: 500 }} onClick={resendVerification}>
                  Resend verification email
                </span>
              </div>
            )}
          </div>
        )}

        {/* OTP Step */}
        {step === "otp" ? (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Enter the 6-digit code sent to<br/><strong>{form.email}</strong>
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Verification code</label>
              <input
                style={{ ...S.input, fontSize: 28, letterSpacing: 10, textAlign: "center", padding: "14px 12px" }}
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && submitOtp()}
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
                Expires in 10 minutes · Max 3 attempts
              </p>
            </div>

            <button
              style={{ ...S.btn("primary"), width: "100%", padding: "10px 16px", opacity: otp.length !== 6 ? 0.5 : 1 }}
              onClick={submitOtp}
              disabled={loading || otp.length !== 6}>
              {loading ? "Verifying…" : "Verify & Sign in"}
            </button>

            {/* Locked state */}
            {error && error.includes("Resend") && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#fef9c3", borderRadius: 8, textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#854d0e", fontWeight: 500 }}>
                  🔒 Code locked after 3 attempts
                </p>
                <button style={{ ...S.btn("primary"), fontSize: 13, padding: "8px 20px" }} onClick={resendOtp} disabled={loading}>
                  {loading ? "Sending…" : "Get a new code"}
                </button>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 14, display: "flex", justifyContent: "center", gap: 16 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500 }}
                onClick={resendOtp} disabled={loading}>
                Resend new code
              </span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>·</span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
                onClick={() => { setStep("credentials"); setOtp(""); setError(""); setSuccess(""); }}>
                ← Back to login
              </span>
            </div>
          </div>

        ) : (
          /* Credentials Step */
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mode === "register" && <>
                <div><label style={S.label}>Full name</label><input style={S.input} {...f("fullName")} /></div>
                <div><label style={S.label}>Company name</label><input style={S.input} {...f("companyName")} /></div>
              </>}
              {mode === "login" && (
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {["email", "phone"].map(m => (
                    <button key={m} type="button"
                      style={{ ...S.btnSm(loginMethod === m ? "primary" : "default"), flex: 1, textTransform: "capitalize" }}
                      onClick={() => setLoginMethod(m)}>
                      {m === "email" ? "📧 Email" : "📱 Phone"}
                    </button>
                  ))}
                </div>
              )}

              {mode === "login" && loginMethod === "phone" ? (
                <div>
                  <label style={S.label}>Phone number</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select style={{ ...S.select, width: 110, flexShrink: 0 }}
                      value={form.countryCode}
                      onChange={e => setForm(p => ({ ...p, countryCode: e.target.value }))}>
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code + c.dial} value={c.dial}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <input style={{ ...S.input, flex: 1 }}
                      type="tel"
                      placeholder="244000001"
                      value={form.phoneLocal}
                      maxLength={12}
                      onChange={e => setForm(p => ({ ...p, phoneLocal: e.target.value.replace(/[^0-9]/g, "") }))}
                    />
                  </div>
                </div>
              ) : (
                <div><label style={S.label}>{mode === "register" ? "Email" : "Email"}</label>
                  <input style={S.input} type="email" {...f("email")} /></div>
              )}

              <div><label style={S.label}>Password</label>
                <input style={S.input} type="password" {...f("password")}
                  onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
              {mode === "register" && (
                <div>
                  <label style={S.label}>Phone number <span style={{color:"var(--color-text-danger)"}}>*</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select style={{ ...S.select, width: 130, flexShrink: 0 }}
                      value={form.countryCode}
                      onChange={e => setForm(p => ({ ...p, countryCode: e.target.value }))}>
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <input style={{ ...S.input, flex: 1 }}
                      placeholder="244000001"
                      value={form.phoneLocal}
                      maxLength={10}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setForm(p => ({ ...p, phoneLocal: val }));
                      }}
                    />
                  </div>
                  {form.phoneLocal && !isValidPhone(form.phoneLocal, form.countryCode) && (
                    <p style={{ fontSize: 11, color: "var(--color-text-danger)", marginTop: 4 }}>
                      {getPhoneHint(form.countryCode)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button style={{ ...S.btn("primary"), width: "100%", marginTop: 20, padding: "10px 16px" }}
              onClick={submit} disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, marginTop: 16, color: "var(--color-text-secondary)" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span style={{ color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500 }}
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </span>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}


// ─── Verify Email Page ────────────────────────────────────────────────────────
function VerifyEmailPage() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); setMessage("Invalid verification link — no token found."); return; }
    api.get("/auth/verify?token=" + token)
      .then(res => { setStatus("success"); setMessage(res.message); setEmail(res.email || ""); })
      .catch(e => { setStatus("error"); setMessage(e.message || "Verification failed."); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ ...S.card, width: 440, maxWidth: "90vw", textAlign: "center", padding: "2.5rem" }}>
        {status === "loading" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 500, margin: "0 0 8px" }}>Verifying your email…</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Please wait a moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 500, margin: "0 0 8px", color: "#166534" }}>Email verified!</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
              {message}
            </p>
            <button style={{ ...S.btn("primary"), padding: "11px 28px" }}
              onClick={() => window.location.href = "/"}>
              Go to dashboard →
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontWeight: 500, margin: "0 0 8px", color: "#991b1b" }}>Verification failed</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>{message}</p>
            <button style={{ ...S.btn("primary"), padding: "11px 28px" }}
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

// ─── Apps List ────────────────────────────────────────────────────────────────
function AppsPage() {
  const [apps, setApps] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", shortCode: "", gatewayType: "AFRICASTALKING" });
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
      setForm({ name: "", description: "", shortCode: "", gatewayType: "AFRICASTALKING" });
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
                <option value="AFRICASTALKING">Africa's Talking</option>
                <option value="HUBTEL">Hubtel</option>
                <option value="CUSTOM">Custom</option>
              </select>
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
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{app.gatewayType}</span>
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

// ─── Menu Builder ─────────────────────────────────────────────────────────────
function MenuBuilder({ appId }) {
  const [menus, setMenus] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ itemType: "DISPLAY", label: "", inputPrompt: "", variableName: "", endMessage: "", webhookUrl: "", displayOrder: 0 });

  useEffect(() => { if (appId) loadMenus(); }, [appId]);

  async function loadMenus() {
    try { const m = await api.get(`/apps/${appId}/menus`); setMenus(m); if (!selected && m.length) setSelected(m[0]); } catch {}
  }

  async function addMenu() {
    try { await api.post(`/apps/${appId}/menus`, { name: menuName, root: menus.length === 0 }); setMenuName(""); setShowAddMenu(false); loadMenus(); } catch (e) { alert(e.message); }
  }

  async function addItem() {
    try { await api.post(`/apps/${appId}/menus/${selected.id}/items`, newItem); setAddingItem(false); setNewItem({ itemType: "DISPLAY", label: "", inputPrompt: "", variableName: "", endMessage: "", webhookUrl: "", displayOrder: 0 }); loadMenus(); } catch (e) { alert(e.message); }
  }

  async function deleteItem(itemId) {
    if (!confirm("Delete this item?")) return;
    try { await api.delete(`/apps/${appId}/menus/${selected.id}/items/${itemId}`); loadMenus(); } catch (e) { alert(e.message); }
  }

  const typeColor = { DISPLAY: "info", INPUT: "warning", WEBHOOK: "success", END: "danger", ROUTER: "default" };
  const ni = (k) => ({ value: newItem[k], onChange: (e) => setNewItem(p => ({ ...p, [k]: e.target.value })) });

  const currentMenu = menus.find(m => m.id === selected?.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Menu Builder</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Build your USSD menu flow visually</p>
        </div>
        <button style={S.btn()} onClick={() => setShowAddMenu(true)}>+ Add menu</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        {/* Menu list */}
        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 8 }}>Menus</p>
          {showAddMenu && (
            <div style={{ marginBottom: 12 }}>
              <input style={S.input} placeholder="Menu name" value={menuName} onChange={e => setMenuName(e.target.value)} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button style={S.btnSm("primary")} onClick={addMenu}>Add</button>
                <button style={S.btnSm()} onClick={() => setShowAddMenu(false)}>×</button>
              </div>
            </div>
          )}
          {menus.map(m => (
            <div key={m.id} onClick={() => setSelected(m)}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, background: selected?.id === m.id ? "var(--color-background-secondary)" : "transparent", fontWeight: selected?.id === m.id ? 500 : 400, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              {m.root && <span title="Root menu" style={{ fontSize: 10 }}>★</span>}
              {m.name}
            </div>
          ))}
          {menus.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No menus yet</p>}
        </div>

        {/* Menu items */}
        <div style={S.card}>
          {!selected ? (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "2rem" }}>Select a menu to edit its items</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{selected.name}</h3>
                  {selected.root && <span style={{ ...S.badge("info"), fontSize: 10 }}>Root menu</span>}
                </div>
                <button style={S.btnSm("primary")} onClick={() => setAddingItem(true)}>+ Add item</button>
              </div>

              {addingItem && (
                <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "1rem", marginBottom: 16 }}>
                  <p style={{ ...S.label, marginBottom: 12 }}>New menu item</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={S.label}>Type</label>
                      <select style={S.select} {...ni("itemType")}>
                        <option value="DISPLAY">Display (numbered option)</option>
                        <option value="INPUT">Input (free text)</option>
                        <option value="WEBHOOK">Webhook (call API)</option>
                        <option value="END">End (close session)</option>
                        <option value="ROUTER">Router (navigate)</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Display order</label>
                      <input style={S.input} type="number" {...ni("displayOrder")} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={S.label}>Label (shown to user)</label>
                      <input style={S.input} {...ni("label")} placeholder="e.g. Check Balance" />
                    </div>
                    {newItem.itemType === "INPUT" && <>
                      <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Input prompt</label><input style={S.input} {...ni("inputPrompt")} /></div>
                      <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Save input as variable</label><input style={S.input} {...ni("variableName")} placeholder="e.g. phone_number" /></div>
                    </>}
                    {newItem.itemType === "END" && <div style={{ gridColumn: "1/-1" }}><label style={S.label}>End message</label><input style={S.input} {...ni("endMessage")} /></div>}
                    {newItem.itemType === "WEBHOOK" && <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Webhook URL</label><input style={S.input} {...ni("webhookUrl")} /></div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={S.btnSm("primary")} onClick={addItem}>Save item</button>
                    <button style={S.btnSm()} onClick={() => setAddingItem(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Items list */}
              {currentMenu?.items?.length === 0 && !addingItem && (
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, textAlign: "center", padding: "2rem" }}>No items yet. Add items to build your USSD flow.</p>
              )}
              {currentMenu?.items?.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ ...S.badge(typeColor[item.itemType] || "default"), flexShrink: 0, fontSize: 10, marginTop: 2 }}>{item.itemType}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{item.displayOrder}. {item.label}</p>
                    {item.inputPrompt && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>Prompt: {item.inputPrompt}</p>}
                    {item.variableName && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>→ saved as <code>{item.variableName}</code></p>}
                    {item.endMessage && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{item.endMessage}</p>}
                    {item.webhookUrl && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{item.webhookUrl}</p>}
                  </div>
                  <button style={{ ...S.btnSm(), color: "var(--color-text-danger)", borderColor: "transparent" }} onClick={() => deleteItem(item.id)}>✕</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* USSD Preview */}
      {currentMenu && currentMenu.items?.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
          <div style={{ ...S.card, flex: 1 }}>
            <p style={S.label}>USSD preview</p>
            <div style={{ background: "#1a1a1a", color: "#00ff41", borderRadius: 8, padding: "1rem", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {currentMenu.items.map((item, i) => `${item.displayOrder || i + 1}. ${item.label}`).join("\n")}
            </div>
          </div>
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
          { title: "Africa's Talking setup", steps: ["Log in to your AT dashboard", "Go to USSD → Create a channel", "Enter your short code (e.g. *714#)", "Set the callback URL to the webhook URL above", "Save and activate"] },
          { title: "Hubtel setup", steps: ["Log in to your Hubtel developer portal", "Create a new USSD application", "Under webhook/callback settings, paste the URL above", "Select 'JSON' as the request format", "Save your configuration"] },
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
    { id: "webhook", label: "Integration", icon: "ti-plug" },
    { id: "settings", label: "Settings", icon: "ti-settings" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button style={{ ...S.btn(), padding: "6px 12px" }} onClick={onBack}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>{app?.name || "Loading…"}</h2>
          {app && <span style={S.badge(app.status === "ACTIVE" ? "success" : "warning")}>{app.status}</span>}
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
      {tab === "webhook" && <WebhookPage appId={appId} />}
      {tab === "settings" && app && <AppSettings app={app} />}
    </div>
  );
}

function AppSettings({ app }) {
  const [form, setForm] = useState({ name: app.name, description: app.description || "", shortCode: app.shortCode || "", status: app.status });
  const [saved, setSaved] = useState(false);

  async function save() {
    try {
      await api.put(`/apps/${app.id}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={S.label}>App name</label><input style={S.input} {...f("name")} /></div>
        <div><label style={S.label}>Description</label><input style={S.input} {...f("description")} /></div>
        <div><label style={S.label}>Short code</label><input style={S.input} {...f("shortCode")} /></div>
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
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App({ verifyMode = false, inviteMode = false }) {
  // Show email verification page when on /verify-email route
  if (verifyMode || window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmailPage />;
  }
  // Show accept invite page
  if (inviteMode || window.location.pathname.startsWith('/accept-invite')) {
    return <AcceptInvitePage />;
  }

  const [user, setUser] = useState(null);
  const [page, setPage] = useState("apps");
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/auth/me").then(u => { setUser(u); setCheckingAuth(false); }).catch(() => { localStorage.removeItem("token"); setCheckingAuth(false); });
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

  if (checkingAuth) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}><p>Loading…</p></div>;
  if (!user) return <AuthPage onLogin={u => setUser(u)} />;

  const navItems = [
    { id: "apps", label: "My apps", icon: "ti-apps" },
    { id: "team", label: "Team", icon: "ti-users" },
    { id: "docs", label: "Documentation", icon: "ti-book" },
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
            : page === "team" ? <TeamPage currentUser={user} />
            : <div><h2 style={{ fontWeight: 500 }}>Documentation</h2><p style={{ color: "var(--color-text-secondary)" }}>Coming soon.</p></div>
          }
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Heart, KeyRound, Lock, LogIn, Mail, User, UserPlus, ArrowLeft } from "lucide-react";
import "@/styles/Login.css";

type Mode = "login" | "forgot" | "change" | "register";

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}

function PasswordField({ id, label, placeholder, autoComplete, value, onChange, show, onToggle }: PasswordFieldProps) {
  return (
    <div className="login-field">
      <label className="login-label" htmlFor={id}>{label}</label>
      <div className="login-input-wrap">
        <Lock className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
        <input
          id={id} className="login-input"
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete ?? "current-password"}
          value={value} onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className={`login-eye-btn${show ? " login-eye-btn--visible" : ""}`}
          onClick={onToggle} aria-label={show ? "隐藏密码" : "显示密码"} aria-pressed={show}>
          <span className="login-eye-icon login-eye-icon--show"><Eye size={15} strokeWidth={1.8} /></span>
          <span className="login-eye-icon login-eye-icon--hide"><EyeOff size={15} strokeWidth={1.8} /></span>
        </button>
      </div>
    </div>
  );
}

function CodeField({ email, purpose, value, onChange }: {
  email: string; purpose: "register" | "reset";
  value: string; onChange: (v: string) => void;
}) {
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown() {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function sendCode() {
    setHint("");
    if (!email) { setHint("请先填写邮箱"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const json = await res.json();
      if (json.code !== 0) { setHint(json.message || "发送失败"); return; }
      setHint("验证码已发送，请查收邮件");
      startCountdown();
    } finally { setSending(false); }
  }

  return (
    <div className="login-field">
      <label className="login-label" htmlFor="otp-code">邮箱验证码</label>
      <div className="login-input-wrap">
        <KeyRound className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
        <input id="otp-code" className="login-input" type="text" placeholder="6 位验证码"
          maxLength={6} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <button type="button" className="login-send-code-btn"
          disabled={countdown > 0 || sending} onClick={sendCode}>
          {countdown > 0 ? `${countdown}s` : sending ? "发送中…" : "发送验证码"}
        </button>
      </div>
      {hint && <p className={`login-hint${hint.includes("已发送") ? " login-hint--ok" : ""}`}>{hint}</p>}
    </div>
  );
}

const TITLES: Record<Mode, string> = { login: "欢迎回来", register: "创建账号", forgot: "找回密码", change: "修改密码" };
const SUBTITLES: Record<Mode, string> = {
  login: "请登录以继续查看我们的故事",
  register: "注册账号，记录我们的每一天",
  forgot: "通过邮箱验证码重置密码",
  change: "请验证身份并设置新密码",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Mode | null;
  const validModes: Mode[] = ["login", "register", "forgot", "change"];
  const [mode, setMode] = useState<Mode>(
    tabParam && validModes.includes(tabParam) ? tabParam : "login"
  );

  useEffect(() => {
    if (tabParam && validModes.includes(tabParam)) setMode(tabParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regCode, setRegCode] = useState("");

  const [changeUsername, setChangeUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotUsername] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setShowPassword(false); setShowNewPassword(false); setShowConfirmPassword(false);
    setError(""); setSuccess(""); setMode(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!loginUsername || !loginPassword) { setError("账号和密码不能为空"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUsername, password: loginPassword }) });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message || "登录失败"); return; }
      localStorage.setItem("user", JSON.stringify(json.data.user));
      router.push("/admin");
    } catch { setError("网络异常，请稍后重试"); } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!regUsername || !regEmail || !regPassword || !regCode) { setError("所有字段均为必填"); return; }
    if (regPassword !== regConfirmPassword) { setError("两次密码不一致"); return; }
    if (regPassword.length < 6) { setError("密码不能少于 6 位"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regUsername, nickname: regNickname || regUsername, email: regEmail, password: regPassword, code: regCode }) });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message || "注册失败"); return; }
      setSuccess("注册成功！请使用新账号登录");
      setTimeout(() => switchMode("login"), 1500);
    } catch { setError("网络异常，请稍后重试"); } finally { setLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!changeUsername || !currentPassword || !newPassword || !confirmPassword) { setError("所有字段均为必填"); return; }
    if (newPassword !== confirmPassword) { setError("两次新密码不一致"); return; }
    if (newPassword.length < 6) { setError("新密码不能少于 6 位"); return; }
    setLoading(true);
    try {
      const loginRes = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: changeUsername, password: currentPassword }) });
      const loginJson = await loginRes.json();
      if (loginJson.code !== 0) { setError(loginJson.message || "账号或当前密码错误"); return; }
      const res = await fetch("/api/auth/change-password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword: currentPassword, newPassword }) });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message || "修改失败"); return; }
      switchMode("login"); setSuccess("密码修改成功，请重新登录");
    } catch { setError("网络异常，请稍后重试"); } finally { setLoading(false); }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!forgotEmail || !forgotCode || !forgotNewPassword || !forgotConfirmPassword) { setError("所有字段均为必填"); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError("两次密码不一致"); return; }
    if (forgotNewPassword.length < 6) { setError("密码不能少于 6 位"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPassword }) });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message || "重置失败"); return; }
      switchMode("login"); setSuccess("密码重置成功，请使用新密码登录");
    } catch { setError("网络异常，请稍后重试"); } finally { setLoading(false); }
  }

  void forgotUsername;

  return (
    <main className="login-shell">
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      <div className="login-card-wrap">
        {/* Heart icon */}
        <div className="login-icon-wrap" aria-hidden="true">
          <Heart className="login-heart-icon" size={24} fill="currentColor" strokeWidth={0} />
        </div>

        {/* Title */}
        <h1 className="login-title">{TITLES[mode]}</h1>
        <p className="login-subtitle">{SUBTITLES[mode]}</p>

        {/* Card */}
        <div className="login-card">
          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-field">
                <label className="login-label" htmlFor="login-username">账号</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="login-username" className="login-input" type="text" placeholder="请输入账号"
                    autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
                </div>
              </div>
              <PasswordField id="login-password" label="密码" placeholder="请输入密码" autoComplete="current-password"
                value={loginPassword} onChange={setLoginPassword} show={showPassword} onToggle={() => setShowPassword(v => !v)} />
              {error && <p className="login-error">{error}</p>}
              {success && <p className="login-success">{success}</p>}
              <button type="submit" className="login-btn-primary" disabled={loading}>
                <LogIn size={15} strokeWidth={1.8} aria-hidden="true" />{loading ? "登录中…" : "登录"}
              </button>
              <div className="login-links">
                <button type="button" className="login-link" onClick={() => switchMode("register")}>注册账号</button>
                <span className="login-link-sep" aria-hidden="true">·</span>
                <button type="button" className="login-link" onClick={() => switchMode("forgot")}>忘记密码</button>
              </div>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <form className="login-form" onSubmit={handleRegister}>
              <div className="login-field">
                <label className="login-label" htmlFor="reg-username">账号 *</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="reg-username" className="login-input" type="text" placeholder="登录账号（字母/数字）"
                    autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                </div>
              </div>
              <div className="login-field">
                <label className="login-label" htmlFor="reg-nickname">昵称</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="reg-nickname" className="login-input" type="text" placeholder="显示名称（可选）"
                    value={regNickname} onChange={(e) => setRegNickname(e.target.value)} />
                </div>
              </div>
              <div className="login-field">
                <label className="login-label" htmlFor="reg-email">邮箱 *</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="reg-email" className="login-input" type="email" placeholder="用于接收验证码"
                    autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                </div>
              </div>
              <CodeField email={regEmail} purpose="register" value={regCode} onChange={setRegCode} />
              <PasswordField id="reg-password" label="密码 *" placeholder="至少 6 位" autoComplete="new-password"
                value={regPassword} onChange={setRegPassword} show={showPassword} onToggle={() => setShowPassword(v => !v)} />
              <PasswordField id="reg-confirm-password" label="确认密码 *" placeholder="再次输入密码" autoComplete="new-password"
                value={regConfirmPassword} onChange={setRegConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
              {error && <p className="login-error">{error}</p>}
              {success && <p className="login-success">{success}</p>}
              <button type="submit" className="login-btn-primary" disabled={loading}>
                <UserPlus size={15} strokeWidth={1.8} aria-hidden="true" />{loading ? "注册中…" : "注册"}
              </button>
              <div className="login-links">
                <button type="button" className="login-link login-link--back" onClick={() => switchMode("login")}>
                  <ArrowLeft size={13} strokeWidth={1.8} />返回登录
                </button>
              </div>
            </form>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="login-field">
                <label className="login-label" htmlFor="forgot-email">注册邮箱 *</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="forgot-email" className="login-input" type="email" placeholder="输入注册时使用的邮箱"
                    autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                </div>
              </div>
              <CodeField email={forgotEmail} purpose="reset" value={forgotCode} onChange={setForgotCode} />
              <PasswordField id="forgot-new-password" label="新密码 *" placeholder="至少 6 位" autoComplete="new-password"
                value={forgotNewPassword} onChange={setForgotNewPassword} show={showNewPassword} onToggle={() => setShowNewPassword(v => !v)} />
              <PasswordField id="forgot-confirm-password" label="确认新密码 *" placeholder="再次输入新密码" autoComplete="new-password"
                value={forgotConfirmPassword} onChange={setForgotConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn-primary" disabled={loading}>
                <KeyRound size={15} strokeWidth={1.8} aria-hidden="true" />{loading ? "提交中…" : "重置密码"}
              </button>
              <div className="login-links">
                <button type="button" className="login-link login-link--back" onClick={() => switchMode("login")}>
                  <ArrowLeft size={13} strokeWidth={1.8} />返回登录
                </button>
              </div>
            </form>
          )}

          {/* ── CHANGE PASSWORD ── */}
          {mode === "change" && (
            <form className="login-form" onSubmit={handleChangePassword}>
              <div className="login-field">
                <label className="login-label" htmlFor="change-username">账号</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input id="change-username" className="login-input" type="text" placeholder="请输入账号"
                    autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    value={changeUsername} onChange={(e) => setChangeUsername(e.target.value)} />
                </div>
              </div>
              <PasswordField id="current-password" label="当前密码" placeholder="请输入当前密码" autoComplete="current-password"
                value={currentPassword} onChange={setCurrentPassword} show={showPassword} onToggle={() => setShowPassword(v => !v)} />
              <PasswordField id="new-password" label="新密码" placeholder="请输入新密码" autoComplete="new-password"
                value={newPassword} onChange={setNewPassword} show={showNewPassword} onToggle={() => setShowNewPassword(v => !v)} />
              <PasswordField id="confirm-password" label="确认新密码" placeholder="再次输入新密码" autoComplete="new-password"
                value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn-primary" disabled={loading}>
                <KeyRound size={15} strokeWidth={1.8} aria-hidden="true" />{loading ? "提交中…" : "确认修改"}
              </button>
              <div className="login-links">
                <button type="button" className="login-link login-link--back" onClick={() => switchMode("login")}>
                  <ArrowLeft size={13} strokeWidth={1.8} />返回登录
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="login-footer">每一天都值得被记住</p>
      </div>
    </main>
  );
}

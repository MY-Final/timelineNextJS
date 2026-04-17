"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Heart, KeyRound, Lock, LogIn, User } from "lucide-react";
import "@/styles/Login.css";

type Mode = "login" | "forgot" | "change";

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
      <label className="login-label" htmlFor={id}>
        {label}
      </label>
      <div className="login-input-wrap">
        <Lock className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
        <input
          id={id}
          className="login-input"
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete ?? "current-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={`login-eye-btn ${show ? "login-eye-btn--visible" : ""}`}
          onClick={onToggle}
          aria-label={show ? "隐藏密码" : "显示密码"}
          aria-pressed={show}
        >
          <span className="login-eye-icon login-eye-icon--show">
            <Eye size={15} strokeWidth={1.8} />
          </span>
          <span className="login-eye-icon login-eye-icon--hide">
            <EyeOff size={15} strokeWidth={1.8} />
          </span>
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // 显示/隐藏密码
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 登录表单
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 修改密码表单
  const [changeUsername, setChangeUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 找回密码表单
  const [forgotUsername, setForgotUsername] = useState("");

  // 全局提示
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError("");
    setMode(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!loginUsername || !loginPassword) {
      setError("账号和密码不能为空");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "登录失败");
        return;
      }
      localStorage.setItem("token", json.data.token);
      router.push("/");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!changeUsername || !currentPassword || !newPassword || !confirmPassword) {
      setError("所有字段均为必填");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码长度不能少于 6 位");
      return;
    }

    // 修改密码需要先登录获取 token
    setLoading(true);
    try {
      // 先用当前账号密码登录取 token
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: changeUsername, password: currentPassword }),
      });
      const loginJson = await loginRes.json();
      if (!loginJson.success) {
        setError(loginJson.message || "账号或当前密码错误");
        return;
      }
      const token = loginJson.data.token;

      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "修改失败");
        return;
      }
      // 修改成功后回到登录页
      switchMode("login");
      setError(""); // 清除，改为用 success 提示可扩展
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      {/* Top decorative line */}
      <div className="login-top">
        <div className="login-date-badge">
          <div className="login-badge-line" />
          <p className="login-badge-text">Our Story</p>
        </div>
      </div>

      <div className="login-center">
        {/* Heart icon */}
        <div className="login-icon-wrap" aria-hidden="true">
          <Heart className="login-heart-icon" size={28} fill="currentColor" strokeWidth={0} />
        </div>

        <p className="login-title">
          {mode === "login" && "欢迎回来"}
          {mode === "forgot" && "找回密码"}
          {mode === "change" && "修改密码"}
        </p>
        <p className="login-subtitle">
          {mode === "login" && "请登录以继续查看我们的故事"}
          {mode === "forgot" && "请联系管理员协助重置密码"}
          {mode === "change" && "请验证身份并设置新密码"}
        </p>

        {/* Card */}
        <div className="login-card">

          {/* ── LOGIN MODE ── */}
          {mode === "login" && (
            <form className="login-form" onSubmit={handleLogin}>
              {/* Username */}
              <div className="login-field">
                <label className="login-label" htmlFor="login-username">
                  账号
                </label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    id="login-username"
                    className="login-input"
                    type="text"
                    placeholder="请输入账号"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <PasswordField
                id="login-password"
                label="密码"
                placeholder="请输入密码"
                autoComplete="current-password"
                value={loginPassword}
                onChange={setLoginPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-btn-primary" disabled={loading}>
                <LogIn size={15} strokeWidth={1.8} aria-hidden="true" />
                {loading ? "登录中…" : "登录"}
              </button>

              <div className="login-links">
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode("forgot")}
                >
                  忘记密码
                </button>
                <span className="login-link-sep" aria-hidden="true">·</span>
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode("change")}
                >
                  修改密码
                </button>
              </div>
            </form>
          )}

          {/* ── FORGOT MODE ── */}
          {mode === "forgot" && (
            <form className="login-form" onSubmit={(e) => e.preventDefault()}>
              {/* Username */}
              <div className="login-field">
                <label className="login-label" htmlFor="forgot-username">
                  账号
                </label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    id="forgot-username"
                    className="login-input"
                    type="text"
                    placeholder="请输入账号"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                  />
                </div>
              </div>

              <p className="login-hint">
                提交后请联系管理员，验证身份后即可重置密码。
              </p>

              <button type="submit" className="login-btn-primary">
                <KeyRound size={15} strokeWidth={1.8} aria-hidden="true" />
                发送重置请求
              </button>

              <div className="login-links">
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode("login")}
                >
                  返回登录
                </button>
              </div>
            </form>
          )}

          {/* ── CHANGE PASSWORD MODE ── */}
          {mode === "change" && (
            <form className="login-form" onSubmit={handleChangePassword}>
              {/* Username */}
              <div className="login-field">
                <label className="login-label" htmlFor="change-username">
                  账号
                </label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    id="change-username"
                    className="login-input"
                    type="text"
                    placeholder="请输入账号"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={changeUsername}
                    onChange={(e) => setChangeUsername(e.target.value)}
                  />
                </div>
              </div>

              <PasswordField
                id="current-password"
                label="当前密码"
                placeholder="请输入当前密码"
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <PasswordField
                id="new-password"
                label="新密码"
                placeholder="请输入新密码"
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggle={() => setShowNewPassword((v) => !v)}
              />

              <PasswordField
                id="confirm-password"
                label="确认新密码"
                placeholder="再次输入新密码"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-btn-primary" disabled={loading}>
                <KeyRound size={15} strokeWidth={1.8} aria-hidden="true" />
                {loading ? "提交中…" : "确认修改"}
              </button>

              <div className="login-links">
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode("login")}
                >
                  返回登录
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="login-bottom">
        <div className="login-tagline">
          <p className="login-tagline-text">每一天都值得被记住</p>
          <div className="login-tagline-line" />
        </div>
      </div>
    </main>
  );
}

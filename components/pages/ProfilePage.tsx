"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  KeyRound,
  Shield,
  LogOut,
  ChevronRight,
  Mail,
  Calendar,
  Clock,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { getStoredUser, isAdmin } from "@/lib/auth-role";
import "@/styles/Profile.css";

interface UserProfile {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  avatar: string | null;
  role: string;
  bio: string | null;
  created_at: string;
  last_login: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  admin: "管理员",
  user: "用户",
};

type View = "menu" | "change-password";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [view, setView] = useState<View>("menu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setProfile(json.data);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    router.push("/");
  }

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPwdError("");
    setPwdSuccess("");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("所有字段均为必填");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("两次新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("新密码不能少于 6 位");
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError("新密码不能与当前密码相同");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setPwdError(json.message || "修改失败");
        return;
      }
      setPwdSuccess("密码修改成功");
      setTimeout(() => {
        resetPasswordForm();
        setView("menu");
      }, 1200);
    } catch {
      setPwdError("网络异常，请稍后重试");
    } finally {
      setPwdLoading(false);
    }
  }

  if (loading || !profile) {
    return (
      <main className="pf-shell">
        <div className="pf-center">
          <div className="pf-spinner" aria-label="加载中" />
        </div>
      </main>
    );
  }

  const initial = (profile.nickname || profile.username).charAt(0).toUpperCase();
  const adminUser = isAdmin();

  function fmtDate(s: string | null) {
    if (!s) return "未知";
    const d = new Date(s);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  }

  return (
    <main className="pf-shell">
      <div className="pf-orb pf-orb-1" aria-hidden="true" />
      <div className="pf-orb pf-orb-2" aria-hidden="true" />
      <div className="pf-orb pf-orb-3" aria-hidden="true" />

      <div className="pf-center">
        {/* ── Header card ── */}
        <motion.div
          className="pf-header-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="pf-header-bg" aria-hidden="true">
            <Heart size={80} strokeWidth={0.5} fill="currentColor" />
          </div>
          <div className="pf-avatar-ring">
            <div className="pf-avatar">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="pf-avatar-img" />
              ) : (
                <span className="pf-avatar-char">{initial}</span>
              )}
            </div>
          </div>
          <h1 className="pf-name">{profile.nickname || profile.username}</h1>
          <p className="pf-handle">@{profile.username}</p>
          <span className={`pf-badge pf-badge-${profile.role}`}>
            {ROLE_LABELS[profile.role] || profile.role}
          </span>
          {profile.bio && <p className="pf-bio">{profile.bio}</p>}
        </motion.div>

        {/* ── Menu / Password form ── */}
        <AnimatePresence mode="wait">
          {view === "menu" ? (
            <motion.div
              key="menu"
              className="pf-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            >
              {/* 个人资料 */}
              <button type="button" className="pf-row" onClick={() => setShowDetail(v => !v)}>
                <span className="pf-row-icon"><User size={17} strokeWidth={1.8} /></span>
                <span className="pf-row-body">
                  <span className="pf-row-label">个人资料</span>
                  <span className="pf-row-hint">查看详细信息</span>
                </span>
                <motion.span className="pf-row-end" animate={{ rotate: showDetail ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} strokeWidth={1.8} />
                </motion.span>
              </button>

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    className="pf-expand"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="pf-expand-inner">
                      {profile.email && (
                        <div className="pf-info-row"><Mail size={14} strokeWidth={1.8} /><span>{profile.email}</span></div>
                      )}
                      <div className="pf-info-row"><Calendar size={14} strokeWidth={1.8} /><span>注册于 {fmtDate(profile.created_at)}</span></div>
                      {profile.last_login && (
                        <div className="pf-info-row"><Clock size={14} strokeWidth={1.8} /><span>最后登录 {fmtDate(profile.last_login)}</span></div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pf-divider" />

              {/* 修改密码 */}
              <button type="button" className="pf-row" onClick={() => { resetPasswordForm(); setView("change-password"); }}>
                <span className="pf-row-icon"><KeyRound size={17} strokeWidth={1.8} /></span>
                <span className="pf-row-body">
                  <span className="pf-row-label">修改密码</span>
                  <span className="pf-row-hint">更新您的登录密码</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.8} className="pf-row-end" />
              </button>

              {/* 管理后台 */}
              {adminUser && (
                <>
                  <div className="pf-divider" />
                  <button type="button" className="pf-row" onClick={() => router.push("/admin")}>
                    <span className="pf-row-icon pf-row-icon--admin"><Shield size={17} strokeWidth={1.8} /></span>
                    <span className="pf-row-body">
                      <span className="pf-row-label">管理后台</span>
                      <span className="pf-row-hint">内容与用户管理</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.8} className="pf-row-end" />
                  </button>
                </>
              )}

              <div className="pf-divider" />

              {/* 退出登录 */}
              <button type="button" className="pf-row pf-row--danger" onClick={handleLogout} disabled={loggingOut}>
                <span className="pf-row-icon pf-row-icon--danger"><LogOut size={17} strokeWidth={1.8} /></span>
                <span className="pf-row-body">
                  <span className="pf-row-label">{loggingOut ? "退出中…" : "退出登录"}</span>
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="pwd"
              className="pf-card pf-card--form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* 返回 */}
              <button type="button" className="pf-row" onClick={() => { resetPasswordForm(); setView("menu"); }}>
                <span className="pf-row-icon"><ArrowLeft size={17} strokeWidth={1.8} /></span>
                <span className="pf-row-body">
                  <span className="pf-row-label">返回个人中心</span>
                </span>
              </button>

              <div className="pf-divider" />

              <form className="pf-form" onSubmit={handleChangePassword}>
                <div className="pf-form-title">
                  <KeyRound size={18} strokeWidth={1.8} />
                  <span>修改密码</span>
                </div>

                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-cur">当前密码</label>
                  <div className="pf-input-wrap">
                    <Lock className="pf-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                    <input id="pf-cur" className="pf-input" type={showCurrent ? "text" : "password"}
                      placeholder="请输入当前密码" autoComplete="current-password"
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                    <button type="button" className="pf-eye" onClick={() => setShowCurrent(v => !v)}
                      aria-label={showCurrent ? "隐藏" : "显示"}>
                      {showCurrent ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-new">新密码</label>
                  <div className="pf-input-wrap">
                    <Lock className="pf-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                    <input id="pf-new" className="pf-input" type={showNew ? "text" : "password"}
                      placeholder="至少 6 位" autoComplete="new-password"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button type="button" className="pf-eye" onClick={() => setShowNew(v => !v)}
                      aria-label={showNew ? "隐藏" : "显示"}>
                      {showNew ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-cfm">确认新密码</label>
                  <div className="pf-input-wrap">
                    <Lock className="pf-input-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
                    <input id="pf-cfm" className="pf-input" type={showConfirm ? "text" : "password"}
                      placeholder="再次输入新密码" autoComplete="new-password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <button type="button" className="pf-eye" onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? "隐藏" : "显示"}>
                      {showConfirm ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {pwdError && <p className="pf-msg pf-msg--err">{pwdError}</p>}
                {pwdSuccess && <p className="pf-msg pf-msg--ok"><CheckCircle2 size={14} strokeWidth={2} />{pwdSuccess}</p>}

                <button type="submit" className="pf-submit" disabled={pwdLoading}>
                  {pwdLoading ? "提交中…" : "确认修改"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="pf-footer">每一天都值得被记住</p>
      </div>
    </main>
  );
}

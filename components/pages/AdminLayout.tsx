"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Heart,
  LogOut,
  MessageSquare,
  LayoutDashboard,
  ArrowLeft,
  ExternalLink,
  Bell,
  ChevronRight,
  Users,
  Mail,
  Menu,
  Settings,
  Bot,
} from "lucide-react";
import "@/styles/Admin.css";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavItemExt extends NavItem {
  roles?: string[]; // 限制显示角色，为空则全部可见
}

const NAV_ITEMS: NavItemExt[] = [
  { label: "控制台", href: "/admin", icon: <LayoutDashboard size={16} strokeWidth={1.8} /> },
  { label: "帖子管理", href: "/admin/posts", icon: <FileText size={16} strokeWidth={1.8} /> },
  { label: "评论管理", href: "/admin/comments", icon: <MessageSquare size={16} strokeWidth={1.8} /> },
  { label: "用户管理", href: "/admin/users", icon: <Users size={16} strokeWidth={1.8} /> },
  { label: "SMTP 邮箱", href: "/admin/smtp", icon: <Mail size={16} strokeWidth={1.8} />, roles: ["superadmin"] },
  { label: "IM通知", href: "/admin/im", icon: <Bot size={16} strokeWidth={1.8} />, roles: ["superadmin"] },
  { label: "系统设置", href: "/admin/settings", icon: <Settings size={16} strokeWidth={1.8} />, roles: ["superadmin"] },
];

const BREADCRUMB_MAP: Record<string, string[]> = {
  "/admin": ["控制台"],
  "/admin/posts": ["控制台", "帖子管理"],
  "/admin/posts/new": ["控制台", "帖子管理", "新建帖子"],
  "/admin/comments": ["控制台", "评论管理"],
  "/admin/users": ["控制台", "用户管理"],
  "/admin/smtp": ["控制台", "SMTP 邮箱"],
  "/admin/im": ["控制台", "IM通知"],
  "/admin/settings": ["控制台", "系统设置"],
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = "控制台" }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("管理员");
  const [currentRole, setCurrentRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(userStr);
      setUserName(user.nickname || user.username || "Admin");
      const roleMap: Record<string, string> = {
        superadmin: "超级管理员",
        admin: "管理员",
        user: "普通用户",
      };
      setUserRole(roleMap[user.role] ?? "管理员");
      setCurrentRole(user.role ?? "");
    } catch {
      router.push("/login");
    }
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }

  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? ["控制台"];

  return (
    <div className="admin-shell">
      {/* Orbs */}
      <div className="admin-orb admin-orb-1" aria-hidden="true" />
      <div className="admin-orb admin-orb-2" aria-hidden="true" />

      {/* ── Sidebar backdrop (mobile) ── */}
      <div
        className={`admin-sidebar-backdrop${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Brand */}
        <div className="admin-brand">
          <Heart className="admin-brand-icon" size={18} fill="currentColor" strokeWidth={0} />
          <span className="admin-brand-text">管理后台</span>
        </div>

        {/* 返回前台 */}
        <div className="admin-back-wrap">
          <Link href="/" className="admin-back-btn">
            <ArrowLeft size={13} strokeWidth={1.8} />
            <span>返回前台</span>
            <ExternalLink size={11} strokeWidth={1.8} className="admin-back-ext" />
          </Link>
        </div>

        {/* Nav */}
        <nav className="admin-nav" aria-label="后台导航">
          <span className="admin-nav-section">菜单</span>
          {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(currentRole)).map((item) => (
            <button
              key={item.href}
              className={`admin-nav-item${pathname === item.href ? " active" : ""}`}
              onClick={() => { router.push(item.href); setSidebarOpen(false); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="admin-user">
          <div className="admin-user-info">
            <div className="admin-avatar" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-meta">
              <div className="admin-user-name">{userName}</div>
              <div className="admin-user-role">{userRole}</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.8} />
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        <header className="admin-header">
          {/* Hamburger (mobile only) */}
          <button className="admin-hamburger" onClick={() => setSidebarOpen(true)} aria-label="打开菜单">
            <Menu size={18} strokeWidth={1.8} />
          </button>

          {/* 面包屑 */}
          <nav className="admin-breadcrumb" aria-label="面包屑" style={{ flex: 1 }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="admin-breadcrumb-item">
                {i > 0 && <ChevronRight size={12} strokeWidth={1.8} className="admin-breadcrumb-sep" />}
                <span
                  className={i === breadcrumbs.length - 1 ? "admin-breadcrumb-current" : "admin-breadcrumb-link"}
                  style={i < breadcrumbs.length - 1 ? { cursor: "pointer" } : {}}
                  onClick={i === 0 && breadcrumbs.length > 1 ? () => router.push("/admin") : undefined}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          <div className="admin-header-actions">
            <button className="admin-header-icon-btn" title="通知" aria-label="通知">
              <Bell size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}


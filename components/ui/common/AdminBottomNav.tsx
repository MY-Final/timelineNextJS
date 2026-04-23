"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, MessageSquare, MoreHorizontal, Users, Mail, Bot, Settings, X } from "lucide-react";
import styles from "./AdminBottomNav.module.css";
import { getStoredUser, type StoredUser } from "@/lib/auth-role";

const PRIMARY_TABS = [
  { label: "控制台", href: "/admin", icon: LayoutDashboard },
  { label: "帖子", href: "/admin/posts", icon: FileText },
  { label: "评论", href: "/admin/comments", icon: MessageSquare },
];

interface DrawerItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  roles?: string[];
}

const DRAWER_ITEMS: DrawerItem[] = [
  { label: "用户管理", href: "/admin/users", icon: Users },
  { label: "SMTP 邮箱", href: "/admin/smtp", icon: Mail, roles: ["superadmin"] },
  { label: "IM通知", href: "/admin/im", icon: Bot, roles: ["superadmin"] },
  { label: "系统设置", href: "/admin/settings", icon: Settings, roles: ["superadmin"] },
];

const HIDDEN_PATHS = ["/admin/posts/new"];

export default function AdminBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  if (!mounted) return null;
  if (!pathname.startsWith("/admin")) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const role = user?.role ?? "";
  const filteredDrawer = DRAWER_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const isMoreActive = filteredDrawer.some((item) => pathname === item.href);

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className={styles.overlay}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`${styles.drawer}${drawerOpen ? ` ${styles.drawerOpen}` : ""}`}
        role="dialog"
        aria-label="更多菜单"
        aria-hidden={!drawerOpen}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>更多</span>
          <button
            className={styles.drawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.drawerList}>
          {filteredDrawer.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.drawerItem}${active ? ` ${styles.drawerItemActive}` : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav className={styles.nav} aria-label="后台底部导航">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab}${active ? ` ${styles.active}` : ""}`}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.iconWrap}>
                <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                {active && <span className={styles.indicator} aria-hidden="true" />}
              </span>
              <span className={styles.label}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          className={`${styles.tab}${isMoreActive ? ` ${styles.active}` : ""}`}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="更多"
          aria-expanded={drawerOpen}
        >
          <span className={styles.iconWrap}>
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2 : 1.5} aria-hidden="true" />
            {isMoreActive && <span className={styles.indicator} aria-hidden="true" />}
          </span>
          <span className={styles.label}>更多</span>
        </button>
      </nav>
    </>
  );
}

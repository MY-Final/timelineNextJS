"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LayoutDashboard, Tag, User } from "lucide-react";
import { getStoredUser, isAdmin, type StoredUser } from "@/lib/auth-role";
import styles from "./PublicBottomNav.module.css";

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  exact: boolean;
}

const PUBLIC_TABS: TabItem[] = [
  { label: "首页", href: "/", icon: Home, exact: true },
  { label: "故事", href: "/timeline", icon: BookOpen, exact: false },
  { label: "标签", href: "/tags", icon: Tag, exact: false },
];

const ADMIN_TABS: TabItem[] = [
  { label: "控制台", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "文章", href: "/admin/posts", icon: BookOpen, exact: false },
];

function useCurrentUser() {
  const [user, setUser] = useState<StoredUser | null>(null);

  const sync = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [sync]);

  return user;
}

export default function PublicBottomNav() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAdminPath = pathname.startsWith("/admin");
  const admin = user && isAdmin();
  const mainTabs = isAdminPath ? ADMIN_TABS : PUBLIC_TABS;

  // "我的" tab
  const profileHref = admin ? "/admin" : user ? "/login?tab=change" : "/login";
  const profileLabel = user ? "我的" : "登录";

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className={styles.nav} aria-label="底部导航">
      {mainTabs.map((tab) => {
        const active = isActive(tab.href, tab.exact);
        const Icon = tab.icon;
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

      {/* 我的 / 登录 */}
      <Link
        href={profileHref}
        className={`${styles.tab}${pathname === "/login" ? ` ${styles.active}` : ""}`}
        aria-label={profileLabel}
        aria-current={pathname === "/login" ? "page" : undefined}
      >
        <span className={styles.iconWrap}>
          <User size={20} strokeWidth={pathname === "/login" ? 2 : 1.5} aria-hidden="true" />
          {pathname === "/login" && <span className={styles.indicator} aria-hidden="true" />}
        </span>
        <span className={styles.label}>{profileLabel}</span>
      </Link>
    </nav>
  );
}

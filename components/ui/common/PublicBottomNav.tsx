"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Tag, User } from "lucide-react";
import { getStoredUser } from "@/lib/auth-role";
import styles from "./PublicBottomNav.module.css";

const TABS = [
  { label: "首页", href: "/", icon: Home, exact: true },
  { label: "故事", href: "/timeline", icon: BookOpen, exact: false },
  { label: "标签", href: "/tags", icon: Tag, exact: false },
];

export default function PublicBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(!!getStoredUser());
    const sync = () => setLoggedIn(!!getStoredUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  if (!mounted) return null;
  // 后台页面由 AdminBottomNav 独立处理
  if (pathname.startsWith("/admin")) return null;

  const profileHref = loggedIn ? "/profile" : "/login";
  const profileLabel = loggedIn ? "我的" : "登录";

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className={styles.nav} aria-label="底部导航">
      {TABS.map((tab) => {
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
              <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden />
              {active && <span className={styles.indicator} aria-hidden="true" />}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}

      {/* 登录 / 我的 */}
      <Link
        href={profileHref}
        className={`${styles.tab}${pathname === "/login" || pathname.startsWith("/profile") ? ` ${styles.active}` : ""}`}
        aria-label={profileLabel}
        aria-current={pathname === "/login" || pathname.startsWith("/profile") ? "page" : undefined}
      >
        <span className={styles.iconWrap}>
          <User size={20} strokeWidth={pathname === "/login" || pathname.startsWith("/profile") ? 2 : 1.5} aria-hidden />
          {(pathname === "/login" || pathname.startsWith("/profile")) && <span className={styles.indicator} aria-hidden="true" />}
        </span>
        <span className={styles.label}>{profileLabel}</span>
      </Link>
    </nav>
  );
}

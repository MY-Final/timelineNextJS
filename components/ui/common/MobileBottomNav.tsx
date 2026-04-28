"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LayoutDashboard, Tag, User } from "lucide-react";
import { getStoredUser, isAdmin, type StoredUser } from "@/lib/auth-role";
import styles from "./MobileBottomNav.module.css";

interface TabItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPaths: string[];
}

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

export default function MobileBottomNav() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAdminPath = pathname.startsWith("/admin");
  const admin = user && isAdmin();

  // Build tab list
  const tabs: TabItem[] = [];

  if (isAdminPath) {
    // Admin pages: show admin-specific tabs
    tabs.push({
      key: "admin",
      label: "控制台",
      href: "/admin",
      icon: <LayoutDashboard className={styles.tabIcon} strokeWidth={1.8} />,
      matchPaths: ["/admin"],
    });
    tabs.push({
      key: "posts",
      label: "文章",
      href: "/admin/posts",
      icon: <BookOpen className={styles.tabIcon} strokeWidth={1.8} />,
      matchPaths: ["/admin/posts"],
    });
  } else {
    // Public pages
    tabs.push({
      key: "home",
      label: "首页",
      href: "/",
      icon: <Home className={styles.tabIcon} strokeWidth={1.8} />,
      matchPaths: ["/"],
    });
    tabs.push({
      key: "timeline",
      label: "故事",
      href: "/timeline",
      icon: <BookOpen className={styles.tabIcon} strokeWidth={1.8} />,
      matchPaths: ["/timeline"],
    });
    tabs.push({
      key: "tags",
      label: "标签",
      href: "/tags",
      icon: <Tag className={styles.tabIcon} strokeWidth={1.8} />,
      matchPaths: ["/tags"],
    });
  }

  // "我的" tab — always present
  const profileHref = admin ? "/admin" : user ? "/login?tab=change" : "/login";
  tabs.push({
    key: "profile",
    label: user ? "我的" : "登录",
    href: profileHref,
    icon: <User className={styles.tabIcon} strokeWidth={1.8} />,
    matchPaths: ["/login"],
  });

  function isActive(tab: TabItem): boolean {
    if (tab.key === "home") return pathname === "/";
    return tab.matchPaths.some((p) => pathname.startsWith(p));
  }

  return (
    <nav className={styles.nav} aria-label="底部导航">
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon}
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

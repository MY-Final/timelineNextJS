"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
import { getStoredUser, isAdmin, type StoredUser } from "@/lib/auth-role";
import styles from "./SiteTopNav.module.css";

const HIDDEN_PREFIXES = ["/admin", "/login"];

export default function SiteTopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const syncUser = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setMounted(true);
    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, [syncUser]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // SSR 阶段不渲染，避免水合不匹配
  if (!mounted) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const loggedIn = !!user;
  const admin = loggedIn && isAdmin();
  const displayName = user?.nickname || user?.username || "";
  const initial = displayName.charAt(0).toUpperCase();

  const roleLabel: Record<string, string> = {
    superadmin: "超级管理员",
    admin: "管理员",
    user: "普通用户",
  };

  async function handleLogout() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("user");
      syncUser();
      router.refresh();
    }
  }

  return (
    <div className={styles.nav} aria-label="顶部导航">
      {loggedIn ? (
        <>
          {admin && (
            <Link href="/admin" className={`${styles.btn} ${styles.btnAdmin}`}>
              <LayoutDashboard size={13} strokeWidth={1.8} aria-hidden="true" />
              控制台
            </Link>
          )}

          <div className={styles.avatarWrap} ref={dropRef}>
            <button
              className={styles.avatarBtn}
              onClick={() => setOpen((v) => !v)}
              aria-label="用户菜单"
              aria-expanded={open}
            >
              <span className={styles.avatarCircle}>{initial}</span>
              <span className={styles.avatarName}>{displayName}</span>
            </button>

            {open && (
              <div className={styles.dropdown} role="menu">
                <div className={styles.dropUser}>
                  <span className={styles.dropName}>{displayName}</span>
                  <span className={styles.dropRole}>
                    {roleLabel[user!.role] ?? user!.role}
                  </span>
                </div>
                <div className={styles.dropDivider} />
                <button
                  className={styles.dropItem}
                  role="menuitem"
                  onClick={() => { setOpen(false); router.push("/login?tab=change"); }}
                >
                  <KeyRound size={13} strokeWidth={1.8} />
                  修改密码
                </button>
                <button
                  className={`${styles.dropItem} ${styles.dropItemDanger}`}
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={13} strokeWidth={1.8} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Link href="/login" className={styles.btn}>
            <LogIn size={13} strokeWidth={1.8} aria-hidden="true" />
            登录
          </Link>
          <Link href="/login?tab=register" className={`${styles.btn} ${styles.btnPrimary}`}>
            <UserPlus size={13} strokeWidth={1.8} aria-hidden="true" />
            注册
          </Link>
        </>
      )}
    </div>
  );
}


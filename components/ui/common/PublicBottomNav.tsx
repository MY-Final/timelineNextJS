"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Tag, User } from "lucide-react";
import styles from "./PublicBottomNav.module.css";

const TABS = [
  { label: "首页", href: "/", icon: Home, exact: true },
  { label: "时间线", href: "/timeline", icon: Clock, exact: false },
  { label: "标签", href: "/tags", icon: Tag, exact: false },
  { label: "我的", href: "/login", icon: User, exact: false },
];

const HIDDEN_PREFIXES = ["/admin"];

export default function PublicBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

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
              <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
              {active && <span className={styles.indicator} aria-hidden="true" />}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

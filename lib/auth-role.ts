/**
 * 客户端角色工具函数
 * 从 localStorage 读取当前登录用户信息，判断角色。
 */

export type UserRole = "superadmin" | "admin" | "user" | null;

export interface StoredUser {
  id: number;
  username: string;
  nickname?: string;
  role: string;
}

/** 读取 localStorage 中存储的用户信息，未登录返回 null */
export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

/** 返回当前用户角色，未登录返回 null */
export function getUserRole(): UserRole {
  const user = getStoredUser();
  if (!user) return null;
  return (user.role as UserRole) ?? null;
}

/** 是否是管理员（superadmin 或 admin） */
export function isAdmin(): boolean {
  const role = getUserRole();
  return role === "superadmin" || role === "admin";
}

/** 是否已登录 */
export function isLoggedIn(): boolean {
  return getStoredUser() !== null;
}

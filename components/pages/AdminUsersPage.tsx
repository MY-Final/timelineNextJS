"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import {
  Users, Plus, UserCheck, UserX, Trash2, Loader2,
  CheckSquare, Square, ChevronLeft, ChevronRight,
  ShieldCheck, ShieldOff, Search, X, Edit3,
} from "lucide-react";
import ConfirmDialog, { type ConfirmDialogProps } from "@/components/ui/common/ConfirmDialog";

// ── 类型 ──────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface Filters {
  q: string;
  role: string;
  is_active: string;
}

const EMPTY_FILTERS: Filters = { q: "", role: "", is_active: "" };

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  admin: "管理员",
  user: "普通用户",
};

const PAGE_SIZE = 20;

// ── 批量操作工具栏 ─────────────────────────────────────
function BatchToolbar({
  selectedIds, onClearSelection, onBatch, loading,
}: {
  selectedIds: number[]; onClearSelection: () => void;
  onBatch: (action: string) => void; loading: boolean;
}) {
  if (selectedIds.length === 0) return null;
  return (
    <div className="admin-batch-bar">
      <span className="admin-batch-info">已选 <strong>{selectedIds.length}</strong> 条</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("enable")}>
          <UserCheck size={13} strokeWidth={1.8} />启用
        </button>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("disable")}>
          <UserX size={13} strokeWidth={1.8} />禁用
        </button>
        <button className="admin-action-btn admin-action-btn--danger" disabled={loading} onClick={() => onBatch("delete")}>
          <Trash2 size={13} strokeWidth={1.8} />删除
        </button>
        <button className="admin-action-btn admin-action-btn--ghost" disabled={loading} onClick={onClearSelection}>
          <X size={13} strokeWidth={1.8} />取消
        </button>
      </div>
    </div>
  );
}

// ── 用户表单弹窗 ──────────────────────────────────────
interface UserFormProps {
  title: string;
  initial?: Partial<User & { password?: string }>;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  currentUserRole: string;
}

function UserFormModal({ title, initial, onClose, onSave, currentUserRole }: UserFormProps) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState(initial?.role ?? "user");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initial?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isEdit && !password) { setError("密码为必填"); return; }
    if (password && password.length < 6) { setError("密码不能少于 6 位"); return; }
    setLoading(true);
    try {
      const data: Record<string, unknown> = { username, nickname, email: email || null, phone: phone || null, role };
      if (password) data.password = password;
      await onSave(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{title}</span>
          <button className="admin-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="admin-modal-body" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <label className="admin-form-label">账号 *</label>
            <input className="admin-input" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="登录账号" required disabled={isEdit} />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">昵称</label>
            <input className="admin-input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="显示名称" />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">邮箱</label>
            <input className="admin-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱地址" />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">手机号</label>
            <input className="admin-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号码" />
          </div>
          {currentUserRole === "superadmin" && (
            <div className="admin-form-row">
              <label className="admin-form-label">角色</label>
              <select className="admin-filter-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="superadmin">超级管理员</option>
              </select>
            </div>
          )}
          <div className="admin-form-row">
            <label className="admin-form-label">{isEdit ? "新密码（留空不改）" : "密码 *"}</label>
            <input className="admin-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? "不修改请留空" : "至少 6 位"} />
          </div>
          {error && <p className="admin-form-error">{error}</p>}
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={loading}>取消</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
              {loading ? <Loader2 size={13} className="admin-upload-spin" /> : null}
              {isEdit ? "保存" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 主页面 ─────────────────────────────────────────────
export default function AdminUsersPage() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [confirm, setConfirm] = useState<Omit<ConfirmDialogProps, "onCancel"> | null>(null);
  const [formModal, setFormModal] = useState<{ mode: "new" | "edit"; user?: User } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState("admin");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      setCurrentUserRole(u.role ?? "admin");
    } catch { /* ignore */ }
  }, []);

  const fetchUsers = useCallback(async (f: Filters, pg: number) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
      if (f.q) sp.set("q", f.q);
      if (f.role) sp.set("role", f.role);
      if (f.is_active !== "") sp.set("is_active", f.is_active);
      const res = await fetch(`/api/admin/users?${sp}`);
      const json = await res.json();
      if (json.code === 0) {
        setList(json.data.list);
        setTotalPages(json.data.pagination.pages);
        setTotalCount(json.data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(filters, page), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters, page, fetchUsers]);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map(u => u.id)));
    }
  }

  async function executeBatch(action: string) {
    const ids = Array.from(selectedIds);
    if (action === "delete") {
      setConfirm({
        title: "批量删除",
        message: `确定要删除选中的 ${ids.length} 个用户吗？此操作不可撤销。`,
        onConfirm: async () => {
          setConfirm(null);
          setBatchLoading(true);
          await fetch("/api/admin/users/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) });
          setBatchLoading(false);
          setSelectedIds(new Set());
          fetchUsers(filters, page);
        },
      });
      return;
    }
    setBatchLoading(true);
    await fetch("/api/admin/users/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) });
    setBatchLoading(false);
    setSelectedIds(new Set());
    fetchUsers(filters, page);
  }

  async function toggleActive(user: User) {
    const action = user.is_active ? "禁用" : "启用";
    setConfirm({
      title: `${action}用户`,
      message: `确定要${action}用户「${user.nickname || user.username}」吗？`,
      onConfirm: async () => {
        setConfirm(null);
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !user.is_active }),
        });
        fetchUsers(filters, page);
      },
    });
  }

  async function deleteUser(user: User) {
    setConfirm({
      title: "删除用户",
      message: `确定要永久删除用户「${user.nickname || user.username}」吗？此操作不可撤销。`,
      onConfirm: async () => {
        setConfirm(null);
        await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
        fetchUsers(filters, page);
      },
    });
  }

  async function handleSaveUser(data: Record<string, unknown>) {
    if (formModal?.mode === "edit" && formModal.user) {
      const res = await fetch(`/api/admin/users/${formModal.user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
    } else {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
    }
    setFormModal(null);
    fetchUsers(filters, page);
  }

  const isDirty = Object.values(filters).some(v => v !== "");
  const allSelected = list.length > 0 && selectedIds.size === list.length;

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
      setSelectedIds(new Set());
    }
  }

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <div className="admin-pagination">
        <span className="admin-pagination-info">共 {totalCount} 条，第 {page}/{totalPages} 页</span>
        <div className="admin-pagination-btns">
          <button className="admin-action-btn" disabled={page === 1} onClick={() => goToPage(page - 1)}>
            <ChevronLeft size={13} />
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="admin-pagination-ellipsis">…</span>
            ) : (
              <button key={p} className={`admin-action-btn${page === p ? " active" : ""}`} onClick={() => goToPage(p as number)}>
                {p}
              </button>
            )
          )}
          <button className="admin-action-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="用户管理">
      {/* ── 顶部操作栏 ── */}
      <div className="admin-toolbar">
        {/* 搜索 */}
        <div className="admin-filter-group">
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted-deep)", pointerEvents: "none" }} />
            <input
              className="admin-filter-select"
              style={{ paddingLeft: 28, width: 200 }}
              placeholder="搜索账号/昵称/邮箱"
              value={filters.q}
              onChange={e => handleFilterChange("q", e.target.value)}
            />
          </div>
          <select className="admin-filter-select" value={filters.role} onChange={e => handleFilterChange("role", e.target.value)}>
            <option value="">全部角色</option>
            <option value="superadmin">超级管理员</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
          <select className="admin-filter-select" value={filters.is_active} onChange={e => handleFilterChange("is_active", e.target.value)}>
            <option value="">全部状态</option>
            <option value="true">已启用</option>
            <option value="false">已禁用</option>
          </select>
          {isDirty && (
            <button className="admin-action-btn admin-action-btn--ghost" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
              <X size={13} />重置
            </button>
          )}
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setFormModal({ mode: "new" })}>
          <Plus size={14} strokeWidth={1.8} />新建用户
        </button>
      </div>

      {/* ── 批量工具栏 ── */}
      <BatchToolbar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        onBatch={executeBatch}
        loading={batchLoading}
      />

      {/* ── 表格 ── */}
      <div className="admin-panel" style={{ padding: 0, overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>
                <button className="admin-check-btn" onClick={toggleSelectAll} title="全选/取消">
                  {allSelected ? <CheckSquare size={14} strokeWidth={1.8} /> : <Square size={14} strokeWidth={1.8} />}
                </button>
              </th>
              <th>账号 / 昵称</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0" }}>
                <Loader2 size={18} className="admin-upload-spin" style={{ opacity: 0.4 }} />
              </td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-deep)", fontSize: 13 }}>
                <Users size={28} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />暂无用户
              </td></tr>
            ) : list.map(user => (
              <tr key={user.id} className={`admin-table-row${selectedIds.has(user.id) ? " admin-table-row--selected" : ""}`}>
                <td style={{ textAlign: "center" }}>
                  <button className="admin-check-btn" onClick={() => toggleSelect(user.id)}>
                    {selectedIds.has(user.id)
                      ? <CheckSquare size={14} strokeWidth={1.8} />
                      : <Square size={14} strokeWidth={1.8} />}
                  </button>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{user.nickname || user.username}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-deep)" }}>@{user.username}</div>
                </td>
                <td style={{ fontSize: 12.5, color: "var(--muted-deep)" }}>{user.email ?? "—"}</td>
                <td>
                  <span className={`admin-status-tag ${user.role === "superadmin" ? "admin-status-tag--superadmin" : user.role === "admin" ? "admin-status-tag--admin" : "admin-status-tag--user"}`}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td>
                  <span className={`admin-status-tag ${user.is_active ? "admin-status-tag--published" : "admin-status-tag--draft"}`}>
                    {user.is_active ? "启用" : "禁用"}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted-deep)" }}>
                  {new Date(user.created_at).toLocaleDateString("zh-CN")}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="admin-action-btn" title="编辑" onClick={() => setFormModal({ mode: "edit", user })}>
                      <Edit3 size={13} strokeWidth={1.8} />
                    </button>
                    <button
                      className="admin-action-btn"
                      title={user.is_active ? "禁用" : "启用"}
                      onClick={() => toggleActive(user)}
                    >
                      {user.is_active
                        ? <UserX size={13} strokeWidth={1.8} />
                        : <UserCheck size={13} strokeWidth={1.8} />}
                    </button>
                    {user.role !== "superadmin" && (
                      <button className="admin-action-btn admin-action-btn--danger" title="删除" onClick={() => deleteUser(user)}>
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 分页 ── */}
      {renderPagination()}

      {/* ── 表单弹窗 ── */}
      {formModal && (
        <UserFormModal
          title={formModal.mode === "new" ? "新建用户" : "编辑用户"}
          initial={formModal.user}
          onClose={() => setFormModal(null)}
          onSave={handleSaveUser}
          currentUserRole={currentUserRole}
        />
      )}

      {/* ── 确认弹窗 ── */}
      {confirm && (
        <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />
      )}
    </AdminLayout>
  );
}

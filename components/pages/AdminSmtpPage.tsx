"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import {
  Mail, Plus, Trash2, Loader2, CheckSquare, Square,
  ChevronLeft, ChevronRight, X, Edit3, ToggleLeft, ToggleRight,
  Send, TestTube,
} from "lucide-react";
import ConfirmDialog, { type ConfirmDialogProps } from "@/components/ui/common/ConfirmDialog";

interface EmailAccount {
  id: number;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user_addr: string;
  from_name: string;
  is_active: boolean;
  use_for_reg: boolean;
  use_for_pwd: boolean;
  created_at: string;
}

interface Filters { q: string; is_active: string; }
const EMPTY_FILTERS: Filters = { q: "", is_active: "" };
const PAGE_SIZE = 20;

// ── 表单弹窗 ──────────────────────────────────────────
function AccountFormModal({
  title, initial, onClose, onSave,
}: {
  title: string;
  initial?: Partial<EmailAccount & { password?: string }>;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    host: initial?.host ?? "smtp.qq.com",
    port: String(initial?.port ?? 465),
    secure: initial?.secure ?? true,
    user_addr: initial?.user_addr ?? "",
    password: "",
    from_name: initial?.from_name ?? "",
    is_active: initial?.is_active ?? true,
    use_for_reg: initial?.use_for_reg ?? false,
    use_for_pwd: initial?.use_for_pwd ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initial?.id;

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isEdit && !form.password) { setError("密码/授权码为必填"); return; }
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        ...form,
        port: parseInt(form.port),
      };
      if (!data.password) delete data.password;
      await onSave(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{title}</span>
          <button className="admin-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="admin-modal-body" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <label className="admin-form-label">账号名称 *</label>
            <input className="admin-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="如：主发件箱" required />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">SMTP 服务器 *</label>
            <input className="admin-input" value={form.host} onChange={e => set("host", e.target.value)} placeholder="smtp.qq.com" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="admin-form-row">
              <label className="admin-form-label">端口 *</label>
              <input className="admin-input" type="number" value={form.port} onChange={e => set("port", e.target.value)} placeholder="465" required />
            </div>
            <div className="admin-form-row">
              <label className="admin-form-label">加密方式</label>
              <select className="admin-filter-select" value={form.secure ? "ssl" : "tls"} onChange={e => set("secure", e.target.value === "ssl")}>
                <option value="ssl">SSL/TLS（推荐）</option>
                <option value="tls">STARTTLS</option>
              </select>
            </div>
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">发件邮箱地址 *</label>
            <input className="admin-input" type="email" value={form.user_addr} onChange={e => set("user_addr", e.target.value)} placeholder="xxx@qq.com" required />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">{isEdit ? "授权码/密码（留空不改）" : "授权码/密码 *"}</label>
            <input className="admin-input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder={isEdit ? "不修改请留空" : "QQ邮箱请填授权码"} />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">发件人名称</label>
            <input className="admin-input" value={form.from_name} onChange={e => set("from_name", e.target.value)} placeholder="Our Story" />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.use_for_reg} onChange={e => set("use_for_reg", e.target.checked)} />
              用于注册验证
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.use_for_pwd} onChange={e => set("use_for_pwd", e.target.checked)} />
              用于找回密码
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />
              启用此账号
            </label>
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

// ── 测试发送弹窗 ──────────────────────────────────────────
function TestSendModal({
  accounts, onClose,
}: {
  accounts: EmailAccount[];
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ? String(accounts[0].id) : "");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !to) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/admin/email-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: parseInt(accountId), to }),
      });
      const json = await res.json();
      setResult({ ok: json.code === 0, msg: json.code === 0 ? "发送成功！请检查收件箱。" : (json.message || "发送失败") });
    } catch {
      setResult({ ok: false, msg: "网络异常，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">测试发送邮件</span>
          <button className="admin-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="admin-modal-body" onSubmit={handleSend}>
          <div className="admin-form-row">
            <label className="admin-form-label">选择发件账号 *</label>
            <select className="admin-input" value={accountId} onChange={e => setAccountId(e.target.value)} required>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}（{acc.user_addr}）{!acc.is_active ? "[已停用]" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">收件人邮箱 *</label>
            <input
              className="admin-input"
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="test@example.com"
              required
            />
          </div>
          {result && (
            <p style={{ fontSize: 13, margin: 0, color: result.ok ? "#27ae60" : "#c0392b", textAlign: "center" }}>
              {result.ok ? "✅ " : "❌ "}{result.msg}
            </p>
          )}
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>关闭</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={loading || accounts.length === 0}>
              {loading ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} />}
              {loading ? "发送中…" : "发送测试邮件"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 主页面 ─────────────────────────────────────────────
export default function AdminSmtpPage() {
  const [list, setList] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [confirm, setConfirm] = useState<Omit<ConfirmDialogProps, "onCancel"> | null>(null);
  const [formModal, setFormModal] = useState<{ mode: "new" | "edit"; account?: EmailAccount } | null>(null);
  const [testModal, setTestModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAccounts = useCallback(async (f: Filters, pg: number) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
      if (f.q) sp.set("q", f.q);
      if (f.is_active !== "") sp.set("is_active", f.is_active);
      const res = await fetch(`/api/admin/email-accounts?${sp}`);
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
    debounceRef.current = setTimeout(() => fetchAccounts(filters, page), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters, page, fetchAccounts]);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1); setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map(a => a.id)));
  }

  async function executeBatch(action: string) {
    const ids = Array.from(selectedIds);
    if (action === "delete") {
      setConfirm({
        title: "批量删除",
        message: `确定要删除选中的 ${ids.length} 个邮箱账号吗？`,
        onConfirm: async () => {
          setConfirm(null); setBatchLoading(true);
          await fetch("/api/admin/email-accounts/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) });
          setBatchLoading(false); setSelectedIds(new Set()); fetchAccounts(filters, page);
        },
      });
      return;
    }
    setBatchLoading(true);
    await fetch("/api/admin/email-accounts/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) });
    setBatchLoading(false); setSelectedIds(new Set()); fetchAccounts(filters, page);
  }

  async function toggleActive(account: EmailAccount) {
    await fetch(`/api/admin/email-accounts/${account.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !account.is_active }),
    });
    fetchAccounts(filters, page);
  }

  async function deleteAccount(account: EmailAccount) {
    setConfirm({
      title: "删除邮笱账号",
      message: `确定要删除「${account.name}」吗？`,
      onConfirm: async () => {
        setConfirm(null);
        await fetch(`/api/admin/email-accounts/${account.id}`, { method: "DELETE" });
        fetchAccounts(filters, page);
      },
    });
  }

  async function handleSave(data: Record<string, unknown>) {
    if (formModal?.mode === "edit" && formModal.account) {
      const res = await fetch(`/api/admin/email-accounts/${formModal.account.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
    } else {
      const res = await fetch("/api/admin/email-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
    }
    setFormModal(null);
    fetchAccounts(filters, page);
  }

  const isDirty = Object.values(filters).some(v => v !== "");
  const allSelected = list.length > 0 && selectedIds.size === list.length;

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages) { setPage(p); setSelectedIds(new Set()); }
  }

  return (
    <AdminLayout title="SMTP 邮箱管理">
      {/* 说明卡片 */}
      <div className="admin-panel" style={{ marginBottom: 16, padding: "12px 16px", background: "var(--rose-50, #fff5f7)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Mail size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--muted-deep)" }} />
          <div style={{ fontSize: 13, color: "var(--muted-deep)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>SMTP 邮箱管理</strong>
            <br />
            添加 QQ 邮箱等 SMTP 账号，用于发送注册验证码和找回密码验证码。<br />
            QQ 邮箱请使用<strong>授权码</strong>而非登录密码。每封验证码邮件有效期 <strong>5 分钟</strong>，格式为 6 位大写字母+数字。<br />
            可配置多个账号，分别指定用于注册验证或找回密码，系统将自动选择启用的账号发送。
          </div>
        </div>
      </div>

      {/* ── 顶部操作栏 ── */}
      <div className="admin-toolbar">
        <div className="admin-filter-group">
          <div style={{ position: "relative" }}>
            <input
              className="admin-filter-select"
              style={{ paddingLeft: 10, width: 200 }}
              placeholder="搜索名称/邮箱"
              value={filters.q}
              onChange={e => handleFilterChange("q", e.target.value)}
            />
          </div>
          <select className="admin-filter-select" value={filters.is_active} onChange={e => handleFilterChange("is_active", e.target.value)}>
            <option value="">全部状态</option>
            <option value="true">已启用</option>
            <option value="false">已停用</option>
          </select>
          {isDirty && (
            <button className="admin-action-btn admin-action-btn--ghost" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
              <X size={13} />重置
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="admin-btn admin-btn--ghost" onClick={() => setTestModal(true)}>
            <TestTube size={14} strokeWidth={1.8} />测试发送
          </button>
          <button className="admin-btn admin-btn--primary" onClick={() => setFormModal({ mode: "new" })}>
            <Plus size={14} strokeWidth={1.8} />添加邮箱账号
          </button>
        </div>
      </div>

      {/* 批量工具栏 */}
      {selectedIds.size > 0 && (
        <div className="admin-batch-bar">
          <span className="admin-batch-info">已选 <strong>{selectedIds.size}</strong> 条</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="admin-action-btn" disabled={batchLoading} onClick={() => executeBatch("enable")}><ToggleRight size={13} />启用</button>
            <button className="admin-action-btn" disabled={batchLoading} onClick={() => executeBatch("disable")}><ToggleLeft size={13} />停用</button>
            <button className="admin-action-btn admin-action-btn--danger" disabled={batchLoading} onClick={() => executeBatch("delete")}><Trash2 size={13} />删除</button>
            <button className="admin-action-btn admin-action-btn--ghost" onClick={() => setSelectedIds(new Set())}><X size={13} />取消</button>
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="admin-panel" style={{ padding: 0, overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>
                <button className="admin-check-btn" onClick={toggleSelectAll}>
                  {allSelected ? <CheckSquare size={14} strokeWidth={1.8} /> : <Square size={14} strokeWidth={1.8} />}
                </button>
              </th>
              <th>名称 / 邮箱</th>
              <th>SMTP 配置</th>
              <th>用途</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0" }}>
                <Loader2 size={18} className="admin-upload-spin" style={{ opacity: 0.4 }} />
              </td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-deep)", fontSize: 13 }}>
                <Mail size={28} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />暂无邮箱账号
              </td></tr>
            ) : list.map(acc => (
              <tr key={acc.id} className={`admin-table-row${selectedIds.has(acc.id) ? " admin-table-row--selected" : ""}`}>
                <td style={{ textAlign: "center" }}>
                  <button className="admin-check-btn" onClick={() => toggleSelect(acc.id)}>
                    {selectedIds.has(acc.id) ? <CheckSquare size={14} strokeWidth={1.8} /> : <Square size={14} strokeWidth={1.8} />}
                  </button>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{acc.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-deep)" }}>{acc.user_addr}</div>
                  {acc.from_name && <div style={{ fontSize: 11, color: "var(--muted)" }}>发件人：{acc.from_name}</div>}
                </td>
                <td style={{ fontSize: 12.5, color: "var(--muted-deep)" }}>
                  {acc.host}:{acc.port} <span style={{ fontSize: 11 }}>({acc.secure ? "SSL" : "TLS"})</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {acc.use_for_reg && <span className="admin-status-tag admin-status-tag--published">注册验证</span>}
                    {acc.use_for_pwd && <span className="admin-status-tag admin-status-tag--public">找回密码</span>}
                    {!acc.use_for_reg && !acc.use_for_pwd && <span style={{ color: "var(--muted)", fontSize: 12 }}>未指定</span>}
                  </div>
                </td>
                <td>
                  <span className={`admin-status-tag ${acc.is_active ? "admin-status-tag--published" : "admin-status-tag--draft"}`}>
                    {acc.is_active ? "启用" : "停用"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="admin-action-btn" title="编辑" onClick={() => setFormModal({ mode: "edit", account: acc })}>
                      <Edit3 size={13} strokeWidth={1.8} />
                    </button>
                    <button className="admin-action-btn" title={acc.is_active ? "停用" : "启用"} onClick={() => toggleActive(acc)}>
                      {acc.is_active ? <ToggleLeft size={13} strokeWidth={1.8} /> : <ToggleRight size={13} strokeWidth={1.8} />}
                    </button>
                    <button className="admin-action-btn admin-action-btn--danger" title="删除" onClick={() => deleteAccount(acc)}>
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <span className="admin-pagination-info">共 {totalCount} 条</span>
          <div className="admin-pagination-btns">
            <button className="admin-action-btn" disabled={page === 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={13} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`admin-action-btn${page === p ? " active" : ""}`} onClick={() => goToPage(p)}>{p}</button>
            ))}
            <button className="admin-action-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      )}

      {/* 表单弹窗 */}
      {formModal && (
        <AccountFormModal
          title={formModal.mode === "new" ? "添加邮箱账号" : "编辑邮箱账号"}
          initial={formModal.account}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}

      {testModal && (
        <TestSendModal accounts={list} onClose={() => setTestModal(false)} />
      )}
    </AdminLayout>
  );
}

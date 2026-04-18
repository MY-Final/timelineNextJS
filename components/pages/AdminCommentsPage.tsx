"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { MessageSquare, Search, Trash2, EyeOff, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CommentRow {
  id: number;
  post_id: number;
  post_title: string;
  parent_id: number | null;
  content: string;
  like_count: number;
  status: "visible" | "hidden";
  created_at: string;
  user_id: number;
  username: string;
  nickname: string;
}

const PAGE_SIZE = 20;

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [inputKeyword, setInputKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchComments = useCallback(async (pg: number, kw: string, st: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pg) });
      if (kw) params.set("keyword", kw);
      if (st) params.set("status", st);
      const res = await fetch(`/api/admin/comments?${params}`);
      const json = await res.json();
      if (json.code === 0) {
        setComments(json.data.list);
        setTotalPages(json.data.pagination.pages || 1);
        setTotalCount(json.data.pagination.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(page, keyword, statusFilter); }, [fetchComments, page, keyword, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setKeyword(inputKeyword);
  }

  function handleStatusFilterChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  async function handleToggleStatus(comment: CommentRow) {
    const newStatus = comment.status === "visible" ? "hidden" : "visible";
    const res = await fetch(`/api/admin/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.code === 0) {
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, status: newStatus } : c));
    } else {
      alert(json.message ?? "操作失败");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定永久删除这条评论吗？此操作不可撤销。")) return;
    const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.code === 0) {
      setComments(prev => prev.filter(c => c.id !== id));
      setTotalCount(t => Math.max(0, t - 1));
    } else {
      alert(json.message ?? "删除失败");
    }
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <AdminLayout title="评论管理">
      <div className="admin-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            <MessageSquare size={15} strokeWidth={1.8} />
            评论列表
            <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-muted)" }}>共 {totalCount} 条</span>
          </h2>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={e => handleStatusFilterChange(e.target.value)}
              className="admin-input"
              style={{ height: 32, padding: "0 8px", fontSize: 13, minWidth: 100 }}
            >
              <option value="">全部状态</option>
              <option value="visible">显示</option>
              <option value="hidden">已隐藏</option>
            </select>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
              <input
                className="admin-input"
                style={{ height: 32, padding: "0 10px", fontSize: 13, width: 180 }}
                placeholder="搜索内容/用户名…"
                value={inputKeyword}
                onChange={e => setInputKeyword(e.target.value)}
              />
              <button type="submit" className="admin-action-btn admin-action-btn--primary" style={{ height: 32, padding: "0 12px", gap: 4 }}>
                <Search size={13} />
                搜索
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", opacity: 0.4 }} />
          </div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>
            暂无评论
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>所属帖子</th>
                <th>评论者</th>
                <th>内容</th>
                <th>时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id}>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    #{c.id}
                    {c.parent_id && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: "var(--text-muted)", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "1px 4px" }}>
                        回复
                      </span>
                    )}
                  </td>
                  <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {c.post_title}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{c.nickname || c.username}</div>
                    {c.nickname && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{c.username}</div>}
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.status === "hidden" ? "var(--text-muted)" : undefined }}>
                      {c.status === "hidden" && <EyeOff size={11} style={{ marginRight: 4, verticalAlign: "middle", opacity: 0.5 }} />}
                      {c.content}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {formatDate(c.created_at)}
                  </td>
                  <td>
                    <span className={`admin-badge ${c.status === "visible" ? "admin-badge--published" : "admin-badge--draft"}`}>
                      {c.status === "visible" ? "显示" : "隐藏"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="admin-action-btn"
                        onClick={() => handleToggleStatus(c)}
                        title={c.status === "visible" ? "隐藏评论" : "恢复显示"}
                      >
                        {c.status === "visible" ? <EyeOff size={13} /> : <Eye size={13} />}
                        {c.status === "visible" ? "隐藏" : "显示"}
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--danger"
                        onClick={() => handleDelete(c.id)}
                        title="永久删除"
                      >
                        <Trash2 size={13} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="admin-pagination" style={{ marginTop: 16 }}>
            <span className="admin-pagination-info">共 {totalCount} 条，第 {page} / {totalPages} 页</span>
            <div className="admin-pagination-btns">
              <button className="admin-action-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="admin-action-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


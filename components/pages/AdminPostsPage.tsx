"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import {
  FileText, Plus, Eye, EyeOff, Trash2, Loader2,
  ArrowUp, ArrowDown, Edit3, CheckSquare, Square,
  BookOpen, BookX, ChevronLeft, ChevronRight,
} from "lucide-react";
import ConfirmDialog, { type ConfirmDialogProps } from "@/components/ui/common/ConfirmDialog";
import PostDetailModal from "@/components/ui/common/PostDetailModal";
import AdminNewPostModal from "@/components/ui/common/AdminNewPostModal";
import PostFilterBar, { type PostFilters, EMPTY_FILTERS } from "@/components/ui/common/PostFilterBar";
import dynamic from "next/dynamic";

const EditPostModal = dynamic(() => import("@/components/ui/common/EditPostModal"), { ssr: false });

interface Post {
  id: number;
  title: string;
  author_username: string;
  author_nickname: string;
  status: string;
  is_public: boolean;
  image_count: number;
  created_at: string;
  event_date: string | null;
}

type SortDir = "asc" | "desc";

// ─── 批量操作工具栏 ─────────────────────────────────────
function BatchToolbar({
  selectedIds,
  onClearSelection,
  onBatch,
  loading,
}: {
  selectedIds: number[];
  onClearSelection: () => void;
  onBatch: (action: string) => void;
  loading: boolean;
}) {
  if (selectedIds.length === 0) return null;
  return (
    <div className="admin-batch-bar">
      <span className="admin-batch-info">已选 <strong>{selectedIds.length}</strong> 条</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("publish")}>
          <BookOpen size={13} strokeWidth={1.8} />发布
        </button>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("unpublish")}>
          <BookX size={13} strokeWidth={1.8} />下架
        </button>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("show")}>
          <Eye size={13} strokeWidth={1.8} />公开
        </button>
        <button className="admin-action-btn" disabled={loading} onClick={() => onBatch("hide")}>
          <EyeOff size={13} strokeWidth={1.8} />隐藏
        </button>
        <button className="admin-action-btn admin-action-btn--danger" disabled={loading} onClick={() => onBatch("delete")}>
          <Trash2 size={13} strokeWidth={1.8} />删除
        </button>
      </div>
      <button className="admin-action-btn" onClick={onClearSelection} style={{ marginLeft: "auto" }}>取消选择</button>
    </div>
  );
}

// ─── 主页面 ─────────────────────────────────────────────
export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialog, setDialog] = useState<Omit<ConfirmDialogProps, "onCancel"> | null>(null);
  const [filters, setFilters] = useState<PostFilters>({ ...EMPTY_FILTERS });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildQuery(f: PostFilters, pg: number) {
    const p = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pg) });
    if (f.status)       p.set("status", f.status);
    if (f.is_public)    p.set("is_public", f.is_public);
    if (f.q)            p.set("q", f.q);
    if (f.created_from) p.set("created_from", f.created_from);
    if (f.created_to)   p.set("created_to", f.created_to);
    if (f.event_from)   p.set("event_from", f.event_from);
    if (f.event_to)     p.set("event_to", f.event_to);
    return p.toString();
  }

  const fetchPosts = useCallback(async (f: PostFilters = EMPTY_FILTERS, pg = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/posts?${buildQuery(f, pg)}`);
      const json = await res.json();
      if (json.code === 0) {
        setPosts(json.data.list);
        setTotalPages(json.data.pagination.pages || 1);
        setTotalCount(json.data.pagination.total || 0);
      } else {
        setError(json.message || "加载失败");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(filters, page); }, [fetchPosts]);

  function handleFilterChange(next: PostFilters) {
    setFilters(next);
    setPage(1);
    setSelectedIds(new Set());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPosts(next, 1), 350);
  }

  function goToPage(pg: number) {
    const clamped = Math.max(1, Math.min(pg, totalPages));
    setPage(clamped);
    setSelectedIds(new Set());
    fetchPosts(filters, clamped);
  }

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [posts, sortDir]);

  function confirmDialog(opts: Omit<ConfirmDialogProps, "onCancel">) { setDialog(opts); }
  function closeDialog() { setDialog(null); }

  async function doDelete(id: number) {
    closeDialog();
    setLoadingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.code === 0) setPosts((prev) => prev.filter((p) => p.id !== id));
      else confirmDialog({ title: "删除失败", message: json.message, confirmText: "好的", danger: false, onConfirm: closeDialog });
    } catch {
      confirmDialog({ title: "网络异常", message: "请稍后重试", confirmText: "好的", danger: false, onConfirm: closeDialog });
    } finally {
      setLoadingId(null);
    }
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    confirmDialog({ title: "确认删除帖子", message: "删除后无法恢复，确认继续？", confirmText: "删除", danger: true, onConfirm: () => doDelete(id) });
  }

  async function handleToggleVisibility(e: React.MouseEvent, post: Post) {
    e.stopPropagation();
    setLoadingId(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !post.is_public }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_public: json.data.is_public } : p)));
      } else {
        confirmDialog({ title: "操作失败", message: json.message, confirmText: "好的", danger: false, onConfirm: closeDialog });
      }
    } catch {
      confirmDialog({ title: "网络异常", message: "请稍后重试", confirmText: "好的", danger: false, onConfirm: closeDialog });
    } finally {
      setLoadingId(null);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allSelected = sortedPosts.length > 0 && sortedPosts.every((p) => selectedIds.has(p.id));
  const someSelected = !allSelected && sortedPosts.some((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedPosts.map((p) => p.id)));
  }

  async function executeBatch(action: string) {
    closeDialog();
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/posts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setSelectedIds(new Set());
        await fetchPosts(filters, page);
      } else {
        confirmDialog({ title: "批量操作失败", message: json.message, confirmText: "好的", danger: false, onConfirm: closeDialog });
      }
    } catch {
      confirmDialog({ title: "网络异常", message: "请稍后重试", confirmText: "好的", danger: false, onConfirm: closeDialog });
    } finally {
      setBatchLoading(false);
    }
  }

  function handleBatch(action: string) {
    if (action === "delete") {
      confirmDialog({
        title: "批量删除帖子",
        message: `即将删除 ${selectedIds.size} 条帖子，删除后无法恢复，确认继续？`,
        confirmText: "删除",
        danger: true,
        onConfirm: () => executeBatch("delete"),
      });
    } else {
      executeBatch(action);
    }
  }

  function formatDate(iso: string | null | undefined) {
    return iso ? String(iso).slice(0, 10) : "-";
  }

  return (
    <AdminLayout title="帖子管理">
      <div className="admin-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            <FileText size={15} strokeWidth={1.8} />
            帖子列表
          </h2>
          <button className="admin-action-btn admin-action-btn--primary" onClick={() => setShowNewPost(true)}>
            <Plus size={14} strokeWidth={2} style={{ marginRight: 4 }} />
            新建帖子
          </button>
        </div>

        <PostFilterBar filters={filters} onChange={handleFilterChange} />

        <BatchToolbar
          selectedIds={[...selectedIds]}
          onClearSelection={() => setSelectedIds(new Set())}
          onBatch={handleBatch}
          loading={batchLoading}
        />

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0", color: "#b07090", fontSize: 13 }}>
            <Loader2 size={16} className="admin-upload-spin" />
            加载中...
          </div>
        ) : error ? (
          <p style={{ color: "#d44040", fontSize: 13, padding: "12px 0" }}>{error}</p>
        ) : posts.length === 0 ? (
          <p style={{ color: "#b07090", fontSize: 13, padding: "24px 0", textAlign: "center" }}>暂无帖子</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <button className="admin-check-btn" onClick={toggleSelectAll} aria-label={allSelected ? "取消全选" : "全选"}>
                    {allSelected
                      ? <CheckSquare size={15} strokeWidth={1.8} style={{ color: "#e11d48" }} />
                      : someSelected
                        ? <CheckSquare size={15} strokeWidth={1.8} style={{ color: "#fda4af" }} />
                        : <Square size={15} strokeWidth={1.8} />}
                  </button>
                </th>
                <th>ID</th>
                <th>标题</th>
                <th>作者</th>
                <th>图片</th>
                <th>状态</th>
                <th>可见性</th>
                <th>
                  <button className="admin-sort-btn" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
                    创建时间
                    {sortDir === "desc" ? <ArrowDown size={11} strokeWidth={2} style={{ marginLeft: 3 }} /> : <ArrowUp size={11} strokeWidth={2} style={{ marginLeft: 3 }} />}
                  </button>
                </th>
                <th>实际日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post) => (
                <tr
                  key={post.id}
                  className={`admin-table-row--clickable${selectedIds.has(post.id) ? " admin-table-row--selected" : ""}`}
                  onClick={() => setDetailId(post.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="admin-check-btn" onClick={() => toggleSelect(post.id)}>
                      {selectedIds.has(post.id)
                        ? <CheckSquare size={15} strokeWidth={1.8} style={{ color: "#e11d48" }} />
                        : <Square size={15} strokeWidth={1.8} />}
                    </button>
                  </td>
                  <td>#{post.id}</td>
                  <td>{post.title || <span style={{ opacity: 0.4 }}>（无标题）</span>}</td>
                  <td>{post.author_nickname || post.author_username}</td>
                  <td>{post.image_count}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${post.status}`}>
                      {post.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${post.is_public ? "admin-badge--published" : "admin-badge--draft"}`}>
                      {post.is_public ? "公开" : "隐藏"}
                    </span>
                  </td>
                  <td>{formatDate(post.created_at)}</td>
                  <td>{formatDate(post.event_date)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="admin-action-btn" title="编辑" disabled={loadingId === post.id} onClick={(e) => { e.stopPropagation(); setEditId(post.id); }}>
                        <Edit3 size={13} strokeWidth={1.8} />
                      </button>
                      <button className="admin-action-btn" title={post.is_public ? "设为隐藏" : "设为公开"} disabled={loadingId === post.id} onClick={(e) => handleToggleVisibility(e, post)}>
                        {post.is_public ? <EyeOff size={13} strokeWidth={1.8} /> : <Eye size={13} strokeWidth={1.8} />}
                      </button>
                      <button className="admin-action-btn admin-action-btn--danger" title="删除" disabled={loadingId === post.id} onClick={(e) => handleDelete(e, post.id)}>
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 分页 */}
        {!loading && totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">共 {totalCount} 条，第 {page} / {totalPages} 页</span>
            <div className="admin-pagination-btns">
              <button className="admin-action-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`admin-action-btn${item === page ? " admin-action-btn--primary" : ""}`}
                      onClick={() => goToPage(item as number)}
                    >
                      {item}
                    </button>
                  )
                )}
              <button className="admin-action-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId !== null && (
        <PostDetailModal postId={detailId} onClose={() => setDetailId(null)} onUpdated={() => fetchPosts(filters, page)} />
      )}
      {editId !== null && (
        <EditPostModal postId={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); fetchPosts(filters, page); }} />
      )}
      {showNewPost && (
        <AdminNewPostModal onClose={() => setShowNewPost(false)} onSuccess={() => { setShowNewPost(false); setPage(1); fetchPosts(filters, 1); }} />
      )}
      {dialog && <ConfirmDialog {...dialog} onCancel={closeDialog} />}
    </AdminLayout>
  );
}


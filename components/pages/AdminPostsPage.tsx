"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { FileText, Plus, Eye, EyeOff, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import ConfirmDialog, { type ConfirmDialogProps } from "@/components/ui/common/ConfirmDialog";
import PostDetailModal from "@/components/ui/common/PostDetailModal";
import AdminNewPostModal from "@/components/ui/common/AdminNewPostModal";

interface Post {
  id: number;
  title: string;
  author_username: string;
  author_nickname: string;
  status: string;
  is_public: boolean;
  image_count: number;
  created_at: string;
}

type SortDir = "asc" | "desc";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialog, setDialog] = useState<Omit<ConfirmDialogProps, "onCancel"> | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts?limit=500&status=all");
      const json = await res.json();
      if (json.code === 0) setPosts(json.data.list);
      else setError(json.message || "加载失败");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [posts, sortDir]);

  function confirmDialog(opts: Omit<ConfirmDialogProps, "onCancel">) {
    setDialog(opts);
  }
  function closeDialog() {
    setDialog(null);
  }

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
    confirmDialog({
      title: "确认删除帖子",
      message: "删除后无法恢复，确认继续？",
      confirmText: "删除",
      danger: true,
      onConfirm: () => doDelete(id),
    });
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

  function formatDate(iso: string) {
    return iso ? iso.slice(0, 10) : "-";
  }

  return (
    <AdminLayout title="帖子管理">
      <div className="admin-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            <FileText size={15} strokeWidth={1.8} />
            帖子列表
          </h2>
          <button
            className="admin-action-btn admin-action-btn--primary"
            onClick={() => setShowNewPost(true)}
          >
            <Plus size={14} strokeWidth={2} style={{ marginRight: 4 }} />
            新建帖子
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0", color: "#b07090", fontSize: 13 }}>
            <Loader2 size={16} className="admin-upload-spin" />
            加载中...
          </div>
        ) : error ? (
          <p style={{ color: "#d44040", fontSize: 13, padding: "12px 0" }}>{error}</p>
        ) : posts.length === 0 ? (
          <p style={{ color: "#b07090", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            暂无帖子，点击「新建帖子」开始创作
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>作者</th>
                <th>图片</th>
                <th>状态</th>
                <th>可见性</th>
                <th>
                  <button
                    className="admin-sort-btn"
                    onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    title={sortDir === "desc" ? "当前最新优先，点击改为最早优先" : "当前最早优先，点击改为最新优先"}
                  >
                    创建时间
                    {sortDir === "desc"
                      ? <ArrowDown size={11} strokeWidth={2} style={{ marginLeft: 3 }} />
                      : <ArrowUp size={11} strokeWidth={2} style={{ marginLeft: 3 }} />
                    }
                  </button>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post) => (
                <tr
                  key={post.id}
                  className="admin-table-row--clickable"
                  onClick={() => setDetailId(post.id)}
                  title="点击查看详情"
                >
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
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="admin-action-btn"
                        title={post.is_public ? "设为隐藏" : "设为公开"}
                        disabled={loadingId === post.id}
                        onClick={(e) => handleToggleVisibility(e, post)}
                      >
                        {post.is_public ? <EyeOff size={13} strokeWidth={1.8} /> : <Eye size={13} strokeWidth={1.8} />}
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--danger"
                        title="删除"
                        disabled={loadingId === post.id}
                        onClick={(e) => handleDelete(e, post.id)}
                      >
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailId !== null && (
        <PostDetailModal
          postId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={fetchPosts}
        />
      )}

      {showNewPost && (
        <AdminNewPostModal
          onClose={() => setShowNewPost(false)}
          onSuccess={() => { setShowNewPost(false); fetchPosts(); }}
        />
      )}

      {dialog && (
        <ConfirmDialog {...dialog} onCancel={closeDialog} />
      )}
    </AdminLayout>
  );
}


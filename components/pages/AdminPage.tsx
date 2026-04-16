"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PostEditor from "@/components/ui/PostEditor";

interface PostImage {
  id: number;
  post_id: number;
  url: string;
  order: number;
}

interface Post {
  id: number;
  date: string;
  title: string;
  description: string;
  location: string;
  tags: string[];
  hidden: number;
  deleted: number;
  images: PostImage[];
}

export default function AdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchPosts = useCallback(async () => {
    const res = await fetch("/api/posts");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json() as Post[];
    setPosts(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      const { isLoggedIn } = await r.json() as { isLoggedIn: boolean };
      if (!isLoggedIn) router.push("/admin/login");
      else fetchPosts();
    });
  }, [fetchPosts, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleDelete(id: number) {
    if (!confirm("确认删除该帖子？")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    fetchPosts();
  }

  async function handleToggleHidden(id: number) {
    await fetch(`/api/posts/${id}/hide`, { method: "POST" });
    fetchPosts();
  }

  async function handleSave(data: {
    date: string; title: string; description: string;
    location: string; tags: string[]; images: string[];
  }) {
    if (editing) {
      await fetch(`/api/posts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setEditing(null);
    } else {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setCreating(false);
    }
    fetchPosts();
  }

  if (creating || editing) {
    return (
      <PostEditor
        initial={editing ? {
          date: editing.date, title: editing.title,
          description: editing.description, location: editing.location,
          tags: editing.tags, images: editing.images.map((i) => i.url),
        } : undefined}
        onSave={handleSave}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1 className="font-serif-cn">管理后台</h1>
        <div className="admin-header-actions">
          <Link href="/timeline" className="admin-btn admin-btn-secondary">← 查看时间线</Link>
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>＋ 新建帖子</button>
          <button className="admin-btn admin-btn-ghost" onClick={handleLogout}>退出</button>
        </div>
      </header>

      {loading ? (
        <p className="admin-loading">加载中…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>标题</th>
              <th>标签</th>
              <th>图片</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className={post.hidden ? "admin-row-hidden" : ""}>
                <td>{post.date}</td>
                <td>{post.title}</td>
                <td>{post.tags.join(", ")}</td>
                <td>{post.images.length}</td>
                <td>{post.hidden ? "隐藏" : "显示"}</td>
                <td className="admin-actions">
                  <button className="admin-btn admin-btn-sm" onClick={() => setEditing(post)}>编辑</button>
                  <button className="admin-btn admin-btn-sm" onClick={() => handleToggleHidden(post.id)}>
                    {post.hidden ? "取消隐藏" : "隐藏"}
                  </button>
                  <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(post.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

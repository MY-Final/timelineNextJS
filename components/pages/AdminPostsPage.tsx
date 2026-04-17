"use client";

import AdminLayout from "@/components/pages/AdminLayout";
import { FileText } from "lucide-react";

const MOCK_POSTS = [
  { id: 1, title: "春天的第一朵花", author: "final", status: "published", date: "2026-03-20" },
  { id: 2, title: "下雨天的日记", author: "final", status: "published", date: "2026-03-21" },
  { id: 3, title: "未发布的草稿", author: "final", status: "draft", date: "2026-04-01" },
];

export default function AdminPostsPage() {
  return (
    <AdminLayout title="帖子管理">
      <div className="admin-panel">
        <h2 className="admin-panel-title">
          <FileText size={15} strokeWidth={1.8} />
          帖子列表
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>作者</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_POSTS.map((post) => (
              <tr key={post.id}>
                <td>#{post.id}</td>
                <td>{post.title}</td>
                <td>{post.author}</td>
                <td>
                  <span className={`admin-badge admin-badge--${post.status}`}>
                    {post.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td>{post.date}</td>
                <td>
                  <button className="admin-action-btn">编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

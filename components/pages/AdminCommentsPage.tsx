"use client";

import AdminLayout from "@/components/pages/AdminLayout";
import { MessageSquare } from "lucide-react";

const MOCK_COMMENTS = [
  { id: 1, post: "春天的第一朵花", author: "final", content: "好美的一天～", date: "2026-03-20" },
  { id: 2, post: "下雨天的日记", author: "final", content: "雨声真的很治愈", date: "2026-03-21" },
  { id: 3, post: "下雨天的日记", author: "final", content: "下次记得拍视频", date: "2026-03-22" },
];

export default function AdminCommentsPage() {
  return (
    <AdminLayout title="评论管理">
      <div className="admin-panel">
        <h2 className="admin-panel-title">
          <MessageSquare size={15} strokeWidth={1.8} />
          评论列表
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>所属帖子</th>
              <th>评论者</th>
              <th>内容</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_COMMENTS.map((c) => (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td>{c.post}</td>
                <td>{c.author}</td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.content}
                </td>
                <td>{c.date}</td>
                <td>
                  <button className="admin-action-btn">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

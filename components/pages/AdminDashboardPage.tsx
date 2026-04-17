"use client";

import AdminLayout from "@/components/pages/AdminLayout";
import { FileText, MessageSquare, Heart, TrendingUp } from "lucide-react";

const STATS = [
  { label: "帖子总数", value: "—", icon: <FileText size={16} strokeWidth={1.8} /> },
  { label: "评论总数", value: "—", icon: <MessageSquare size={16} strokeWidth={1.8} /> },
  { label: "点赞总数", value: "—", icon: <Heart size={16} strokeWidth={0} fill="currentColor" /> },
  { label: "今日新增", value: "—", icon: <TrendingUp size={16} strokeWidth={1.8} /> },
];

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="控制台">
      <div className="admin-stats">
        {STATS.map((s) => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-label">{s.label}</div>
            <div className="admin-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">
          <TrendingUp size={15} strokeWidth={1.8} />
          欢迎回来
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--muted-foreground, #888)", lineHeight: 1.8 }}>
          这里是后台管理中心，可通过左侧菜单管理帖子与评论内容。
        </p>
      </div>
    </AdminLayout>
  );
}

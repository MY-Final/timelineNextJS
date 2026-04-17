"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { FileText, MessageSquare, Heart, TrendingUp, Loader2 } from "lucide-react";

interface Stats {
  post_total: number;
  post_today: number;
  comment_total: number;
  like_total: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => { if (json.code === 0) setStats(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const statItems = [
    { label: "帖子总数",  value: stats?.post_total,   icon: <FileText size={16} strokeWidth={1.8} /> },
    { label: "评论总数",  value: stats?.comment_total, icon: <MessageSquare size={16} strokeWidth={1.8} /> },
    { label: "点赞总数",  value: stats?.like_total,    icon: <Heart size={16} strokeWidth={0} fill="currentColor" /> },
    { label: "今日新增",  value: stats?.post_today,    icon: <TrendingUp size={16} strokeWidth={1.8} /> },
  ];

  return (
    <AdminLayout title="控制台">
      <div className="admin-stats">
        {statItems.map((s) => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-label">{s.label}</div>
            <div className="admin-stat-value">
              {loading ? <Loader2 size={14} className="admin-upload-spin" style={{ opacity: 0.5 }} /> : (s.value ?? "—")}
            </div>
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

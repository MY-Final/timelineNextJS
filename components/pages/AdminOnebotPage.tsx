"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { Bot, Loader2, Save, Send, ToggleLeft, ToggleRight } from "lucide-react";

interface OnebotConfig {
  enabled: boolean;
  http_url: string;
  access_token: string;
  target_qq: string;
  target_group: string;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number;
}

const DEFAULT_CONFIG: OnebotConfig = {
  enabled: false,
  http_url: "",
  access_token: "",
  target_qq: "",
  target_group: "",
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_post: true,
  email_threshold: 0,
};

// ── 开关组件 ──────────────────────────────────────────
function Toggle({
  label, description, value, onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-main)" }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "var(--muted-deep)", marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: value ? "var(--primary)" : "var(--muted-deep)", flexShrink: 0 }}
        aria-label={label}
      >
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );
}

// ── 通知状态提示 ──────────────────────────────────────
function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <span style={{ fontSize: 13, color: msg.ok ? "#27ae60" : "#c0392b" }}>
      {msg.ok ? "✅ " : "❌ "}{msg.text}
    </span>
  );
}

export default function AdminOnebotPage() {
  const [form, setForm] = useState<OnebotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/onebot");
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setForm({ ...DEFAULT_CONFIG, ...json.data });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof OnebotConfig>(key: K, value: OnebotConfig[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaveMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/onebot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.code === 0) {
        setSaveMsg({ ok: true, text: "配置已保存" });
        if (json.data) setForm({ ...DEFAULT_CONFIG, ...json.data });
      } else {
        setSaveMsg({ ok: false, text: json.message ?? "保存失败" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "网络异常" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/admin/onebot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          http_url: form.http_url,
          access_token: form.access_token,
          target_qq: form.target_qq,
          target_group: form.target_group,
        }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setTestMsg({ ok: true, text: "测试消息已发送" });
      } else {
        setTestMsg({ ok: false, text: json.message ?? "发送失败" });
      }
    } catch {
      setTestMsg({ ok: false, text: "网络异常" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="OneBot 推送">
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} className="admin-upload-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="OneBot 推送">
      <div className="admin-page-header">
        <Bot size={20} strokeWidth={1.8} />
        <h1 className="admin-page-title">OneBot 推送配置</h1>
      </div>

      <div style={{ display: "grid", gap: 20, maxWidth: 680 }}>

        {/* ── 基础配置 ────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title">基础配置</div>

          <Toggle
            label="启用 OneBot 推送"
            description="关闭后所有通知将静默，不影响业务功能"
            value={form.enabled}
            onChange={v => set("enabled", v)}
          />

          <div className="admin-form-row" style={{ marginTop: 16 }}>
            <label className="admin-form-label">OneBot HTTP 地址 *</label>
            <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 6px" }}>
              OneBot 实现的 HTTP 正向监听地址，如 http://127.0.0.1:3000
            </p>
            <input
              className="admin-input"
              type="url"
              value={form.http_url}
              onChange={e => set("http_url", e.target.value)}
              placeholder="http://127.0.0.1:3000"
            />
          </div>

          <div className="admin-form-row">
            <label className="admin-form-label">Access Token</label>
            <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 6px" }}>
              OneBot 配置的 access_token，留空则不鉴权
            </p>
            <input
              className="admin-input"
              type="password"
              value={form.access_token}
              onChange={e => set("access_token", e.target.value)}
              placeholder="留空则不使用"
              autoComplete="new-password"
            />
          </div>
        </section>

        {/* ── 推送目标 ────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title">推送目标</div>
          <p style={{ fontSize: 12, color: "var(--muted-deep)", margin: "0 0 14px" }}>
            多个 QQ 号 / 群号请用英文逗号分隔，如：<code>123456,789012</code>
          </p>

          <div className="admin-form-row">
            <label className="admin-form-label">私聊目标 QQ 号</label>
            <input
              className="admin-input"
              value={form.target_qq}
              onChange={e => set("target_qq", e.target.value)}
              placeholder="123456,789012（留空则不发私聊）"
            />
          </div>

          <div className="admin-form-row">
            <label className="admin-form-label">目标群号</label>
            <input
              className="admin-input"
              value={form.target_group}
              onChange={e => set("target_group", e.target.value)}
              placeholder="987654,246810（留空则不发群消息）"
            />
          </div>

          {/* 测试消息 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <button
              className="admin-btn admin-btn--secondary"
              onClick={handleTest}
              disabled={testing || !form.http_url}
              style={{ minWidth: 120 }}
            >
              {testing ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} />}
              {testing ? "发送中…" : "发送测试消息"}
            </button>
            <StatusMsg msg={testMsg} />
          </div>
        </section>

        {/* ── 通知开关 ────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title">事件通知开关</div>

          <Toggle
            label="新增点赞通知"
            description="有用户点赞帖子时发送通知（取消点赞不通知）"
            value={form.notify_on_like}
            onChange={v => set("notify_on_like", v)}
          />
          <Toggle
            label="新评论通知"
            description="有用户发表评论时发送通知"
            value={form.notify_on_comment}
            onChange={v => set("notify_on_comment", v)}
          />
          <Toggle
            label="新帖子通知"
            description="有管理员发布新帖子时发送通知"
            value={form.notify_on_post}
            onChange={v => set("notify_on_post", v)}
          />

          <div className="admin-form-row" style={{ marginTop: 14 }}>
            <label className="admin-form-label">邮件发送量预警阈值</label>
            <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 6px" }}>
              当天邮件发送量超过此值时发送预警通知，设为 0 则不启用
            </p>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={form.email_threshold}
              onChange={e => set("email_threshold", parseInt(e.target.value) || 0)}
              placeholder="0（不启用）"
              style={{ width: 160 }}
            />
          </div>
        </section>

        {/* ── 保存区域 ────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          <StatusMsg msg={saveMsg} />
          <button
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 90 }}
          >
            {saving ? <Loader2 size={13} className="admin-upload-spin" /> : <Save size={13} />}
            {saving ? "保存中…" : "保存配置"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

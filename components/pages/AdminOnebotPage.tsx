"use client";

import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { Bot, Loader2, Save, Send, ToggleLeft, ToggleRight, Plus, X } from "lucide-react";

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

function toTags(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}
function fromTags(arr: string[]): string {
  return arr.join(",");
}

// ── Tag 输入组件 ────────────────────────────────────────────
function TagInput({
  label, description, placeholder, tags, onAdd, onRemove,
}: {
  label: string;
  description?: string;
  placeholder?: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [input, setInput] = useState("");

  function tryAdd() {
    const val = input.trim();
    if (!val || !/^\d+$/.test(val)) return;
    if (!tags.includes(val)) onAdd(val);
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); tryAdd(); }
    if (e.key === "Backspace" && !input && tags.length > 0) onRemove(tags[tags.length - 1]);
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label className="admin-form-label">{label}</label>
      {description && (
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 8px" }}>{description}</p>
      )}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {tags.map(t => (
            <span key={t} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px 3px 10px",
              background: "rgba(212, 92, 128, 0.12)",
              border: "1px solid rgba(212, 92, 128, 0.3)",
              borderRadius: "var(--radius-full)",
              fontSize: 12.5, color: "var(--pk-600)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {t}
              <button type="button" onClick={() => onRemove(t)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "var(--pk-500)" }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="admin-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          inputMode="numeric"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" className="admin-btn admin-btn--secondary" onClick={tryAdd}
          disabled={!input.trim()}
          style={{ flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={13} /> 添加
        </button>
      </div>
      {input.trim() && !/^\d+$/.test(input.trim()) && (
        <p style={{ fontSize: 11.5, color: "#c0392b", marginTop: 4 }}>只能输入纯数字</p>
      )}
    </div>
  );
}

// ── 开关组件 ────────────────────────────────────────────────
function Toggle({
  label, description, value, onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 0", borderBottom: "1px solid var(--border-soft)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-base)" }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{description}</div>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: value ? "var(--pk-500)" : "var(--text-muted)", flexShrink: 0 }}
        aria-label={label}>
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );
}

// ── 状态提示 ──────────────────────────────────────────────
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
  const [qqTags, setQqTags] = useState<string[]>([]);
  const [groupTags, setGroupTags] = useState<string[]>([]);
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
        const cfg: OnebotConfig = { ...DEFAULT_CONFIG, ...json.data };
        setForm(cfg);
        setQqTags(toTags(cfg.target_qq));
        setGroupTags(toTags(cfg.target_group));
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
      const payload = { ...form, target_qq: fromTags(qqTags), target_group: fromTags(groupTags) };
      const res = await fetch("/api/admin/onebot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code === 0) {
        setSaveMsg({ ok: true, text: "配置已保存" });
        if (json.data) {
          const cfg: OnebotConfig = { ...DEFAULT_CONFIG, ...json.data };
          setForm(cfg);
          setQqTags(toTags(cfg.target_qq));
          setGroupTags(toTags(cfg.target_group));
        }
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
          target_qq: fromTags(qqTags),
          target_group: fromTags(groupTags),
        }),
      });
      const json = await res.json();
      setTestMsg({ ok: json.code === 0, text: json.code === 0 ? "测试消息已发送" : (json.message ?? "发送失败") });
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

      <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>

        {/* ── 基础配置 ─────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 4 }}>基础配置</div>

          <Toggle
            label="启用 OneBot 推送"
            description="关闭后所有通知将静默，不影响业务功能"
            value={form.enabled}
            onChange={v => set("enabled", v)}
          />

          <div style={{ marginTop: 16 }}>
            <label className="admin-form-label">OneBot HTTP 地址 *</label>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 8px" }}>
              OneBot 实现的 HTTP 正向监听地址，如 http://127.0.0.1:3000
            </p>
            <input
              className="admin-input"
              type="url"
              value={form.http_url}
              onChange={e => set("http_url", e.target.value)}
              placeholder="http://127.0.0.1:3000"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="admin-form-label">Access Token</label>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 8px" }}>
              OneBot 配置的 access_token，留空则不鉴权
            </p>
            <input
              className="admin-input"
              type="password"
              value={form.access_token}
              onChange={e => set("access_token", e.target.value)}
              placeholder="留空则不使用"
              autoComplete="new-password"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </section>

        {/* ── 推送目标 ─────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 12 }}>推送目标</div>

          <TagInput
            label="私聊目标 QQ 号"
            description="输入 QQ 号后按 Enter 或点击添加，可添加多个"
            placeholder="输入 QQ 号，如 123456789"
            tags={qqTags}
            onAdd={v => setQqTags(t => [...t, v])}
            onRemove={v => setQqTags(t => t.filter(x => x !== v))}
          />

          <TagInput
            label="目标群号"
            description="输入群号后按 Enter 或点击添加，可添加多个"
            placeholder="输入群号，如 987654321"
            tags={groupTags}
            onAdd={v => setGroupTags(t => [...t, v])}
            onRemove={v => setGroupTags(t => t.filter(x => x !== v))}
          />

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button
              className="admin-btn admin-btn--secondary"
              onClick={handleTest}
              disabled={testing || !form.http_url}
              style={{ minWidth: 130, display: "flex", alignItems: "center", gap: 6 }}
            >
              {testing ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} />}
              {testing ? "发送中…" : "发送测试消息"}
            </button>
            <StatusMsg msg={testMsg} />
          </div>
        </section>

        {/* ── 通知开关 ─────────────────────────────── */}
        <section className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 4 }}>事件通知开关</div>

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

          <div style={{ marginTop: 16 }}>
            <label className="admin-form-label">邮件发送量预警阈值</label>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 8px" }}>
              当天邮件发送量超过此值时发送预警通知，设为 0 则不启用
            </p>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={form.email_threshold}
              onChange={e => set("email_threshold", parseInt(e.target.value) || 0)}
              placeholder="0（不启用）"
              style={{ width: 140 }}
            />
          </div>
        </section>

        {/* ── 保存区域 ─────────────────────────────── */}
        <div style={{
          display: "flex", flexWrap: "wrap",
          alignItems: "center", gap: 10, justifyContent: "flex-end",
          paddingBottom: 24,
        }}>
          <StatusMsg msg={saveMsg} />
          <button
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 100, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving ? <Loader2 size={13} className="admin-upload-spin" /> : <Save size={13} />}
            {saving ? "保存中…" : "保存配置"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

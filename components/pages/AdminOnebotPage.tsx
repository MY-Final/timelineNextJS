"use client";

import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import {
  Bot, Loader2, Save, Send, ToggleLeft, ToggleRight, Plus, X,
} from "lucide-react";

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

// ── Tag 输入 ───────────────────────────────────────────────
function TagInput({
  placeholder, tags, onAdd, onRemove,
}: {
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
    <div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {tags.map(t => (
            <span key={t} style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 8px 2px 10px",
              background: "rgba(212,92,128,0.10)",
              border: "1px solid rgba(212,92,128,0.28)",
              borderRadius: 999,
              fontSize: 12, color: "var(--pk-600)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {t}
              <button type="button" onClick={() => onRemove(t)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", display: "flex", alignItems: "center", color: "var(--pk-400)", lineHeight: 1 }}>
                <X size={10} />
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
        <button type="button" className="admin-btn admin-btn--ghost" onClick={tryAdd}
          disabled={!input.trim() || !/^\d+$/.test(input.trim())}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={13} strokeWidth={1.8} />添加
        </button>
      </div>
      {input.trim() && !/^\d+$/.test(input.trim()) && (
        <p style={{ fontSize: 11.5, color: "#c0392b", margin: "4px 0 0" }}>只能输入纯数字</p>
      )}
    </div>
  );
}

// ── 内联开关行 ─────────────────────────────────────────────
function SwitchRow({
  label, description, value, onChange, noBorder,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  noBorder?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 0",
      borderBottom: noBorder ? "none" : "1px solid var(--border-soft)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "var(--muted-deep)", marginTop: 1 }}>{description}</div>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 1, color: value ? "#c0446a" : "var(--muted)" }}
        aria-label={label}>
        {value ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
      </button>
    </div>
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
    setSaving(true); setSaveMsg(null);
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
          setForm(cfg); setQqTags(toTags(cfg.target_qq)); setGroupTags(toTags(cfg.target_group));
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
    setTesting(true); setTestMsg(null);
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

  return (
    <AdminLayout title="OneBot 推送">
      {/* ── 说明卡片 ── */}
      <div className="admin-panel" style={{ marginBottom: 16, padding: "12px 16px", background: "var(--rose-50, #fff5f7)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Bot size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--muted-deep)" }} strokeWidth={1.8} />
          <div style={{ fontSize: 13, color: "var(--muted-deep)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>OneBot 推送配置</strong>
            <br />
            通过 OneBot HTTP 正向接口向 QQ 私聊或群推送站点通知，包括新点赞、新评论、新帖子和邮件用量预警。<br />
            需要在 OneBot 实现（如 NapCat、LLOneBot）中开启 <strong>HTTP 正向监听</strong>，而非 WebSocket 模式。
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={20} className="admin-upload-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : (
        <>
          {/* ── 基础配置 ── */}
          <div className="admin-panel" style={{ marginBottom: 16 }}>
            <h2 className="admin-panel-title">
              <Bot size={14} strokeWidth={1.8} />基础配置
            </h2>

            <SwitchRow
              label="启用 OneBot 推送"
              description="关闭后所有通知将静默，不影响业务功能"
              value={form.enabled}
              onChange={v => set("enabled", v)}
            />

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <label className="admin-form-label">
                OneBot HTTP 地址 *
                <span style={{ fontWeight: 400, color: "var(--muted-deep)", fontSize: 11.5, marginLeft: 6 }}>
                  HTTP 正向监听地址，如 http://127.0.0.1:3000
                </span>
              </label>
              <input
                className="admin-input"
                type="url"
                value={form.http_url}
                onChange={e => { set("http_url", e.target.value); setTestMsg(null); }}
                placeholder="http://127.0.0.1:3000"
              />
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">
                Access Token
                <span style={{ fontWeight: 400, color: "var(--muted-deep)", fontSize: 11.5, marginLeft: 6 }}>
                  留空则不鉴权
                </span>
              </label>
              <input
                className="admin-input"
                type="password"
                value={form.access_token}
                onChange={e => set("access_token", e.target.value)}
                placeholder="留空则不使用"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* ── 推送目标 ── */}
          <div className="admin-panel" style={{ marginBottom: 16 }}>
            <h2 className="admin-panel-title">
              <Send size={14} strokeWidth={1.8} />推送目标
            </h2>

            <div className="admin-form-row">
              <label className="admin-form-label">
                私聊目标 QQ 号
                <span style={{ fontWeight: 400, color: "var(--muted-deep)", fontSize: 11.5, marginLeft: 6 }}>
                  按 Enter 或点击添加，支持多个
                </span>
              </label>
              <TagInput
                placeholder="输入 QQ 号，如 123456789"
                tags={qqTags}
                onAdd={v => { setQqTags(t => [...t, v]); setTestMsg(null); }}
                onRemove={v => { setQqTags(t => t.filter(x => x !== v)); setTestMsg(null); }}
              />
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">
                目标群号
                <span style={{ fontWeight: 400, color: "var(--muted-deep)", fontSize: 11.5, marginLeft: 6 }}>
                  按 Enter 或点击添加，支持多个
                </span>
              </label>
              <TagInput
                placeholder="输入群号，如 987654321"
                tags={groupTags}
                onAdd={v => { setGroupTags(t => [...t, v]); setTestMsg(null); }}
                onRemove={v => { setGroupTags(t => t.filter(x => x !== v)); setTestMsg(null); }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 4 }}>
              <button
                className="admin-btn admin-btn--ghost"
                onClick={handleTest}
                disabled={testing || !form.http_url}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {testing ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} strokeWidth={1.8} />}
                {testing ? "发送中…" : "发送测试消息"}
              </button>
              {testMsg && (
                <span style={{ fontSize: 13, color: testMsg.ok ? "#27ae60" : "#c0392b" }}>
                  {testMsg.ok ? "✅ " : "❌ "}{testMsg.text}
                </span>
              )}
            </div>
          </div>

          {/* ── 事件通知开关 ── */}
          <div className="admin-panel" style={{ marginBottom: 16 }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 0 }}>
              <Bot size={14} strokeWidth={1.8} />事件通知开关
            </h2>

            <SwitchRow
              label="新增点赞通知"
              description="有用户点赞帖子时发送通知（取消点赞不通知）"
              value={form.notify_on_like}
              onChange={v => set("notify_on_like", v)}
            />
            <SwitchRow
              label="新评论通知"
              description="有用户发表评论时发送通知"
              value={form.notify_on_comment}
              onChange={v => set("notify_on_comment", v)}
            />
            <SwitchRow
              label="新帖子通知"
              description="有管理员发布新帖子时发送通知"
              value={form.notify_on_post}
              onChange={v => set("notify_on_post", v)}
            />

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <label className="admin-form-label">
                邮件发送量预警阈值
                <span style={{ fontWeight: 400, color: "var(--muted-deep)", fontSize: 11.5, marginLeft: 6 }}>
                  当天累计发送量达到此值时推送预警，设为 0 则不启用
                </span>
              </label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={form.email_threshold}
                onChange={e => set("email_threshold", parseInt(e.target.value) || 0)}
                placeholder="0（不启用）"
                style={{ maxWidth: 140 }}
              />
            </div>
          </div>

          {/* ── 保存栏 ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", paddingBottom: 24 }}>
            {saveMsg && (
              <span style={{ fontSize: 13, color: saveMsg.ok ? "#27ae60" : "#c0392b" }}>
                {saveMsg.ok ? "✅ " : "❌ "}{saveMsg.text}
              </span>
            )}
            <button
              className="admin-btn admin-btn--primary"
              onClick={handleSave}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {saving ? <Loader2 size={13} className="admin-upload-spin" /> : <Save size={13} strokeWidth={1.8} />}
              {saving ? "保存中…" : "保存配置"}
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

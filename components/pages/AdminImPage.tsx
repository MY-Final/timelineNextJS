"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import {
  BellRing,
  Bot,
  Eye,
  FileText,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Smartphone,
} from "lucide-react";

type ImProviderType = "onebot" | "gotify";
type MainTab = "channels" | "templates";
type NotificationType = "like" | "comment" | "post" | "email_threshold";

interface ImTemplate {
  type: NotificationType;
  template: string;
  enabled: boolean;
}

interface TemplateVariable {
  name: string;
  desc: string;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  like:            "新点赞通知",
  comment:         "新评论通知",
  post:            "新帖子通知",
  email_threshold: "邮件发送量预警",
};

interface OnebotFields {
  http_url: string;
  access_token: string;
  target_qq: string;
  target_group: string;
}

interface GotifyFields {
  server_url: string;
  app_token: string;
  priority: number;
}

interface ImConfig<T extends ImProviderType = ImProviderType> {
  id: number;
  type: T;
  enabled: boolean;
  config: T extends "onebot" ? OnebotFields : GotifyFields;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_post: boolean;
  email_threshold: number;
  sort_order: number;
}

interface ImResponse {
  items: ImConfig[];
  activeType: ImProviderType | null;
}

const PROVIDER_META: Record<ImProviderType, {
  title: string;
  description: string;
  icon: typeof Bot;
  accent: string;
}> = {
  onebot: {
    title: "OneBot",
    description: "适合 QQ 私聊 / 群通知，沿用你现有的机器人链路。",
    icon: Bot,
    accent: "rgba(212,92,128,0.18)",
  },
  gotify: {
    title: "Gotify",
    description: "适合 APP 推送，配置简单，适合移动端即时提醒。",
    icon: Smartphone,
    accent: "rgba(99,102,241,0.16)",
  },
};

const DEFAULT_ITEMS: ImConfig[] = [
  {
    id: 0,
    type: "onebot",
    enabled: false,
    config: {
      http_url: "",
      access_token: "",
      target_qq: "",
      target_group: "",
    },
    notify_on_like: true,
    notify_on_comment: true,
    notify_on_post: true,
    email_threshold: 0,
    sort_order: 1,
  },
  {
    id: 0,
    type: "gotify",
    enabled: false,
    config: {
      server_url: "",
      app_token: "",
      priority: 5,
    },
    notify_on_like: true,
    notify_on_comment: true,
    notify_on_post: true,
    email_threshold: 0,
    sort_order: 2,
  },
];

function toTags(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function fromTags(arr: string[]): string {
  return arr.join(",");
}

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

function defaultActiveType(items: ImConfig[], activeType: ImProviderType | null): ImProviderType {
  return activeType ?? items.find(item => item.enabled)?.type ?? items[0]?.type ?? "onebot";
}

function getConfigItem<T extends ImProviderType>(items: ImConfig[], type: T): ImConfig<T> {
  return items.find(item => item.type === type) as ImConfig<T>;
}

export default function AdminImPage() {
  const [mainTab, setMainTab] = useState<MainTab>("channels");
  const [items, setItems] = useState<ImConfig[]>(DEFAULT_ITEMS);
  const [activeType, setActiveType] = useState<ImProviderType>("onebot");
  const [qqTags, setQqTags] = useState<string[]>([]);
  const [groupTags, setGroupTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ImProviderType | null>(null);
  const [testing, setTesting] = useState<ImProviderType | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 模版状态
  const [templates, setTemplates] = useState<ImTemplate[]>([]);
  const [templateVars, setTemplateVars] = useState<Record<NotificationType, TemplateVariable[]>>({
    like: [], comment: [], post: [], email_threshold: [],
  });
  const [defaultTemplates, setDefaultTemplates] = useState<Record<NotificationType, string>>({
    like: "", comment: "", post: "", email_threshold: "",
  });
  const [templateLoading, setTemplateLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState<NotificationType | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<NotificationType | null>(null);
  const [templatePreviews, setTemplatePreviews] = useState<Partial<Record<NotificationType, string>>>({});
  const [templateSaveMsg, setTemplateSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const textareaRefs = useRef<Partial<Record<NotificationType, HTMLTextAreaElement | null>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/im");
      const json = await res.json();
      if (json.code === 0 && json.data) {
        const data = json.data as ImResponse;
        const nextItems = data.items?.length ? data.items : DEFAULT_ITEMS;
        setItems(nextItems);
        setActiveType(defaultActiveType(nextItems, data.activeType));
        const onebot = getConfigItem(nextItems, "onebot");
        setQqTags(toTags(onebot.config.http_url !== undefined ? onebot.config.target_qq : ""));
        setGroupTags(toTags(onebot.config.http_url !== undefined ? onebot.config.target_group : ""));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch("/api/admin/im/templates");
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setTemplates(json.data.templates ?? []);
        setTemplateVars(json.data.variables ?? { like: [], comment: [], post: [], email_threshold: [] });
        setDefaultTemplates(json.data.defaults ?? { like: "", comment: "", post: "", email_threshold: "" });
      }
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (mainTab === "templates") loadTemplates(); }, [mainTab, loadTemplates]);

  const onebot = useMemo(() => getConfigItem(items, "onebot"), [items]);
  const gotify = useMemo(() => getConfigItem(items, "gotify"), [items]);

  function setBase<K extends keyof ImConfig>(type: ImProviderType, key: K, value: ImConfig[K]) {
    setItems(prev => prev.map(item => item.type === type ? { ...item, [key]: value } : item));
    setSaveMsg(null);
  }

  function setConfig(type: "onebot", key: keyof OnebotFields, value: string) {
    setItems(prev => prev.map(item => item.type === type
      ? { ...item, config: { ...(item.config as OnebotFields), [key]: value } }
      : item));
    setSaveMsg(null);
    setTestMsg(null);
  }

  function setGotifyConfig(key: keyof GotifyFields, value: string | number) {
    setItems(prev => prev.map(item => item.type === "gotify"
      ? { ...item, config: { ...(item.config as GotifyFields), [key]: value } }
      : item));
    setSaveMsg(null);
    setTestMsg(null);
  }

  async function handleSave(type: ImProviderType) {
    setSaving(type);
    setSaveMsg(null);
    try {
      const config = type === "onebot"
        ? { ...(onebot.config as OnebotFields), target_qq: fromTags(qqTags), target_group: fromTags(groupTags) }
        : gotify.config;

      const item = type === "onebot" ? onebot : gotify;
      const res = await fetch("/api/admin/im", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          enabled: item.enabled,
          notify_on_like: item.notify_on_like,
          notify_on_comment: item.notify_on_comment,
          notify_on_post: item.notify_on_post,
          email_threshold: item.email_threshold,
          config,
        }),
      });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        const data = json.data as ImResponse;
        const nextItems = data.items?.length ? data.items : DEFAULT_ITEMS;
        setItems(nextItems);
        setActiveType(defaultActiveType(nextItems, data.activeType));
        const nextOnebot = getConfigItem(nextItems, "onebot");
        setQqTags(toTags(nextOnebot.config.http_url !== undefined ? nextOnebot.config.target_qq : ""));
        setGroupTags(toTags(nextOnebot.config.http_url !== undefined ? nextOnebot.config.target_group : ""));
        setSaveMsg({ ok: true, text: "配置已保存" });
      } else {
        setSaveMsg({ ok: false, text: json.message ?? "保存失败" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "网络异常" });
    } finally {
      setSaving(null);
    }
  }

  async function handleTest(type: ImProviderType) {
    setTesting(type);
    setTestMsg(null);
    try {
      const config = type === "onebot"
        ? { ...(onebot.config as OnebotFields), target_qq: fromTags(qqTags), target_group: fromTags(groupTags) }
        : gotify.config;
      const res = await fetch("/api/admin/im", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config }),
      });
      const json = await res.json();
      setTestMsg({ ok: json.code === 0, text: json.code === 0 ? "测试消息已发送" : (json.message ?? "发送失败") });
    } catch {
      setTestMsg({ ok: false, text: "网络异常" });
    } finally {
      setTesting(null);
    }
  }

  function renderProviderSwitcher() {
    return (
      <div className="admin-im-switcher">
        {(["onebot", "gotify"] as const).map((type) => {
          const item = type === "onebot" ? onebot : gotify;
          const meta = PROVIDER_META[type];
          const Icon = meta.icon;
          const isActive = activeType === type;

          return (
            <div
              key={type}
              className={`admin-im-switcher-item${isActive ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="admin-im-switcher-main"
                onClick={() => setActiveType(type)}
              >
                <span className="admin-im-switcher-icon" style={{ background: meta.accent }}>
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="admin-im-switcher-content">
                  <span className="admin-im-switcher-topline">
                    <strong>{meta.title}</strong>
                    <span className={`admin-im-switcher-badge${item.enabled ? " is-enabled" : ""}`}>
                      {item.enabled ? "已启用" : "未启用"}
                    </span>
                  </span>
                  <span className="admin-im-switcher-description">{meta.description}</span>
                </span>
              </button>
              <button
                type="button"
                className={`admin-im-switcher-toggle${item.enabled ? " is-enabled" : ""}`}
                onClick={() => setBase(type, "enabled", !item.enabled)}
                aria-label={item.enabled ? `停用 ${meta.title}` : `启用 ${meta.title}`}
              >
                {item.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderOnebotSection() {
    const config = onebot.config as OnebotFields;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="admin-panel" style={{ margin: 0 }}>
          <h2 className="admin-panel-title"><Bot size={14} strokeWidth={1.8} />基础配置</h2>
          <div className="admin-form-row">
            <label className="admin-form-label">OneBot HTTP 地址 *</label>
            <input className="admin-input" type="url" value={config.http_url} onChange={e => setConfig("onebot", "http_url", e.target.value)} placeholder="http://127.0.0.1:3000" />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">Access Token</label>
            <input className="admin-input" type="password" value={config.access_token} onChange={e => setConfig("onebot", "access_token", e.target.value)} placeholder="留空则不使用" autoComplete="new-password" />
          </div>
        </div>

        <div className="admin-panel" style={{ margin: 0 }}>
          <h2 className="admin-panel-title"><Send size={14} strokeWidth={1.8} />推送目标</h2>
          <div className="admin-form-row">
            <label className="admin-form-label">私聊目标 QQ 号</label>
            <TagInput
              placeholder="输入 QQ 号，如 123456789"
              tags={qqTags}
              onAdd={v => { setQqTags(t => [...t, v]); setTestMsg(null); }}
              onRemove={v => { setQqTags(t => t.filter(x => x !== v)); setTestMsg(null); }}
            />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">目标群号</label>
            <TagInput
              placeholder="输入群号，如 987654321"
              tags={groupTags}
              onAdd={v => { setGroupTags(t => [...t, v]); setTestMsg(null); }}
              onRemove={v => { setGroupTags(t => t.filter(x => x !== v)); setTestMsg(null); }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button className="admin-btn admin-btn--ghost" onClick={() => handleTest("onebot")} disabled={testing === "onebot" || !config.http_url} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", fontSize: 13.5 }}>
              {testing === "onebot" ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} strokeWidth={1.8} />}
              {testing === "onebot" ? "发送中…" : "发送测试消息"}
            </button>
          </div>
        </div>

        {renderSharedSwitches("onebot")}
      </div>
    );
  }

  function renderGotifySection() {
    const config = gotify.config as GotifyFields;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="admin-panel" style={{ margin: 0 }}>
          <h2 className="admin-panel-title"><Smartphone size={14} strokeWidth={1.8} />基础配置</h2>
          <div className="admin-form-row">
            <label className="admin-form-label">Gotify 服务地址 *</label>
            <input className="admin-input" type="url" value={config.server_url} onChange={e => setGotifyConfig("server_url", e.target.value)} placeholder="https://push.example.com" />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">App Token *</label>
            <input className="admin-input" type="password" value={config.app_token} onChange={e => setGotifyConfig("app_token", e.target.value)} placeholder="输入应用 token" autoComplete="new-password" />
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label">默认优先级</label>
            <input className="admin-input" type="number" min={0} max={10} value={config.priority} onChange={e => setGotifyConfig("priority", parseInt(e.target.value, 10) || 0)} style={{ maxWidth: 140 }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button className="admin-btn admin-btn--ghost" onClick={() => handleTest("gotify")} disabled={testing === "gotify" || !config.server_url || !config.app_token} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", fontSize: 13.5 }}>
              {testing === "gotify" ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} strokeWidth={1.8} />}
              {testing === "gotify" ? "发送中…" : "发送测试消息"}
            </button>
          </div>
        </div>

        {renderSharedSwitches("gotify")}
      </div>
    );
  }

  function renderSharedSwitches(type: ImProviderType) {
    const item = type === "onebot" ? onebot : gotify;
    return (
      <>
        <div className="admin-panel" style={{ margin: 0 }}>
          <h2 className="admin-panel-title"><BellRing size={14} strokeWidth={1.8} />事件通知开关</h2>
          <SwitchRow label="新增点赞通知" description="有用户点赞帖子时发送通知" value={item.notify_on_like} onChange={v => setBase(type, "notify_on_like", v)} />
          <SwitchRow label="新评论通知" description="有用户发表评论时发送通知" value={item.notify_on_comment} onChange={v => setBase(type, "notify_on_comment", v)} />
          <SwitchRow label="新帖子通知" description="有管理员发布新帖子时发送通知" value={item.notify_on_post} onChange={v => setBase(type, "notify_on_post", v)} noBorder />
        </div>

        <div className="admin-panel" style={{ margin: 0 }}>
          <h2 className="admin-panel-title"><BellRing size={14} strokeWidth={1.8} />邮件阈值预警</h2>
          <div className="admin-form-row">
            <label className="admin-form-label">邮件发送量预警阈值</label>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={item.email_threshold}
              onChange={e => setBase(type, "email_threshold", parseInt(e.target.value, 10) || 0)}
              placeholder="0（不启用）"
              style={{ maxWidth: 140 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            {saveMsg && <span style={{ fontSize: 13, color: saveMsg.ok ? "#27ae60" : "#c0392b" }}>{saveMsg.ok ? "✅ " : "❌ "}{saveMsg.text}</span>}
            {testMsg && <span style={{ fontSize: 13, color: testMsg.ok ? "#27ae60" : "#c0392b" }}>{testMsg.ok ? "✅ " : "❌ "}{testMsg.text}</span>}
            <button className="admin-btn admin-btn--primary" onClick={() => handleSave(type)} disabled={saving === type} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", fontSize: 14 }}>
              {saving === type ? <Loader2 size={13} className="admin-upload-spin" /> : <Save size={13} strokeWidth={1.8} />}
              {saving === type ? "保存中…" : "保存配置"}
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderTemplatesSection() {
    const TYPES: NotificationType[] = ["like", "comment", "post", "email_threshold"];

    function getTemplate(type: NotificationType): ImTemplate {
      return templates.find(t => t.type === type) ?? { type, template: defaultTemplates[type] ?? "", enabled: true };
    }

    function setTemplateValue(type: NotificationType, value: string) {
      setTemplates(prev => {
        const existing = prev.find(t => t.type === type);
        if (existing) return prev.map(t => t.type === type ? { ...t, template: value } : t);
        return [...prev, { type, template: value, enabled: true }];
      });
      setTemplateSaveMsg(null);
    }

    function insertVariable(type: NotificationType, variable: string) {
      const ta = textareaRefs.current[type];
      if (!ta) {
        setTemplateValue(type, getTemplate(type).template + variable);
        return;
      }
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      const newVal = ta.value.slice(0, start) + variable + ta.value.slice(end);
      setTemplateValue(type, newVal);
      // 恢复光标位置
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + variable.length, start + variable.length);
      });
    }

    async function handlePreview(type: NotificationType) {
      setPreviewingTemplate(type);
      try {
        const tpl = getTemplate(type).template;
        const res = await fetch("/api/admin/im/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, template: tpl }),
        });
        const json = await res.json();
        if (json.code === 0) {
          setTemplatePreviews(prev => ({ ...prev, [type]: json.data.preview }));
        }
      } finally {
        setPreviewingTemplate(null);
      }
    }

    async function handleSaveTemplate(type: NotificationType) {
      setSavingTemplate(type);
      setTemplateSaveMsg(null);
      try {
        const tpl = getTemplate(type);
        const res = await fetch("/api/admin/im/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, template: tpl.template, enabled: tpl.enabled }),
        });
        const json = await res.json();
        if (json.code === 0) {
          setTemplates(json.data.templates ?? []);
          setTemplateSaveMsg({ ok: true, text: "模版已保存" });
        } else {
          setTemplateSaveMsg({ ok: false, text: json.message ?? "保存失败" });
        }
      } catch {
        setTemplateSaveMsg({ ok: false, text: "网络异常" });
      } finally {
        setSavingTemplate(null);
      }
    }

    function handleRestoreDefault(type: NotificationType) {
      setTemplateValue(type, defaultTemplates[type] ?? "");
      setTemplatePreviews(prev => { const n = { ...prev }; delete n[type]; return n; });
    }

    if (templateLoading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={20} className="admin-upload-spin" style={{ opacity: 0.4 }} />
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="admin-panel" style={{ margin: 0, padding: "12px 16px", background: "var(--rose-50, #fff5f7)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <FileText size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--muted-deep)" }} strokeWidth={1.8} />
            <div style={{ fontSize: 13, color: "var(--muted-deep)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--text)" }}>通知消息模版</strong>
              <br />
              自定义各事件的通知内容，支持变量插值。点击下方变量标签可直接插入光标处。OneBot 和 Gotify 共用同一套模版。
            </div>
          </div>
        </div>

        {TYPES.map(type => {
          const tpl = getTemplate(type);
          const vars = templateVars[type] ?? [];
          const preview = templatePreviews[type];

          return (
            <div key={type} className="admin-panel" style={{ margin: 0 }}>
              <h2 className="admin-panel-title">
                <BellRing size={14} strokeWidth={1.8} />
                {NOTIFICATION_TYPE_LABELS[type]}
              </h2>

              <div className="admin-form-row" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label className="admin-form-label" style={{ marginBottom: 0 }}>消息模版</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-deep)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={e => setTemplates(prev => {
                        const existing = prev.find(t => t.type === type);
                        if (existing) return prev.map(t => t.type === type ? { ...t, enabled: e.target.checked } : t);
                        return [...prev, { type, template: tpl.template, enabled: e.target.checked }];
                      })}
                      style={{ accentColor: "var(--pk-500, #c0446a)", width: 14, height: 14 }}
                    />
                    启用自定义模版
                  </label>
                </div>
                <textarea
                  ref={el => { textareaRefs.current[type] = el; }}
                  className="admin-input"
                  value={tpl.template}
                  onChange={e => setTemplateValue(type, e.target.value)}
                  rows={4}
                  style={{ height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
                />
              </div>

              {/* 可用变量 chips */}
              {vars.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {vars.map(v => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(type, v.name)}
                      title={`插入 ${v.name}（${v.desc}）`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "3px 9px",
                        background: "rgba(212,92,128,0.08)",
                        border: "1px solid rgba(212,92,128,0.22)",
                        borderRadius: 999,
                        fontSize: 12, color: "var(--pk-600)",
                        cursor: "pointer", fontFamily: "monospace",
                      }}
                    >
                      {v.name}
                      <span style={{ fontSize: 11, color: "var(--muted-deep)", fontFamily: "sans-serif" }}>
                        {v.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 预览结果 */}
              {preview && (
                <div style={{
                  padding: "10px 12px", marginBottom: 12,
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                  color: "var(--muted-deep)",
                  whiteSpace: "pre-wrap", fontFamily: "monospace",
                }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontFamily: "sans-serif" }}>预览（模拟数据）</div>
                  {preview}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handlePreview(type)}
                  disabled={previewingTemplate === type}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
                >
                  {previewingTemplate === type
                    ? <Loader2 size={13} className="admin-upload-spin" />
                    : <Eye size={13} strokeWidth={1.8} />}
                  预览
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handleRestoreDefault(type)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
                >
                  <RefreshCcw size={13} strokeWidth={1.8} />
                  恢复默认
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => handleSaveTemplate(type)}
                  disabled={savingTemplate === type}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", fontSize: 14 }}
                >
                  {savingTemplate === type
                    ? <Loader2 size={13} className="admin-upload-spin" />
                    : <Save size={13} strokeWidth={1.8} />}
                  {savingTemplate === type ? "保存中…" : "保存模版"}
                </button>
              </div>

              {templateSaveMsg && (
                <div style={{ marginTop: 8, fontSize: 13, color: templateSaveMsg.ok ? "#27ae60" : "#c0392b" }}>
                  {templateSaveMsg.ok ? "✅ " : "❌ "}{templateSaveMsg.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AdminLayout title="IM通知">
      <div className="admin-panel" style={{ marginBottom: 16, padding: "12px 16px", background: "var(--rose-50, #fff5f7)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BellRing size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--muted-deep)" }} strokeWidth={1.8} />
          <div style={{ fontSize: 13, color: "var(--muted-deep)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>IM 通知中心</strong>
            <br />
            所有即时通知渠道都集中在这里管理。顶部切换当前渠道，下方只显示当前渠道配置；多个渠道可以同时启用，通知将并行发送到所有已启用渠道。
          </div>
        </div>
      </div>

      {/* 主 Tab：渠道配置 / 通知模版 */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid var(--border-soft)", paddingBottom: 0 }}>
        {([
          { key: "channels", label: "渠道配置", icon: Bot },
          { key: "templates", label: "通知模版", icon: FileText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px",
              fontSize: 13.5, fontWeight: 500,
              background: "none", border: "none", cursor: "pointer",
              color: mainTab === key ? "var(--pk-600, #c0446a)" : "var(--muted-deep)",
              borderBottom: mainTab === key ? "2px solid var(--pk-500, #c0446a)" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}
          >
            <Icon size={14} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={20} className="admin-upload-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : mainTab === "channels" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {renderProviderSwitcher()}
          {activeType === "onebot" ? renderOnebotSection() : renderGotifySection()}
        </div>
      ) : (
        renderTemplatesSection()
      )}
    </AdminLayout>
  );
}

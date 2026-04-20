"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/pages/AdminLayout";
import { Settings, Loader2, Save, Users, Mail, Heart, Image } from "lucide-react";

interface SettingRow {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

function useSettings() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.code === 0) {
        setRows(json.data);
        const m: Record<string, string> = {};
        json.data.forEach((r: SettingRow) => { m[r.key] = r.value; });
        setMap(m);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  return { rows, loading, map, reload: load };
}

async function saveSetting(key: string, value: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const json = await res.json();
    return { ok: json.code === 0, msg: json.code === 0 ? "已保存" : (json.message || "保存失败") };
  } catch {
    return { ok: false, msg: "网络异常" };
  }
}

// ── 单行设置组件 ───────────────────────────────────
function SettingField({
  label, description, type = "text", value, onChange, placeholder,
  extra,
}: {
  label: string;
  description?: string;
  type?: "text" | "url" | "datetime-local" | "number";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="admin-form-row" style={{ marginBottom: 16 }}>
      <label className="admin-form-label" style={{ marginBottom: 4 }}>{label}</label>
      {description && <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 6px" }}>{description}</p>}
      <input
        className="admin-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      {extra}
    </div>
  );
}

// ── 保存按钮区域 ───────────────────────────────────
function SaveBar({
  saving, msg, onSave,
}: { saving: boolean; msg: { ok: boolean; text: string } | null; onSave: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
      {msg && (
        <span style={{ fontSize: 13, color: msg.ok ? "#27ae60" : "#c0392b" }}>
          {msg.ok ? "✅ " : "❌ "}{msg.text}
        </span>
      )}
      <button className="admin-btn admin-btn--primary" onClick={onSave} disabled={saving} style={{ minWidth: 80 }}>
        {saving ? <Loader2 size={13} className="admin-upload-spin" /> : <Save size={13} />}
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

// ── 主页面 ─────────────────────────────────────────
export default function AdminSettingsPage() {
  const { map, loading, reload } = useSettings();

  // 各区块的本地状态
  const [siteName, setSiteName] = useState("");
  const [regEnabled, setRegEnabled] = useState("true");
  const [emailLimit, setEmailLimit] = useState("100");
  const [loveDate, setLoveDate] = useState("");
  const [loveDateLabel, setLoveDateLabel] = useState("");
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [avatarA, setAvatarA] = useState("");
  const [avatarB, setAvatarB] = useState("");

  const [saving, setSaving] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string } | null>>({});

  // 数据加载后填充表单
  useEffect(() => {
    if (!map) return;
    if (map.site_name !== undefined) setSiteName(map.site_name);
    if (map.registration_enabled !== undefined) setRegEnabled(map.registration_enabled);
    if (map.email_daily_limit !== undefined) setEmailLimit(map.email_daily_limit);
    if (map.love_start_date !== undefined) setLoveDate(map.love_start_date);
    if (map.love_start_date_label !== undefined) setLoveDateLabel(map.love_start_date_label);
    if (map.person_a_name !== undefined) setPersonA(map.person_a_name);
    if (map.person_b_name !== undefined) setPersonB(map.person_b_name);
    if (map.avatar_a !== undefined) setAvatarA(map.avatar_a);
    if (map.avatar_b !== undefined) setAvatarB(map.avatar_b);
  }, [map]);

  function setMsg(section: string, msg: { ok: boolean; text: string } | null) {
    setMsgs(prev => ({ ...prev, [section]: msg }));
    if (msg) setTimeout(() => setMsgs(prev => ({ ...prev, [section]: null })), 3000);
  }

  async function saveSection(section: string, pairs: [string, string][]) {
    setSaving(section);
    let lastResult = { ok: true, msg: "已保存" };
    for (const [key, value] of pairs) {
      const r = await saveSetting(key, value);
      if (!r.ok) { lastResult = r; break; }
    }
    setSaving(null);
    setMsg(section, { ok: lastResult.ok, text: lastResult.msg });
    if (lastResult.ok) reload();
  }

  return (
    <AdminLayout title="系统设置">
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={22} className="admin-upload-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── 站点基本信息 ── */}
          <div className="admin-panel" style={{ padding: "20px 20px 12px" }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 16 }}>
              <Settings size={15} strokeWidth={1.8} />
              站点基本信息
            </h2>
            <SettingField
              label="站点名称"
              description="显示在邮件主题、邮件正文等处"
              value={siteName}
              onChange={setSiteName}
              placeholder="Our Story"
            />
            <SaveBar
              saving={saving === "site"}
              msg={msgs.site ?? null}
              onSave={() => saveSection("site", [["site_name", siteName]])}
            />
          </div>

          {/* ── 情侣信息 ── */}
          <div className="admin-panel" style={{ padding: "20px 20px 12px" }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 16 }}>
              <Heart size={15} strokeWidth={1.8} />
              情侣信息
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <SettingField label="左侧人物名称" value={personA} onChange={setPersonA} placeholder="阳阳" />
              <SettingField label="右侧人物名称" value={personB} onChange={setPersonB} placeholder="湘湘" />
            </div>
            <SettingField
              label="在一起日期（用于计时器）"
              description="精确到分钟，格式：YYYY-MM-DDTHH:mm:ss"
              type="datetime-local"
              value={loveDate.slice(0, 16)}
              onChange={v => setLoveDate(v + ":00")}
            />
            <SettingField
              label="在一起日期显示文字"
              description="首页展示的文字，如「2026年3月8日」"
              value={loveDateLabel}
              onChange={setLoveDateLabel}
              placeholder="2026年3月8日"
            />
            <SaveBar
              saving={saving === "couple"}
              msg={msgs.couple ?? null}
              onSave={() => saveSection("couple", [
                ["person_a_name", personA],
                ["person_b_name", personB],
                ["love_start_date", loveDate],
                ["love_start_date_label", loveDateLabel],
              ])}
            />
          </div>

          {/* ── 头像 ── */}
          <div className="admin-panel" style={{ padding: "20px 20px 12px" }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 16 }}>
              <Image size={15} strokeWidth={1.8} />
              头像设置
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--muted-deep)", margin: "0 0 14px" }}>
              填写图片 URL，可先用上传功能上传图片后复制链接填入。
            </p>
            <SettingField
              label="左侧头像 URL"
              type="url"
              value={avatarA}
              onChange={setAvatarA}
              placeholder="https://..."
              extra={avatarA ? (
                <img src={avatarA} alt="左侧头像预览" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginTop: 8, border: "2px solid var(--border-soft)" }} />
              ) : null}
            />
            <SettingField
              label="右侧头像 URL"
              type="url"
              value={avatarB}
              onChange={setAvatarB}
              placeholder="https://..."
              extra={avatarB ? (
                <img src={avatarB} alt="右侧头像预览" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginTop: 8, border: "2px solid var(--border-soft)" }} />
              ) : null}
            />
            <SaveBar
              saving={saving === "avatar"}
              msg={msgs.avatar ?? null}
              onSave={() => saveSection("avatar", [
                ["avatar_a", avatarA],
                ["avatar_b", avatarB],
              ])}
            />
          </div>

          {/* ── 注册设置 ── */}
          <div className="admin-panel" style={{ padding: "20px 20px 12px" }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 16 }}>
              <Users size={15} strokeWidth={1.8} />
              注册设置
            </h2>
            <div className="admin-form-row" style={{ marginBottom: 16 }}>
              <label className="admin-form-label">开放注册</label>
              <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 10px" }}>
                关闭后，新用户将无法发送注册验证码或完成注册流程。
              </p>
              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="radio" name="reg" value="true" checked={regEnabled === "true"}
                    onChange={() => setRegEnabled("true")}
                    style={{ accentColor: "#c0446a", width: 16, height: 16 }}
                  />
                  <span>✅ 开启注册</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="radio" name="reg" value="false" checked={regEnabled === "false"}
                    onChange={() => setRegEnabled("false")}
                    style={{ accentColor: "#c0446a", width: 16, height: 16 }}
                  />
                  <span>🔒 关闭注册</span>
                </label>
              </div>
            </div>
            <SaveBar
              saving={saving === "reg"}
              msg={msgs.reg ?? null}
              onSave={() => saveSection("reg", [["registration_enabled", regEnabled]])}
            />
          </div>

          {/* ── 邮件限流 ── */}
          <div className="admin-panel" style={{ padding: "20px 20px 12px" }}>
            <h2 className="admin-panel-title" style={{ marginBottom: 16 }}>
              <Mail size={15} strokeWidth={1.8} />
              邮件每日限流
            </h2>
            <div className="admin-form-row" style={{ marginBottom: 16 }}>
              <label className="admin-form-label">每日最大发送量（封/天）</label>
              <p style={{ fontSize: 11.5, color: "var(--muted-deep)", margin: "0 0 8px", lineHeight: 1.7 }}>
                双维度限流：同一<strong>邮件账号</strong>每日发送上限（防封号），以及同一<strong>收件邮箱</strong>每日接收上限（防刷）。<br />
                填 <code style={{ background: "rgba(212,92,128,0.1)", padding: "1px 5px", borderRadius: 4 }}>0</code> 表示不限制。
              </p>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={emailLimit}
                onChange={e => setEmailLimit(e.target.value)}
                placeholder="100"
                style={{ width: 160 }}
              />
            </div>
            <SaveBar
              saving={saving === "email"}
              msg={msgs.email ?? null}
              onSave={() => saveSection("email", [["email_daily_limit", emailLimit]])}
            />
          </div>

        </div>
      )}
    </AdminLayout>
  );
}

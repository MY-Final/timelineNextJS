"use client";

import { Search, X } from "lucide-react";

export interface PostFilters {
  q: string;
  status: string;       // '' | 'published' | 'draft'
  is_public: string;    // '' | 'true' | 'false'
  created_from: string;
  created_to: string;
  event_from: string;
  event_to: string;
}

export const EMPTY_FILTERS: PostFilters = {
  q: "", status: "", is_public: "", created_from: "", created_to: "", event_from: "", event_to: "",
};

function isDirty(f: PostFilters) {
  return Object.values(f).some((v) => v !== "");
}

interface Props {
  filters: PostFilters;
  onChange: (next: PostFilters) => void;
}

export default function PostFilterBar({ filters, onChange }: Props) {
  function set(key: keyof PostFilters, val: string) {
    onChange({ ...filters, [key]: val });
  }

  function reset() {
    onChange({ ...EMPTY_FILTERS });
  }

  const dirty = isDirty(filters);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
      {/* 关键词搜索 */}
      <div style={{ position: "relative", flex: "1 1 180px", minWidth: 140 }}>
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#c0a0b0", pointerEvents: "none" }} />
        <input
          className="admin-form-input"
          style={{ paddingLeft: 28, margin: 0 }}
          type="text"
          placeholder="搜索标题 / 作者..."
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>

      {/* 状态 */}
      <select className="admin-filter-select" value={filters.status} onChange={(e) => set("status", e.target.value)}>
        <option value="">全部状态</option>
        <option value="published">已发布</option>
        <option value="draft">草稿</option>
      </select>

      {/* 可见性 */}
      <select className="admin-filter-select" value={filters.is_public} onChange={(e) => set("is_public", e.target.value)}>
        <option value="">全部可见性</option>
        <option value="true">公开</option>
        <option value="false">隐藏</option>
      </select>

      {/* 创建时间范围 */}
      <input className="admin-filter-date" type="date" title="创建时间从" value={filters.created_from} onChange={(e) => set("created_from", e.target.value)} />
      <span style={{ color: "#c0a0b0", fontSize: 12 }}>—</span>
      <input className="admin-filter-date" type="date" title="创建时间至" value={filters.created_to} onChange={(e) => set("created_to", e.target.value)} />

      {/* 实际日期范围 */}
      <input className="admin-filter-date" type="date" title="实际日期从" value={filters.event_from} onChange={(e) => set("event_from", e.target.value)} placeholder="实际日期从" />
      <span style={{ color: "#c0a0b0", fontSize: 12 }}>—</span>
      <input className="admin-filter-date" type="date" title="实际日期至" value={filters.event_to} onChange={(e) => set("event_to", e.target.value)} />

      {/* 重置 */}
      {dirty && (
        <button className="admin-action-btn" onClick={reset} title="清除筛选条件" style={{ flexShrink: 0 }}>
          <X size={13} strokeWidth={2} />
          <span style={{ marginLeft: 4, fontSize: 12 }}>重置</span>
        </button>
      )}
    </div>
  );
}

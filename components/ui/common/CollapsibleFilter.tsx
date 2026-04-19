"use client";

import { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: React.ReactNode;
  activeCount?: number; // number of active filters to show badge
}

export default function CollapsibleFilter({ children, activeCount = 0 }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="admin-filter-toggle"
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <Filter size={13} strokeWidth={1.8} />
        {open ? "收起筛选" : "展开筛选"}
        {activeCount > 0 && <span className="badge">{activeCount}</span>}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      <div className={`admin-filter-collapsible${open ? " open" : ""}`}>
        {children}
      </div>
    </>
  );
}

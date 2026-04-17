"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Edit3, Loader2 } from "lucide-react";

interface Props {
  postId: number;
  onClose: () => void;
  onSaved: () => void;
}

interface PostData {
  title: string;
  content: string;
  status: "published" | "draft";
  is_public: boolean;
}

export default function EditPostModal({ postId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PostData>({ title: "", content: "", status: "published", is_public: true });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // 加载现有数据
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetch(`/api/posts/${postId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.code === 0) {
          const d = json.data;
          setForm({
            title: d.title ?? "",
            content: d.content ?? "",
            status: d.status === "draft" ? "draft" : "published",
            is_public: d.is_public !== false,
          });
        } else {
          setLoadError(json.message || "加载失败");
        }
      })
      .catch(() => { if (!cancelled) setLoadError("网络异常"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  // ESC 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [submitting, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          status: form.status,
          is_public: form.is_public,
        }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setSubmitError(json.message || "保存失败");
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch {
      setSubmitError("网络异常，请稍后重试");
      setSubmitting(false);
    }
  }

  return createPortal(
    <>
      <div className="npost-backdrop" onClick={() => !submitting && onClose()} />
      <div className="npost-panel" role="dialog" aria-modal="true" aria-label="编辑帖子">
        <form onSubmit={handleSubmit}>
          <div className="npost-header">
            <span className="npost-header-title">
              <Edit3 size={14} strokeWidth={1.8} style={{ marginRight: 6 }} />
              编辑帖子 #{postId}
            </span>
            <button type="button" className="pmodal-close" onClick={onClose} disabled={submitting} aria-label="关闭">
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className="npost-body">
            {loading ? (
              <div className="pmodal-loading">
                <Loader2 size={20} className="admin-upload-spin" />
                <span>加载中…</span>
              </div>
            ) : loadError ? (
              <p className="pmodal-error">{loadError}</p>
            ) : (
              <>
                <div className="admin-form-field">
                  <label className="admin-form-label" htmlFor="epost-title">标题</label>
                  <input
                    id="epost-title"
                    className="admin-form-input"
                    type="text"
                    placeholder="输入帖子标题..."
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label" htmlFor="epost-content">内容</label>
                  <textarea
                    id="epost-content"
                    className="admin-form-textarea"
                    placeholder="输入帖子内容..."
                    rows={5}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">发布状态</label>
                  <div className="admin-form-radio-group">
                    <label className="admin-form-radio">
                      <input type="radio" name="epost-status" value="published" checked={form.status === "published"} onChange={() => setForm((f) => ({ ...f, status: "published" }))} disabled={submitting} />
                      <span>已发布</span>
                    </label>
                    <label className="admin-form-radio">
                      <input type="radio" name="epost-status" value="draft" checked={form.status === "draft"} onChange={() => setForm((f) => ({ ...f, status: "draft" }))} disabled={submitting} />
                      <span>草稿</span>
                    </label>
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">可见性</label>
                  <div className="admin-form-radio-group">
                    <label className="admin-form-radio">
                      <input type="radio" name="epost-public" value="public" checked={form.is_public} onChange={() => setForm((f) => ({ ...f, is_public: true }))} disabled={submitting} />
                      <span>公开</span>
                    </label>
                    <label className="admin-form-radio">
                      <input type="radio" name="epost-public" value="hidden" checked={!form.is_public} onChange={() => setForm((f) => ({ ...f, is_public: false }))} disabled={submitting} />
                      <span>隐藏</span>
                    </label>
                  </div>
                </div>

                {submitError && (
                  <p style={{ color: "#d44040", fontSize: 13, margin: "0 0 12px" }}>{submitError}</p>
                )}
              </>
            )}
          </div>

          {!loading && !loadError && (
            <div className="npost-footer">
              <button type="button" className="admin-action-btn" onClick={onClose} disabled={submitting}>
                取消
              </button>
              <button type="submit" className="admin-action-btn admin-action-btn--primary" disabled={submitting}>
                {submitting && <Loader2 size={13} className="admin-upload-spin" style={{ marginRight: 5 }} />}
                保存修改
              </button>
            </div>
          )}
        </form>
      </div>
    </>,
    document.body
  );
}

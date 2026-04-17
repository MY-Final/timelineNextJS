"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Image as ImageIcon, Plus, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/common/ConfirmDialog";

const MAX_IMAGES = 10;

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  url?: string;
  storageKey?: string;
  uploading: boolean;
  error?: string;
}

export interface Props {
  onClose: () => void;
  onSuccess: () => void; // 发布成功后刷新列表
}

export default function AdminNewPostModal({ onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [inputKey, setInputKey] = useState(0); // 用于重置 input 元素
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ESC 关闭（如果没有在提交中）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) handleRequestClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, title, content, files.length]);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  function handleRequestClose() {
    const dirty = title.trim() || content.trim() || files.length > 0;
    if (dirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setFiles((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) return prev;
      const items = Array.from(newFiles)
        .slice(0, remaining)
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          uploading: false,
        }));
      return [...prev, ...items];
    });
    // 重置 input key 使下次点击能触发
    setInputKey((k) => k + 1);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
    setInputKey((k) => k + 1);
  }

  async function uploadFile(item: UploadedFile): Promise<{ url: string; storageKey: string } | null> {
    const formData = new FormData();
    formData.append("file", item.file);
    try {
      const res = await fetch("/api/upload/direct", { method: "POST", body: formData });
      const json = await res.json();
      if (json.code === 0) return { url: json.data.url, storageKey: json.data.key };
      return null;
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitError("");
    setSubmitting(true);

    setFiles((prev) => prev.map((f) => ({ ...f, uploading: true, error: undefined })));

    const uploadResults = await Promise.all(
      files.map(async (f) => {
        const result = await uploadFile(f);
        return { id: f.id, file: f.file, result };
      })
    );

    setFiles((prev) =>
      prev.map((f) => {
        const r = uploadResults.find((x) => x.id === f.id);
        return { ...f, uploading: false, url: r?.result?.url, storageKey: r?.result?.storageKey, error: r?.result ? undefined : "上传失败" };
      })
    );

    const failed = uploadResults.filter((r) => !r.result);
    if (failed.length > 0) {
      setSubmitError(`${failed.length} 张图片上传失败，请移除后重试`);
      setSubmitting(false);
      return;
    }

    const images = uploadResults.map((r, i) => ({
      url: r.result!.url,
      storage_key: r.result!.storageKey,
      original_name: r.file.name,
      mime_type: r.file.type,
      file_size: r.file.size,
      sort_order: i,
    }));

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), status, images }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setSubmitError(json.message || "发布失败");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("网络异常，请稍后重试");
      setSubmitting(false);
    }
  }

  const isFull = files.length >= MAX_IMAGES;

  return createPortal(
    <>
      {/* Frosted backdrop — click to request close */}
      <div className="npost-backdrop" onClick={handleRequestClose} />

      {/* Modal panel */}
      <div className="npost-panel" role="dialog" aria-modal="true" aria-label="新建帖子">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="npost-header">
            <span className="npost-header-title">
              <Plus size={14} strokeWidth={2} style={{ marginRight: 6 }} />
              新建帖子
            </span>
            <button type="button" className="pmodal-close" onClick={handleRequestClose} aria-label="关闭">
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>

          {/* Body */}
          <div className="npost-body">
            {/* 标题 */}
            <div className="admin-form-field">
              <label className="admin-form-label" htmlFor="npost-title">标题</label>
              <input
                id="npost-title"
                className="admin-form-input"
                type="text"
                placeholder="输入帖子标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* 内容 */}
            <div className="admin-form-field">
              <label className="admin-form-label" htmlFor="npost-content">内容</label>
              <textarea
                id="npost-content"
                className="admin-form-textarea"
                placeholder="输入帖子内容..."
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* 发布状态 */}
            <div className="admin-form-field">
              <label className="admin-form-label">发布状态</label>
              <div className="admin-form-radio-group">
                <label className="admin-form-radio">
                  <input type="radio" name="npost-status" value="published" checked={status === "published"} onChange={() => setStatus("published")} disabled={submitting} />
                  <span>立即发布</span>
                </label>
                <label className="admin-form-radio">
                  <input type="radio" name="npost-status" value="draft" checked={status === "draft"} onChange={() => setStatus("draft")} disabled={submitting} />
                  <span>保存为草稿</span>
                </label>
              </div>
            </div>

            {/* 图片上传 */}
            <div className="admin-form-field">
              <label className="admin-form-label">
                图片 / 媒体
                <span style={{ fontWeight: 400, marginLeft: 8, color: isFull ? "#d44040" : undefined }}>
                  {files.length} / {MAX_IMAGES}
                </span>
              </label>

              {/* 拖拽区 */}
              {!isFull && (
                <div
                  className={`admin-upload-zone${dragOver ? " admin-upload-zone--active" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} strokeWidth={1.5} className="admin-upload-icon" />
                  <p className="admin-upload-text">拖拽文件到这里，或点击选择</p>
                  <p className="admin-upload-hint">支持 JPG / PNG / GIF / WebP / MP4，最大 50MB，最多 {MAX_IMAGES} 张</p>
                  <input
                    key={inputKey}
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
                  />
                </div>
              )}

              {/* 图片预览网格 */}
              {files.length > 0 && (
                <div className="npost-thumb-grid">
                  {files.map((f) => (
                    <div key={f.id} className="npost-thumb-item">
                      {f.file.type.startsWith("image/") ? (
                        <img src={f.preview} alt={f.file.name} className="npost-thumb-img" />
                      ) : (
                        <div className="npost-thumb-placeholder">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      {f.uploading && (
                        <div className="npost-thumb-overlay">
                          <Loader2 size={16} className="admin-upload-spin" />
                        </div>
                      )}
                      {f.error && (
                        <div className="npost-thumb-overlay npost-thumb-overlay--error">!</div>
                      )}
                      <button
                        type="button"
                        className="npost-thumb-remove"
                        onClick={() => removeFile(f.id)}
                        disabled={submitting}
                        aria-label="移除图片"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  {/* 还能添加 → 加号格 */}
                  {!isFull && (
                    <button
                      type="button"
                      className="npost-thumb-add"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      aria-label="添加图片"
                    >
                      <Plus size={18} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {submitError && (
              <p style={{ color: "#d44040", fontSize: 13, margin: "0 0 12px" }}>{submitError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="npost-footer">
            <button type="button" className="admin-action-btn" onClick={handleRequestClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="admin-action-btn admin-action-btn--primary" disabled={submitting}>
              {submitting && <Loader2 size={13} className="admin-upload-spin" style={{ marginRight: 5 }} />}
              {status === "draft" ? "保存草稿" : "发布帖子"}
            </button>
          </div>
        </form>
      </div>

      {showCloseConfirm && (
        <ConfirmDialog
          title="放弃编辑"
          message="内容尚未保存，确认退出新建？"
          confirmText="放弃"
          danger
          onConfirm={() => { setShowCloseConfirm(false); onClose(); }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </>,
    document.body
  );
}


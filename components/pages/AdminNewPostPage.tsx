"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/pages/AdminLayout";
import { Upload, X, Image as ImageIcon, Plus, Loader2 } from "lucide-react";
import "@/styles/Admin.css";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  error?: string;
}

export default function AdminNewPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const MAX_IMAGES = 10;

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
  }

  async function uploadFile(item: UploadedFile): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", item.file);
    try {
      const res = await fetch("/api/upload/direct", { method: "POST", body: formData });
      const json = await res.json();
      if (json.code === 0) return json.data.url;
      return null;
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    // Upload all files
    setFiles((prev) => prev.map((f) => ({ ...f, uploading: true })));

    const results = await Promise.all(
      files.map(async (f) => {
        const url = await uploadFile(f);
        return { id: f.id, url };
      })
    );

    setFiles((prev) =>
      prev.map((f) => {
        const r = results.find((x) => x.id === f.id);
        return { ...f, uploading: false, url: r?.url ?? undefined, error: r?.url ? undefined : "上传失败" };
      })
    );

    const failedCount = results.filter((r) => !r.url).length;
    if (failedCount > 0) return; // 有失败的不提交

    // TODO: 提交帖子到后端 API
    const uploadedUrls = results.map((r) => r.url).filter(Boolean);
    console.log("Post data:", { title, content, images: uploadedUrls });
    alert("所有图片上传成功！帖子功能待接入后端。");
    router.push("/admin/posts");
  }

  return (
    <AdminLayout title="新建帖子">
      <form className="admin-panel" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        <h2 className="admin-panel-title">
          <Plus size={15} strokeWidth={1.8} />
          新建帖子
        </h2>

        {/* 标题 */}
        <div className="admin-form-field">
          <label className="admin-form-label" htmlFor="post-title">标题</label>
          <input
            id="post-title"
            className="admin-form-input"
            type="text"
            placeholder="输入帖子标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 内容 */}
        <div className="admin-form-field">
          <label className="admin-form-label" htmlFor="post-content">内容</label>
          <textarea
            id="post-content"
            className="admin-form-textarea"
            placeholder="输入帖子内容..."
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* 图片上传区 */}
        <div className="admin-form-field">
          <label className="admin-form-label">
            图片 / 媒体
            <span style={{ fontWeight: 400, marginLeft: 8, color: files.length >= MAX_IMAGES ? "#d44040" : undefined }}>
              {files.length} / {MAX_IMAGES}
            </span>
          </label>
          <div
            className={`admin-upload-zone${dragOver ? " admin-upload-zone--active" : ""}${files.length >= MAX_IMAGES ? " admin-upload-zone--disabled" : ""}`}
            style={files.length >= MAX_IMAGES ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} strokeWidth={1.5} className="admin-upload-icon" />
            <p className="admin-upload-text">拖拽文件到这里，或点击选择</p>
            <p className="admin-upload-hint">支持 JPG / PNG / GIF / WebP / MP4，最大 50MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {/* 预览列表 */}
          {files.length > 0 && (
            <div className="admin-upload-previews">
              {files.map((f) => (
                <div key={f.id} className="admin-upload-preview">
                  {f.file.type.startsWith("image/") ? (
                    <img src={f.preview} alt={f.file.name} className="admin-upload-thumb" />
                  ) : (
                    <div className="admin-upload-thumb admin-upload-thumb--file">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <span className="admin-upload-name">{f.file.name}</span>
                  {f.uploading && <Loader2 size={14} className="admin-upload-spin" />}
                  {f.error && <span className="admin-upload-error">{f.error}</span>}
                  {f.url && <span className="admin-upload-ok">✓</span>}
                  <button type="button" className="admin-upload-remove" onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提交 */}
        <div className="admin-form-actions">
          <button type="button" className="admin-action-btn" onClick={() => router.push("/admin/posts")}>取消</button>
          <button type="submit" className="admin-action-btn admin-action-btn--primary">
            发布帖子
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface PostEditorProps {
  initial?: {
    date: string;
    title: string;
    description: string;
    location: string;
    tags: string[];
    images: string[];
  };
  onSave: (data: {
    date: string;
    title: string;
    description: string;
    location: string;
    tags: string[];
    images: string[];
  }) => void;
  onCancel: () => void;
}

export default function PostEditor({ initial, onSave, onCancel }: PostEditorProps) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        setImages((prev) => [...prev, url]);
      } else {
        const { error: e } = await res.json() as { error: string };
        setError(e ?? "上传失败");
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ date, title, description, location, tags, images });
  }

  return (
    <div className="post-editor-shell">
      <form className="post-editor-form" onSubmit={handleSubmit}>
        <h2 className="font-serif-cn">{initial ? "编辑帖子" : "新建帖子"}</h2>

        <div className="post-editor-row">
          <label>日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="post-editor-row">
          <label>标题</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="帖子标题" />
        </div>

        <div className="post-editor-row">
          <label>地点</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：杭州" />
        </div>

        <div className="post-editor-row">
          <label>标签（逗号分隔）</label>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="西湖, 春天" />
        </div>

        <div className="post-editor-row post-editor-md">
          <label>内容（Markdown）</label>
          <MDEditor value={description} onChange={(v) => setDescription(v ?? "")} height={300} />
        </div>

        <div className="post-editor-row">
          <label>图片</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} />
          {uploading && <span className="admin-uploading">上传中…</span>}
          {error && <span className="admin-error">{error}</span>}
          <div className="post-editor-images">
            {images.map((url, i) => (
              <div key={url} className="post-editor-image-item">
                <img src={url} alt={`图片 ${i + 1}`} />
                <button type="button" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="post-editor-actions">
          <button type="submit" className="admin-btn admin-btn-primary">保存</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>取消</button>
        </div>
      </form>
    </div>
  );
}

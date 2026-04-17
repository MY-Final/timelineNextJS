"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Heart, MessageSquare, Eye, EyeOff, Image as ImageIcon, Edit3 } from "lucide-react";
import { ImageLightbox } from "@/components/ui/common/ImageLightbox";
import dynamic from "next/dynamic";

const EditPostModal = dynamic(() => import("@/components/ui/common/EditPostModal"), { ssr: false });

interface PostImage {
  id: number;
  url: string;
  original_name: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  sort_order: number;
}

interface PostDetail {
  id: number;
  title: string;
  content: string;
  tags: string[];
  is_public: boolean;
  status: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_username: string;
  author_nickname: string;
  images: PostImage[];
}

export interface Props {
  postId: number;
  onClose: () => void;
  /** 编辑保存后通知父级刷新列表 */
  onUpdated?: () => void;
}

export default function PostDetailModal({ postId, onClose, onUpdated }: Props) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/posts/${postId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setPost(json.data);
        else setError(json.message || "加载失败");
      })
      .catch(() => setError("网络异常"))
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxIndex === null && !showEdit) onClose();
    },
    [onClose, lightboxIndex, showEdit]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const imageUrls = post?.images.map((img) => img.url) ?? [];

  // 确保图片 URL 带协议（兼容老数据）
  function ensureHttps(url: string): string {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  }

  return createPortal(
    <>
      {/* When edit is open, hide the detail modal completely — only show edit modal */}
      {!showEdit && (
        <>
          {/* Backdrop */}
          <div className="pmodal-backdrop" onClick={onClose} />

          {/* Panel */}
          <div className="pmodal-panel" role="dialog" aria-modal="true">
            {/* Header */}
            <div className="pmodal-header">
              <span className="pmodal-header-title">帖子详情</span>
              <div style={{ display: "flex", gap: 6 }}>
                {post && (
                  <button className="pmodal-edit" onClick={() => setShowEdit(true)} aria-label="编辑" title="编辑帖子">
                    <Edit3 size={15} strokeWidth={1.8} />
                  </button>
                )}
                <button className="pmodal-close" onClick={onClose} aria-label="关闭">
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>
            </div>

        {/* Body */}
        <div className="pmodal-body">
          {loading ? (
            <div className="pmodal-loading">
              <Loader2 size={20} className="admin-upload-spin" />
              <span>加载中…</span>
            </div>
          ) : error ? (
            <p className="pmodal-error">{error}</p>
           ) : post ? (
             <>
               {/* Title */}
               {post.title && <h2 className="pmodal-title">{post.title}</h2>}

               {/* Status + visibility + tags */}
               <div className="pmodal-meta-bar">
                 <span className={`pmodal-status-badge pmodal-status-badge--${post.status}`}>
                   {post.status === "published" ? "已发布" : "草稿"}
                 </span>
                 <span className={`pmodal-visibility-badge ${post.is_public ? "pmodal-visibility-badge--public" : "pmodal-visibility-badge--private"}`}>
                   {post.is_public ? <><Eye size={10} style={{ marginRight: 3 }} />公开</> : <><EyeOff size={10} style={{ marginRight: 3 }} />仅自己</>}
                 </span>
                 {post.tags?.map((t) => <span key={t} className="pmodal-tag">#{t}</span>)}
               </div>

               {/* Divider */}
               <div className="pmodal-divider" />

               {/* Content */}
               <div className="pmodal-content-section">
                 <div className="pmodal-content-label">正文内容</div>
                 <div className="pmodal-content">
                   {post.content || <span className="pmodal-empty">（无内容）</span>}
                 </div>
               </div>

               {/* Images */}
               {post.images.length > 0 && (
                 <div className="pmodal-images-section">
                   <div className="pmodal-images-header">
                     <ImageIcon size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                     <span>图片 {post.images.length} 张</span>
                   </div>
                   <div className="pmodal-thumb-grid">
                     {post.images.map((img, i) => (
                       <button
                         key={img.id}
                         className="pmodal-thumb-btn"
                         onClick={() => setLightboxIndex(i)}
                         aria-label={`预览第 ${i + 1} 张图片`}
                       >
                         {img.mime_type?.startsWith("image/") !== false ? (
                           <img
                             src={ensureHttps(img.url)}
                             alt={img.original_name}
                             className="pmodal-thumb-img"
                             loading="lazy"
                           />
                         ) : (
                           <div className="pmodal-thumb-video">
                             <ImageIcon size={18} />
                           </div>
                         )}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* Footer: stats right-aligned */}
               <div className="pmodal-footer-stats">
                 <div className="pmodal-stat-item">
                   <Heart size={13} strokeWidth={1.8} />
                   <span>{post.like_count}</span>
                 </div>
                 <div className="pmodal-stat-item">
                   <MessageSquare size={13} strokeWidth={1.8} />
                   <span>{post.comment_count}</span>
                 </div>
               </div>
             </>
           ) : null}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={imageUrls.map(ensureHttps)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i! - 1 + imageUrls.length) % imageUrls.length)}
          onNext={() => setLightboxIndex((i) => (i! + 1) % imageUrls.length)}
          onJump={setLightboxIndex}
        />
      )}
        </>
      )}

      {/* Edit modal — replaces the detail modal entirely when open */}
      {showEdit && (
        <EditPostModal
          postId={postId}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchDetail();
            onUpdated?.();
          }}
        />
      )}
    </>,
    document.body
  );
}
